package com.logflow.backend.service;

import com.logflow.backend.dto.AlertEvent;
import com.logflow.backend.model.AlertRule;
import com.logflow.backend.model.LogEntry;
import com.logflow.backend.repository.AlertRuleRepository;
import com.logflow.backend.repository.LogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertEngine {

    private final AlertRuleRepository alertRuleRepository;
    private final LogRepository logRepository;
    private final KafkaProducerService kafkaProducerService;
    private final GroqAiService groqAiService;

    public void evaluate(List<LogEntry> batch) {
        List<AlertRule> rules = alertRuleRepository.findByActive(true);
        for (AlertRule rule : rules) {
            if (rule.getServiceName() == null) continue;
            
            Instant windowStart = Instant.now().minus(rule.getWindowMinutes(), ChronoUnit.MINUTES);
            long errorCount = logRepository.countByServiceNameAndLevelAndTimestampAfter(
                    rule.getServiceName(), "ERROR", windowStart);

            if (errorCount >= rule.getThreshold()) {
                
                // Trigger AI RCA
                List<String> recentErrors = batch.stream()
                        .filter(l -> rule.getServiceName().equals(l.getServiceName()) && "ERROR".equalsIgnoreCase(l.getLevel()))
                        .map(LogEntry::getMessage)
                        .filter(msg -> msg != null && !msg.isBlank())
                        .limit(10)
                        .collect(Collectors.toList());
                        
                String aiHypothesis = groqAiService.generateRootCauseHypothesis(recentErrors);
                
                AlertEvent event = new AlertEvent();
                event.setRuleName(rule.getRuleName());
                event.setServiceName(rule.getServiceName());
                event.setSeverity(rule.getSeverity());
                event.setMessage("Threshold breached: " + errorCount + " errors detected in the last " + rule.getWindowMinutes() + " minutes.");
                event.setAiHypothesis(aiHypothesis);

                kafkaProducerService.sendAlertEvent("alerts.triggered", rule.getServiceName(), event);
                log.info("Alert triggered for rule: {}, Service: {}, Hypothesis: {}", rule.getRuleName(), rule.getServiceName(), aiHypothesis);
            }
        }
    }
}
