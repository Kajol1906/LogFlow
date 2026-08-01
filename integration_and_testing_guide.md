# LogFlow: Complete Integration and Testing Guide

This document contains everything you need to know to test your LogFlow deployment and integrate other applications (like a student's Spring Boot or Node.js project) into your centralized logging platform.

---

## 1. How to Integrate Other Projects into LogFlow

LogFlow is designed to be a central hub. Any application can send logs to it. There are two primary ways to integrate a project into LogFlow:

### Method A: The Python Agent (Easiest)
This method is recommended because it requires **zero code changes** to the external application. The external app just writes logs to a text file, and the LogFlow Agent securely reads that file and ships the logs to your cloud server.

**Step 1: Configure the external app to write to a file**
If the external project is a Spring Boot app (like Brewly), add this to their `application.properties`:
```properties
logging.file.name=logs/app.log
```

**Step 2: Run the LogFlow Agent**
Copy the `logflow_agent.py` script to the external project's computer or server.
Open a terminal in the folder containing the script and the `logs/` directory, and run:
```powershell
# Point the agent to your Render cloud URL
$env:LOGFLOW_INGEST_URL="https://logflow-hav4.onrender.com/api/v1/logs/ingest/batch"

# Start the agent
python logflow_agent.py
```
The agent will now continuously monitor the `logs/app.log` file in the background and instantly stream any new logs directly to your Vercel dashboard.

### Method B: Direct HTTP Integration (Advanced)
If you don't want to run the Python script, any application can send logs directly over HTTP to your Render backend.

**Using Java / Spring Boot:**
You can configure a custom `Logback HTTP Appender` in your `logback-spring.xml` to automatically format logs as JSON and POST them to `https://logflow-hav4.onrender.com/api/v1/logs/ingest/batch`.

**Using Node.js / Express:**
You can write a simple middleware function to send logs asynchronously:
```javascript
import axios from 'axios';

async function sendToLogFlow(level, message) {
    const logEntry = [{
        serviceName: "brewly-backend",
        level: level,
        message: message,
        timestamp: Date.now().toString()
    }];
    
    try {
        await axios.post("https://logflow-hav4.onrender.com/api/v1/logs/ingest/batch", logEntry);
    } catch (e) {
        console.error("Failed to send log to LogFlow");
    }
}
```

---

## 2. Testing Your LogFlow Deployment

You can test your live cloud deployment directly from your computer without needing any external projects.

### Test 1: Generate logs using the Python Agent
Make sure your Python agent is running in your terminal:
```powershell
python logflow_agent.py
```

Open a **new** PowerShell tab and run the following command to inject a fake log into the watched file:
```powershell
Add-Content -Path "C:\CodeBase\Projects\log aggregation\LogFlow\agent\logs\auth-service.log" -Value "[INFO] User authenticated successfully"
```
**Result**: The Python agent terminal will say `Successfully shipped 1 logs` and the log will appear on your Vercel frontend.

### Test 2: Triggering the Groq AI Root Cause Analysis
LogFlow's Alert Engine is configured to trigger an AI analysis when it sees a spike in errors. You can simulate a major system crash to test the AI.

Run this command **5 times in a row** as fast as you can:
```powershell
Add-Content -Path "C:\CodeBase\Projects\log aggregation\LogFlow\agent\logs\auth-service.log" -Value "[ERROR] Connection refused to database cluster"
```
**Result**:
1. The 5 errors will stream to the frontend.
2. Within 5 seconds, the Alert Engine will detect the anomaly.
3. The AI will generate a Root Cause Analysis.
4. A red alert banner will instantly pop up on the Vercel dashboard explaining the database failure!

### Test 3: Direct API Injection via cURL
You can bypass the Python agent entirely and test your Render API using a standard HTTP request from your terminal:

```powershell
curl -X POST https://logflow-hav4.onrender.com/api/v1/logs/ingest/batch `
     -H "Content-Type: application/json" `
     -d '[{"serviceName":"payment-gateway","level":"ERROR","message":"Transaction timeout","timestamp":"1706789012345"}]'
```

---

## 3. Important System URLs and Endpoints

Keep these URLs handy for reference and integration:

* **Frontend Dashboard (Vercel)**: `https://log-flow-nine.vercel.app`
* **Backend API Base (Render)**: `https://logflow-hav4.onrender.com`
* **Health Check API**: `https://logflow-hav4.onrender.com/actuator/health`
* **Ingestion API**: `POST https://logflow-hav4.onrender.com/api/v1/logs/ingest/batch`
* **Search API**: `GET https://logflow-hav4.onrender.com/api/v1/logs/search?size=50`
* **WebSocket Endpoint**: `wss://logflow-hav4.onrender.com/ws`

## 4. Current Limitations & Future Improvements

For academic and demonstration purposes, the system is currently deployed with open access.
* **No Authentication**: Anyone with the Ingestion URL can send logs, and anyone with the Vercel URL can view them.
* **Storage Limits**: MongoDB Atlas free tier has a 512MB limit. Old logs are not automatically pruned.
* **Kafka Retention**: Aiven Kafka free tier retains topics for a limited time based on your configuration.

**To make this production-ready, you would:**
1. Add Spring Security (JWT tokens) to the ingestion endpoints.
2. Add a Login screen to the React frontend.
3. Implement a log-pruning cron job to delete logs older than 30 days from MongoDB.
