import time
import os
import re
import json
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
    """
    Very basic log parser. 
    Assumes standard format: [LEVEL] [TIMESTAMP] - MESSAGE or similar.
    Fallback to INFO if parsing fails.
    """
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
            print(f"Successfully shipped {len(to_send)} logs.")
        else:
            print(f"Failed to ship logs. Status: {response.status_code}")
    except Exception as e:
        print(f"Error shipping logs: {e}")
        # Could re-queue here if we wanted robust retry

def batch_worker():
    while True:
        time.sleep(FLUSH_INTERVAL)
        flush_batch()

class LogFileHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.is_directory or not event.src_path.endswith(".log"):
            return
            
        filepath = event.src_path
        
        # Initialize pointer if first time seeing this file
        if filepath not in file_pointers:
            try:
                # Seek to end so we only tail new lines
                size = os.path.getsize(filepath)
                file_pointers[filepath] = size
            except OSError:
                return

        try:
            with open(filepath, 'r') as f:
                f.seek(file_pointers[filepath])
                lines = f.readlines()
                file_pointers[filepath] = f.tell()
                
                if lines:
                    new_logs = [parse_log_line(l, filepath) for l in lines if l.strip()]
                    with queue_lock:
                        batch_queue.extend(new_logs)
                        if len(batch_queue) >= BATCH_SIZE:
                            # Trigger early flush in background
                            threading.Thread(target=flush_batch).start()
                            
        except Exception as e:
            print(f"Error reading file {filepath}: {e}")

if __name__ == "__main__":
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)
        
    print(f"Starting LogFlow Agent...")
    print(f"Tailing directory: {LOG_DIR}")
    print(f"Shipping to: {INGEST_URL}")
    
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
