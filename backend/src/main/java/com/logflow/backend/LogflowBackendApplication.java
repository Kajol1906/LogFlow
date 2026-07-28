package com.logflow.backend;

import com.logflow.backend.model.AlertRule;
import com.logflow.backend.repository.AlertRuleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.util.List;

@SpringBootApplication
public class LogflowBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(LogflowBackendApplication.class, args);
    }

    @Bean
    CommandLineRunner initDatabase(AlertRuleRepository alertRuleRepository) {
        return args -> {
            List<AlertRule> rules = alertRuleRepository.findAll();
            if (rules.isEmpty()) {
                AlertRule rule = new AlertRule();
                rule.setRuleName("High Error Rate Spike");
                rule.setServiceName("payment-service");
                rule.setCondition("ERROR_COUNT");
                rule.setThreshold(5); 
                rule.setWindowMinutes(5);
                rule.setSeverity("CRITICAL");
                rule.setActive(true);
                alertRuleRepository.save(rule);
                System.out.println("Default AlertRule created for payment-service");
            }
        };
    }
}
