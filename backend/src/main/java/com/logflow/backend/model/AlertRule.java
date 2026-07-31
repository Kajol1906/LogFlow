package com.logflow.backend.model;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "alert_rules")
@Data
public class AlertRule {
    @Id
    private String id;
    @NotBlank(message = "ruleName is required")
    private String ruleName;
    @NotBlank(message = "serviceName is required")
    private String serviceName;
    @NotBlank(message = "condition is required")
    private String condition;      // e.g. ERROR_COUNT
    @Min(value = 1, message = "threshold must be at least 1")
    private int threshold;
    @Min(value = 1, message = "windowMinutes must be at least 1")
    private int windowMinutes;
    @NotBlank(message = "severity is required")
    private String severity;       // CRITICAL, HIGH, etc.
    private boolean active;
}
