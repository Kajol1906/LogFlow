package com.logflow.backend.dto;

import lombok.Data;

@Data
public class AlertEvent {
    private String ruleName;
    private String serviceName;
    private String severity;
    private String message;
    private String aiHypothesis;
}
