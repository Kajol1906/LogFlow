package com.logflow.backend.service;

import com.logflow.backend.dto.AlertEvent;
import com.logflow.backend.dto.LogEntryRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class KafkaProducerService {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void sendLogEvent(String topic, String key, LogEntryRequest logEntry) {
        kafkaTemplate.send(topic, key, logEntry);
    }

    public void sendAlertEvent(String topic, String key, AlertEvent alertEvent) {
        kafkaTemplate.send(topic, key, alertEvent);
    }
}
