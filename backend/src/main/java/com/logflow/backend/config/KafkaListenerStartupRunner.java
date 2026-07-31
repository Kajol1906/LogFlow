package com.logflow.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.kafka.config.KafkaListenerEndpointRegistry;
import org.springframework.stereotype.Component;

/**
 * Attempts to start all Kafka listeners after the application context is fully ready.
 * If Kafka is unreachable (e.g., DNS resolution failure, network timeout), the error
 * is caught and logged — the REST API remains fully functional without Kafka.
 */
@Component
@Slf4j
public class KafkaListenerStartupRunner implements ApplicationRunner {

    private final KafkaListenerEndpointRegistry registry;

    public KafkaListenerStartupRunner(KafkaListenerEndpointRegistry registry) {
        this.registry = registry;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            registry.start();
            log.info("Kafka listeners started successfully");
        } catch (Exception e) {
            log.warn("Kafka listeners failed to start — REST API is still available. "
                    + "Verify KAFKA_BOOTSTRAP_SERVERS is set and the Kafka cluster is reachable. Error: {}",
                    e.getMessage());
        }
    }
}
