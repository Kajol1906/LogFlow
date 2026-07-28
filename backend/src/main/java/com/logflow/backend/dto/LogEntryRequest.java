package com.logflow.backend.dto;

import lombok.Data;

import java.util.Map;

@Data
public class LogEntryRequest {
    private String serviceName;
    private String level;
    private String message;
    private String traceId;
    private String environment;
    private Map<String, Object> metadata;
    private String timestamp;
    private int retryCount = 0; // used for DLQ retry mechanism
}
