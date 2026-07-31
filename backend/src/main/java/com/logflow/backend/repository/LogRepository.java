package com.logflow.backend.repository;

import com.logflow.backend.model.LogEntry;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface LogRepository extends MongoRepository<LogEntry, String> {
    long countByServiceNameAndLevelAndTimestampAfter(String serviceName, String level, Instant timestamp);
}
