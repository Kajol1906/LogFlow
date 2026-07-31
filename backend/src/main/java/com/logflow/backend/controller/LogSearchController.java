package com.logflow.backend.controller;

import com.logflow.backend.model.LogEntry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/logs/search")
@RequiredArgsConstructor
@Slf4j
public class LogSearchController {

    private final MongoTemplate mongoTemplate;

    @GetMapping
    public ResponseEntity<?> search(
        @RequestParam(required = false) String query,
        @RequestParam(required = false) String level,
        @RequestParam(required = false) String service,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
            Query mongoQuery = new Query().with(pageable);

            if (query != null && !query.isBlank()) {
                // simple search across message or traceId
                Criteria searchCriteria = new Criteria().orOperator(
                        Criteria.where("message").regex(query, "i"),
                        Criteria.where("traceId").is(query)
                );
                mongoQuery.addCriteria(searchCriteria);
            }
            if (level != null && !level.isBlank()) {
                mongoQuery.addCriteria(Criteria.where("level").is(level.toUpperCase()));
            }
            if (service != null && !service.isBlank()) {
                mongoQuery.addCriteria(Criteria.where("serviceName").is(service));
            }

            long count = mongoTemplate.count(Query.of(mongoQuery).limit(-1).skip(-1), LogEntry.class);
            List<LogEntry> logs = mongoTemplate.find(mongoQuery, LogEntry.class);
            Page<LogEntry> result = new PageImpl<>(logs, pageable, count);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to search logs: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("content", List.of()));
        }
    }
}
