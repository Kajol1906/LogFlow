package com.logflow.backend.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic logsInfoTopic() {
        return TopicBuilder.name("logs.info").partitions(1).replicas(1).build();
    }

    @Bean
    public NewTopic logsWarnTopic() {
        return TopicBuilder.name("logs.warn").partitions(1).replicas(1).build();
    }

    @Bean
    public NewTopic logsErrorTopic() {
        return TopicBuilder.name("logs.error").partitions(1).replicas(1).build();
    }

    @Bean
    public NewTopic logsDlqTopic() {
        return TopicBuilder.name("logs.dlq").partitions(1).replicas(1).build();
    }

    @Bean
    public NewTopic alertsTriggeredTopic() {
        return TopicBuilder.name("alerts.triggered").partitions(1).replicas(1).build();
    }
}
