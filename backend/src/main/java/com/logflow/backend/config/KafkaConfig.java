package com.logflow.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;

@Configuration
public class KafkaConfig {

    /**
     * Custom batch factory for bulk log consumption.
     * autoStartup is disabled so the app doesn't crash if Kafka is unreachable.
     * Listeners are started by KafkaListenerStartupRunner after the context is ready.
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<?, ?> batchFactory(ConsumerFactory<Object, Object> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory<Object, Object> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setBatchListener(true);
        factory.setAutoStartup(false);
        return factory;
    }

    /**
     * Override the default factory so non-batch listeners (DLQ retry, alert broadcaster)
     * also defer startup. Prevents the "No resolvable bootstrap urls" crash.
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<?, ?> kafkaListenerContainerFactory(ConsumerFactory<Object, Object> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory<Object, Object> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setAutoStartup(false);
        return factory;
    }
}
