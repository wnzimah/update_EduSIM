package com.edusim.service;

import com.edusim.model.QuizAttempt;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class AiLearningService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final String apiKey;
    private final String model;
    private final String endpoint;

    public AiLearningService(
        RestClient.Builder restClientBuilder,
        ObjectMapper objectMapper,
        @Value("${app.ai.enabled:true}") boolean enabled,
        @Value("${app.ai.gemini.api-key:}") String apiKey,
        @Value("${app.ai.gemini.model:gemini-1.5-flash}") String model,
        @Value("${app.ai.gemini.endpoint:https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent}") String endpoint
    ) {
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.endpoint = endpoint;
    }

    public Map<String, Object> studentAttemptFeedback(
        QuizAttempt attempt,
        List<Map<String, Object>> wrongAnswers,
        List<Map<String, Object>> mastery,
        List<Map<String, Object>> recommendations
    ) {
        Map<String, Object> fallback = fallbackFeedback(attempt, wrongAnswers, mastery, recommendations);
        if (!enabled || apiKey.isBlank() || wrongAnswers.isEmpty()) {
            return fallback;
        }

        try {
            String prompt = buildStudentFeedbackPrompt(attempt, wrongAnswers, mastery, recommendations);
            String generatedText = callGemini(prompt);
            Map<String, Object> parsed = parseGeneratedJson(generatedText);
            if (parsed.isEmpty()) {
                return fallbackWithStatus(fallback, "AI response could not be parsed, fallback feedback shown.");
            }
            parsed.put("enabled", true);
            parsed.put("source", "ai");
            parsed.put("model", model);
            parsed.put("provider", "Gemini API");
            return parsed;
        } catch (Exception ex) {
            return fallbackWithStatus(fallback, "AI service unavailable, fallback feedback shown.");
        }
    }

    private String callGemini(String prompt) {
        String url = endpoint.replace("{model}", model);
        var uri = UriComponentsBuilder.fromUriString(url)
            .queryParam("key", apiKey)
            .build()
            .toUri();
        Map<String, Object> body = Map.of(
            "contents", List.of(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", prompt))
            )),
            "generationConfig", Map.of(
                "temperature", 0.35,
                "responseMimeType", "application/json"
            )
        );

        JsonNode response = restClient.post()
            .uri(uri)
            .body(body)
            .retrieve()
            .body(JsonNode.class);

        if (response == null) {
            return "";
        }
        JsonNode textNode = response.path("candidates").path(0).path("content").path("parts").path(0).path("text");
        return textNode.isTextual() ? textNode.asText() : "";
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseGeneratedJson(String text) throws Exception {
        if (text == null || text.isBlank()) {
            return Map.of();
        }
        String cleaned = text.trim();
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        if (start >= 0 && end > start) {
            cleaned = cleaned.substring(start, end + 1);
        }
        Object value = objectMapper.readValue(cleaned, Object.class);
        if (value instanceof Map<?, ?> map) {
            return new LinkedHashMap<>((Map<String, Object>) map);
        }
        return Map.of();
    }

    private String buildStudentFeedbackPrompt(
        QuizAttempt attempt,
        List<Map<String, Object>> wrongAnswers,
        List<Map<String, Object>> mastery,
        List<Map<String, Object>> recommendations
    ) {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("courseTitle", attempt.getQuiz().getCourse().getTitle());
        context.put("quizTitle", attempt.getQuiz().getTitle());
        context.put("score", attempt.getScore());
        context.put("passed", attempt.getPassed());
        context.put("wrongAnswers", wrongAnswers);
        context.put("mastery", mastery);
        context.put("recommendations", recommendations);

        return """
            You are EduSIM AI Learning Coach. Generate concise student feedback for a quiz result.
            Use supportive, simple English. Explain wrong answers by focusing on why the student's answer is wrong,
            the correct concept, and what to revise next. Do not invent course content beyond the supplied data.

            Return JSON only with this exact shape:
            {
              "headline": "short title",
              "summary": "2-3 sentence overall performance recommendation",
              "priorityTopics": [{"topicTag":"topic","reason":"why revise this","action":"what to do next"}],
              "answerExplanations": [{"questionId":1,"topicTag":"topic","explanation":"why the answer is wrong","correctConcept":"core concept","nextStep":"specific revision step"}],
              "studyPlan": [{"step":"step title","details":"short details"}]
            }

            Context JSON:
            """ + writeContext(context);
    }

    private String writeContext(Map<String, Object> context) {
        try {
            return objectMapper.writeValueAsString(context);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private Map<String, Object> fallbackFeedback(
        QuizAttempt attempt,
        List<Map<String, Object>> wrongAnswers,
        List<Map<String, Object>> mastery,
        List<Map<String, Object>> recommendations
    ) {
        List<Map<String, Object>> priorityTopics = new ArrayList<>();
        for (Map<String, Object> row : recommendations) {
            priorityTopics.add(Map.of(
                "topicTag", stringValue(row.getOrDefault("topicTag", row.getOrDefault("weakTopic", "General"))),
                "reason", stringValue(row.getOrDefault("reason", "This topic needs revision.")),
                "action", stringValue(row.getOrDefault("actionLabel", "Review related lesson"))
            ));
        }

        List<Map<String, Object>> answerExplanations = wrongAnswers.stream()
            .limit(5)
            .map(answer -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("questionId", answer.get("questionId"));
                row.put("topicTag", stringValue(answer.getOrDefault("topicTag", "General")));
                row.put("explanation", stringValue(answer.getOrDefault("feedbackDetail", "Compare your answer with the correct answer and review the concept.")));
                row.put("correctConcept", stringValue(answer.getOrDefault("learningConcept", answer.getOrDefault("topicTag", "General"))));
                row.put("nextStep", stringValue(answer.getOrDefault("learningTip", "Review the related lesson and retry a similar question.")));
                return row;
            })
            .toList();

        List<Map<String, Object>> studyPlan = new ArrayList<>();
        studyPlan.add(Map.of(
            "step", "Start with incorrect answers",
            "details", wrongAnswers.isEmpty()
                ? "No incorrect answer was detected. Move to a harder practice task."
                : "Read each explanation card and compare your answer with the correct concept."
        ));
        studyPlan.add(Map.of(
            "step", "Revise weak topics",
            "details", priorityTopics.isEmpty()
                ? "Keep the concepts fresh with a quick review."
                : "Focus on " + stringValue(priorityTopics.get(0).get("topicTag")) + " first."
        ));
        studyPlan.add(Map.of(
            "step", "Retry with better pacing",
            "details", "Attempt similar questions after revision and slow down on confusing options."
        ));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("enabled", false);
        response.put("source", "fallback");
        response.put("provider", "EduSIM rule-based coach");
        response.put("model", "");
        response.put("headline", wrongAnswers.isEmpty() ? "Strong attempt" : "Personalized revision plan");
        response.put("summary", buildFallbackSummary(attempt, wrongAnswers, mastery));
        response.put("priorityTopics", priorityTopics);
        response.put("answerExplanations", answerExplanations);
        response.put("studyPlan", studyPlan);
        response.put("apiStatus", apiKey.isBlank() ? "Set EDUSIM_AI_API_KEY to enable Gemini AI feedback." : "Fallback feedback generated.");
        return response;
    }

    private Map<String, Object> fallbackWithStatus(Map<String, Object> fallback, String status) {
        Map<String, Object> response = new LinkedHashMap<>(fallback);
        response.put("apiStatus", status);
        return response;
    }

    private String buildFallbackSummary(QuizAttempt attempt, List<Map<String, Object>> wrongAnswers, List<Map<String, Object>> mastery) {
        double score = attempt.getScore() == null ? 0.0 : attempt.getScore();
        if (wrongAnswers.isEmpty()) {
            return "You showed strong understanding in this attempt. Keep practising with a harder scenario to maintain mastery.";
        }
        String weakTopic = mastery.stream()
            .filter(row -> toDouble(row.get("score")) < 70.0)
            .map(row -> stringValue(row.getOrDefault("topicTag", "General")))
            .findFirst()
            .orElse(stringValue(wrongAnswers.get(0).getOrDefault("topicTag", "General")));
        return "Your score is " + Math.round(score) + "%. You should revise " + weakTopic
            + " first because it appears in your incorrect or partial answers.";
    }

    private double toDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return value == null ? 0.0 : Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return 0.0;
        }
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}
