package com.logflow.backend.consumer;

import com.logflow.backend.dto.LogEntryRequest;
import com.logflow.backend.model.LogEntry;
import com.logflow.backend.repository.LogRepository;
import com.logflow.backend.service.AlertEngine;
import com.logflow.backend.service.KafkaProducerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.apache.kafka.clients.consumer.ConsumerRecord;

import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class LogConsumer {

    private final LogRepository logRepository;
    private final AlertEngine alertEngine;
    private final KafkaProducerService kafkaProducerService;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

    @KafkaListener(
        topics = {"logs.error", "logs.warn", "logs.info"},
        groupId = "log-persister",
        containerFactory = "batchFactory"
    )
    public void consume(List<ConsumerRecord<String, LogEntryRequest>> records) {
        log.info("Received {} records from Kafka", records.size());
        try {
            List<LogEntry> entries = records.stream()
                .map(this::toEntity)
                .collect(Collectors.toList());
            logRepository.saveAll(entries);  // bulk insert
            log.info("Successfully saved {} entries to Mongo", entries.size());
            alertEngine.evaluate(entries);   // check alert rules
        } catch (Exception e) {
            log.error("Failed to persist logs, sending to DLQ. Error: {}", e.getMessage());
            // republish failed batch to DLQ with retry metadata
            records.forEach(r -> kafkaProducerService.sendLogEvent("logs.dlq", r.key(), r.value()));
        }
    }

    @KafkaListener(topics = "logs.dlq", groupId = "dlq-retry")
    public void retryFromDlq(ConsumerRecord<String, LogEntryRequest> record) {
        LogEntryRequest request = record.value();
        int retryCount = request.getRetryCount();
        if (retryCount < 3) {
            long delay = (long) Math.pow(2, retryCount); // seconds
            request.setRetryCount(retryCount + 1);
            String originalTopic = "logs." + (request.getLevel() != null ? request.getLevel().toLowerCase() : "info");
            
            scheduler.schedule(() -> {
                kafkaProducerService.sendLogEvent(originalTopic, record.key(), request);
                log.info("Retrying log event for service: {}, attempt: {}", request.getServiceName(), request.getRetryCount());
            }, delay, TimeUnit.SECONDS);
        } else {
            // Log permanent failure, alert ops team
            log.error("Permanent failure processing log for service: {}", request.getServiceName());
        }
    }

    private LogEntry toEntity(ConsumerRecord<String, LogEntryRequest> record) {
        LogEntryRequest req = record.value();
        return LogEntry.builder()
            .serviceName(req.getServiceName())
            .level(req.getLevel())
            .message(req.getMessage())
            .traceId(req.getTraceId())
            .environment(req.getEnvironment())
            .metadata(req.getMetadata())
            .timestamp(req.getTimestamp() != null ? parseTimestamp(req.getTimestamp()) : java.time.Instant.now())
            .build();
    }

    private java.time.Instant parseTimestamp(String ts) {
        try {
            return java.time.Instant.parse(ts);
        } catch (Exception e) {
            try {
                return java.time.Instant.ofEpochMilli(Long.parseLong(ts));
            } catch (Exception e2) {
                return java.time.Instant.now();
            }
        }
    }
}
