package com.logflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

@Data
public class LogEntryRequest {
    @NotBlank(message = "serviceName is required")
    private String serviceName;
    @NotBlank(message = "level is required")
    private String level;
    @NotBlank(message = "message is required")
    private String message;
    private String traceId;
    private String environment;
    private Map<String, Object> metadata;
    private String timestamp;
    private int retryCount = 0; // used for DLQ retry mechanism
}
