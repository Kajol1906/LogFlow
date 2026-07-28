package com.logflow.backend.controller;

import com.logflow.backend.model.LogEntry;
import com.logflow.backend.repository.LogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/logs/search")
@RequiredArgsConstructor
public class LogSearchController {

    private final LogRepository logRepository;

    @GetMapping
    public Page<LogEntry> search(
        @RequestParam(required = false) String query,
        @RequestParam(required = false) String level,
        @RequestParam(required = false) String service,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        // Using simple findAll() as placeholder. Atlas Search integration would require specific MongoTemplate queries.
        return logRepository.findAll(pageable);
    }
}
