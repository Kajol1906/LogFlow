package com.logflow.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "alert_rules")
@Data
public class AlertRule {
    @Id
    private String id;
    private String ruleName;
    private String serviceName;
    private String condition;      // e.g. ERROR_COUNT
    private int threshold;
    private int windowMinutes;
    private String severity;       // CRITICAL, HIGH, etc.
    private boolean active;
}
