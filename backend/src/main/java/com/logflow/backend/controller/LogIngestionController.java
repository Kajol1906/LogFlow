package com.logflow.backend.controller;

import com.logflow.backend.dto.LogEntryRequest;
import com.logflow.backend.service.KafkaProducerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/logs")
@RequiredArgsConstructor
public class LogIngestionController {

    private final KafkaProducerService kafkaProducer;

    @PostMapping("/ingest")
    public ResponseEntity<Void> ingest(@RequestBody LogEntryRequest request) {
        if (request.getTimestamp() == null) {
            request.setTimestamp(Instant.now().toString());
        }
        // Route to correct Kafka topic by severity
        String topic = "logs." + (request.getLevel() != null ? request.getLevel().toLowerCase() : "info");
        kafkaProducer.sendLogEvent(topic, request.getServiceName(), request);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/ingest/batch")
    public ResponseEntity<Void> ingestBatch(@RequestBody List<LogEntryRequest> batch) {
        for (LogEntryRequest request : batch) {
            if (request.getTimestamp() == null) {
                request.setTimestamp(java.time.Instant.now().toString());
            }
            String topic = "logs." + (request.getLevel() != null ? request.getLevel().toLowerCase() : "info");
            kafkaProducer.sendLogEvent(topic, request.getServiceName(), request);
        }
        return ResponseEntity.accepted().build();
    }
}
