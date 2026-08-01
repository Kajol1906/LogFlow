import time
import os
import requests
import threading
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Configuration
LOG_DIR = os.getenv("LOGFLOW_DIR", "./logs")
INGEST_URL = os.getenv("LOGFLOW_INGEST_URL", "http://localhost:8080/api/v1/logs/ingest/batch")
BATCH_SIZE = int(os.getenv("LOGFLOW_BATCH_SIZE", "50"))
FLUSH_INTERVAL = int(os.getenv("LOGFLOW_FLUSH_INTERVAL", "5"))

# State
file_pointers = {}
batch_queue = []
queue_lock = threading.Lock()

def parse_log_line(line, filename):
    level = "INFO"
    if "ERROR" in line.upper() or "Exception" in line:
        level = "ERROR"
    elif "WARN" in line.upper():
        level = "WARN"

    service_name = os.path.basename(filename).replace(".log", "")
    
    return {
        "serviceName": service_name,
        "level": level,
        "message": line.strip(),
        "timestamp": str(int(time.time() * 1000))
    }

def flush_batch():
    global batch_queue
    with queue_lock:
        if not batch_queue:
            return
        to_send = batch_queue[:]
        batch_queue = []
        
    try:
        response = requests.post(INGEST_URL, json=to_send, timeout=5)
        if response.status_code == 200 or response.status_code == 202:
            print(f"Successfully shipped {len(to_send)} logs.", flush=True)
        else:
            print(f"Failed to ship logs. Status: {response.status_code}", flush=True)
            # Re-queue on failure
            with queue_lock:
                batch_queue = to_send + batch_queue
    except Exception as e:
        print(f"Error shipping logs: {e}", flush=True)
        with queue_lock:
            batch_queue = to_send + batch_queue
                
def batch_worker():
    while True:
        time.sleep(FLUSH_INTERVAL)
        flush_batch()

class LogFileHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.is_directory or not event.src_path.endswith(".log"):
            return
            
        filepath = event.src_path
        
        try:
            size = os.path.getsize(filepath)
            
            # Handle new files or log rotation (file shrank)
            if filepath not in file_pointers or size < file_pointers[filepath]:
                file_pointers[filepath] = 0 if filepath in file_pointers else size
                
            with open(filepath, 'r') as f:
                f.seek(file_pointers[filepath])
                lines = f.readlines()
                file_pointers[filepath] = f.tell()
                
                if lines:
                    new_logs = [parse_log_line(l, filepath) for l in lines if l.strip()]
                    should_flush = False
                    with queue_lock:
                        batch_queue.extend(new_logs)
                        if len(batch_queue) >= BATCH_SIZE:
                            should_flush = True
                            
                    if should_flush:
                        threading.Thread(target=flush_batch).start()
                        
        except Exception as e:
            print(f"Error reading file {filepath}: {e}", flush=True)

if __name__ == "__main__":
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)
        
    print(f"Starting LogFlow Agent...", flush=True)
    print(f"Tailing directory: {LOG_DIR}", flush=True)
    print(f"Shipping to: {INGEST_URL}", flush=True)
    
    # Start background flusher
    flusher_thread = threading.Thread(target=batch_worker, daemon=True)
    flusher_thread.start()

    observer = Observer()
    observer.schedule(LogFileHandler(), LOG_DIR, recursive=False)
    observer.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        flush_batch()
    observer.join()
