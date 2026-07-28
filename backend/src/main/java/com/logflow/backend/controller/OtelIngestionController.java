package com.logflow.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.logflow.backend.dto.LogEntryRequest;
import com.logflow.backend.service.KafkaProducerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/v1/logs")
@RequiredArgsConstructor
@Slf4j
public class OtelIngestionController {

    private final KafkaProducerService kafkaProducer;

    @PostMapping
    public ResponseEntity<Void> ingestOtlp(@RequestBody JsonNode payload) {
        try {
            List<LogEntryRequest> entries = parseOtlpPayload(payload);
            for (LogEntryRequest request : entries) {
                String topic = "logs." + (request.getLevel() != null ? request.getLevel().toLowerCase() : "info");
                kafkaProducer.sendLogEvent(topic, request.getServiceName(), request);
            }
            return ResponseEntity.accepted().build();
        } catch (Exception e) {
            log.error("Failed to parse OTLP payload", e);
            return ResponseEntity.badRequest().build();
        }
    }

    private List<LogEntryRequest> parseOtlpPayload(JsonNode payload) {
        List<LogEntryRequest> entries = new ArrayList<>();
        JsonNode resourceLogs = payload.path("resourceLogs");
        
        if (resourceLogs.isArray()) {
            for (JsonNode resourceLog : resourceLogs) {
                String serviceName = extractServiceName(resourceLog);
                
                JsonNode scopeLogs = resourceLog.path("scopeLogs");
                if (scopeLogs.isArray()) {
                    for (JsonNode scopeLog : scopeLogs) {
                        JsonNode logRecords = scopeLog.path("logRecords");
                        if (logRecords.isArray()) {
                            for (JsonNode logRecord : logRecords) {
                                LogEntryRequest entry = new LogEntryRequest();
                                entry.setServiceName(serviceName);
                                
                                String severity = logRecord.path("severityText").asText("INFO");
                                entry.setLevel(severity);
                                
                                JsonNode bodyNode = logRecord.path("body");
                                if (bodyNode.has("stringValue")) {
                                    entry.setMessage(bodyNode.path("stringValue").asText());
                                } else {
                                    entry.setMessage(bodyNode.toString());
                                }

                                String traceId = logRecord.path("traceId").asText(null);
                                entry.setTraceId(traceId);

                                String timeUnixNano = logRecord.path("timeUnixNano").asText(null);
                                if (timeUnixNano != null && !timeUnixNano.isEmpty()) {
                                    try {
                                        long millis = Long.parseLong(timeUnixNano) / 1_000_000;
                                        entry.setTimestamp(String.valueOf(millis));
                                    } catch (NumberFormatException e) {
                                        entry.setTimestamp(java.time.Instant.now().toString());
                                    }
                                } else {
                                    entry.setTimestamp(java.time.Instant.now().toString());
                                }

                                entries.add(entry);
                            }
                        }
                    }
                }
            }
        }
        return entries;
    }

    private String extractServiceName(JsonNode resourceLog) {
        JsonNode attributes = resourceLog.path("resource").path("attributes");
        if (attributes.isArray()) {
            for (JsonNode attr : attributes) {
                if ("service.name".equals(attr.path("key").asText())) {
                    return attr.path("value").path("stringValue").asText("unknown-service");
                }
            }
        }
        return "unknown-service";
    }
}
