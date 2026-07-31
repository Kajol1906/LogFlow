package com.logflow.backend.controller;

import com.logflow.backend.model.AlertRule;
import com.logflow.backend.repository.AlertRuleRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/alerts/rules")
@RequiredArgsConstructor
public class AlertRuleController {

    private final AlertRuleRepository alertRuleRepository;

    @GetMapping
    public List<AlertRule> getRules() {
        return alertRuleRepository.findAll();
    }

    @PostMapping
    public AlertRule createRule(@Valid @RequestBody AlertRule rule) {
        return alertRuleRepository.save(rule);
    }

    @DeleteMapping("/{id}")
    public void deleteRule(@PathVariable String id) {
        alertRuleRepository.deleteById(id);
    }
}
