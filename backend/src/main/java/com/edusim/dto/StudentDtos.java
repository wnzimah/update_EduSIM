package com.edusim.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;

public class StudentDtos {

    public record SubmitQuizRequest(
        @NotNull Long attemptId,
        @NotNull Map<String, Object> answers,
        Map<String, String> confidence,
        Map<String, Integer> timeSpentSeconds,
        @Size(max = 2000) String reflection
    ) {
    }

    public record VideoCommentRequest(
        @NotBlank @Size(max = 1500) String comment
    ) {
    }

    public record LessonProgressRequest(
        Integer videoProgress,
        Boolean notesOpened,
        Integer notesCompletion,
        Boolean completed
    ) {
    }
}
