package com.logflow.backend.service;

import com.logflow.backend.dto.AlertEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AlertBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    @KafkaListener(topics = "alerts.triggered", groupId = "alert-broadcaster")
    public void broadcast(AlertEvent alert) {
        // Push to WebSocket subscribers
        messagingTemplate.convertAndSend("/topic/alerts", alert);
        // Service-specific channel
        if (alert.getServiceName() != null) {
            messagingTemplate.convertAndSend("/topic/alerts/" + alert.getServiceName(), alert);
        }
        log.info("Broadcasted alert for {} to WebSockets", alert.getServiceName());
    }
}
