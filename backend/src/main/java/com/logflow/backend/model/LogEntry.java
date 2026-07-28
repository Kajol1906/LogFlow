package com.logflow.backend.model;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Document(collection = "logs")
@Data
@Builder
public class LogEntry {
    @Id
    private String id;
    private String serviceName;   // e.g. "payment-service"
    private String level;         // ERROR, WARN, INFO
    private String message;
    private String traceId;       // correlation ID
    private String environment;   // prod, staging
    private Map<String, Object> metadata;
    
    @Indexed
    private Instant timestamp;
}
