package com.logflow.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroqAiService {

    @Value("${groq.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String generateRootCauseHypothesis(List<String> errorMessages) {
        if (apiKey == null || apiKey.isEmpty()) {
            return "Groq AI is disabled (API key missing). Simulated hypothesis: Service overloaded or database connection failed.";
        }

        try {
            String url = "https://api.groq.com/openai/v1/chat/completions";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            String prompt = "You are a DevOps assistant. Analyze these log errors and provide a brief (1-2 sentences) plain-English root cause hypothesis:\n" + String.join("\n", errorMessages);

            Map<String, Object> body = new HashMap<>();
            body.put("model", "llama3-8b-8192");
            body.put("messages", List.of(Map.of("role", "user", "content", prompt)));
            body.put("max_tokens", 150);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);

            if (response != null && response.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    return (String) message.get("content");
                }
            }
        } catch (Exception e) {
            log.error("Failed to call Groq AI", e);
            return "Failed to generate root cause hypothesis.";
        }
        return "No root cause hypothesis could be generated.";
    }
}
