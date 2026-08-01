package com.logflow.backend.config;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;

/**
 * Explicitly creates the MongoClient from the resolved URI.
 * This overrides Spring Boot's auto-configuration which was
 * ignoring the spring.data.mongodb.uri property and defaulting
 * to localhost:27017.
 */
@Configuration
@Slf4j
public class MongoConfig {

    @Value("${spring.data.mongodb.uri:mongodb://localhost:27017/logflow}")
    private String mongoUri;

    @Bean
    public MongoClient mongoClient() {
        String maskedUri = mongoUri.contains("@")
                ? mongoUri.replaceAll("://[^@]+@", "://*****@")
                : mongoUri;
        log.info("Creating MongoClient with URI: {}", maskedUri);

        ConnectionString connectionString = new ConnectionString(mongoUri);
        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(connectionString)
                .build();
        return MongoClients.create(settings);
    }

    @Bean
    public MongoDatabaseFactory mongoDatabaseFactory(MongoClient mongoClient) {
        ConnectionString connectionString = new ConnectionString(mongoUri);
        String database = connectionString.getDatabase();
        if (database == null || database.isBlank()) {
            database = "logflow";
        }
        return new SimpleMongoClientDatabaseFactory(mongoClient, database);
    }

    @Bean
    public MongoTemplate mongoTemplate(MongoDatabaseFactory mongoDatabaseFactory) {
        return new MongoTemplate(mongoDatabaseFactory);
    }
}
