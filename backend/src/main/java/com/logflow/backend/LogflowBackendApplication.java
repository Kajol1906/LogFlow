package com.logflow.backend;

import com.logflow.backend.model.AlertRule;
import com.logflow.backend.repository.AlertRuleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;

import java.util.List;

@SpringBootApplication
@Slf4j
public class LogflowBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(LogflowBackendApplication.class, args);
    }

    @Bean
    CommandLineRunner initDatabase(AlertRuleRepository alertRuleRepository, Environment env) {
        return args -> {
            // Log the MongoDB URI being used (mask credentials)
            String mongoUri = env.getProperty("spring.data.mongodb.uri", "NOT SET");
            if (mongoUri.contains("@")) {
                mongoUri = mongoUri.replaceAll("://[^@]+@", "://*****@");
            }
            log.info("MongoDB URI resolved to: {}", mongoUri);

            try {
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
                    log.info("Default AlertRule created for payment-service");
                }
            } catch (Exception e) {
                log.warn("Could not seed database on startup (MongoDB may still be connecting): {}", e.getMessage());
                // Don't crash the app — the database will be available for normal API requests later
            }
        };
    }
}
