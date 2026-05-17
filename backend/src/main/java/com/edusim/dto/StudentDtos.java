package com.edusim.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Map;

public class StudentDtos {

    public record SubmitQuizRequest(
        @NotNull Long attemptId,
        @NotNull Map<String, Object> answers
    ) {
    }
}
