package com.logflow.backend.controller;

import com.logflow.backend.model.LogEntry;
import com.logflow.backend.repository.LogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

    private final LogRepository logRepository;

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
            Page<LogEntry> result = logRepository.findAll(pageable);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to search logs: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("content", List.of()));
        }
    }
}
