package com.logflow.backend.repository;

import com.logflow.backend.model.AlertRule;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRuleRepository extends MongoRepository<AlertRule, String> {
    List<AlertRule> findByActive(boolean active);
}
