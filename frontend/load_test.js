import axios from 'axios';

async function sendLog(i) {
    const levels = ["ERROR", "WARN", "INFO"];
    const services = ["payment-service", "auth-service", "inventory-service", "checkout-service"];
    
    let level, service, message;
    
    if (i % 20 === 0) {
        level = "ERROR";
        service = "payment-service";
        message = `Connection timeout to payment gateway: attempt ${i}`;
    } else {
        level = levels[Math.floor(Math.random() * levels.length)];
        service = services[Math.floor(Math.random() * services.length)];
        message = `Routine system event processed for ${service}`;
    }

    try {
        await axios.post("http://localhost:8080/api/v1/logs/ingest", {
            serviceName: service,
            level: level,
            message: message,
            timestamp: Date.now()
        });
    } catch (e) {
        if (e.response) {
            console.log(`Failed: ${e.response.status} - ${JSON.stringify(e.response.data)}`);
        } else {
            console.log(`Failed: ${e.message}`);
        }
    }
}

async function main() {
    const start = Date.now();
    console.log("Starting load test with 5000 logs...");
    
    // Batch in chunks of 500 to avoid overloading the Node event loop and socket limits
    for (let chunk = 0; chunk < 10; chunk++) {
        const promises = [];
        for (let i = 0; i < 500; i++) {
            promises.push(sendLog(chunk * 500 + i));
        }
        await Promise.all(promises);
        console.log(`Sent chunk ${chunk + 1}/10`);
    }
    
    const elapsed = (Date.now() - start) / 1000;
    console.log(`Sent 5000 logs in ${elapsed.toFixed(2)}s -> ${(5000/elapsed).toFixed(0)} logs/sec`);
}

main();
