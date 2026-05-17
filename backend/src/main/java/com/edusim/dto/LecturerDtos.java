package com.edusim.dto;

import com.edusim.model.DifficultyLevel;
import com.edusim.model.QuestionType;
import com.edusim.model.QuizDisplayMode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class LecturerDtos {

    public record CourseRequest(
        @NotBlank String title,
        @NotBlank String description
    ) {
    }

    public record VideoRequest(
        @NotBlank String title,
        @NotBlank String description,
        @NotBlank String videoUrl,
        @NotNull @Min(1) Integer durationMinutes,
        @NotNull @Min(1) Integer sortOrder,
        @NotNull Boolean mandatory
    ) {
    }

    public record MaterialRequest(
        @NotBlank String title,
        @NotBlank String materialType,
        @NotBlank String resourceUrl
    ) {
    }

    public record QuestionBankRequest(
        @NotNull Long courseId,
        @NotNull QuestionType questionType,
        @NotNull DifficultyLevel difficultyLevel,
        @NotBlank String topicTag,
        String moduleTag,
        @NotBlank String prompt,
        String explanation,
        String mediaUrl,
        String mediaType,
        @NotNull Object options,
        @NotNull Object correctAnswer,
        @NotNull @Min(1) Integer points
    ) {
    }

    public record QuizAutoSelectRequest(
        @NotNull @Min(1) Integer questionCount,
        QuestionType questionType,
        DifficultyLevel difficultyLevel,
        String topicTag,
        LocalDate createdFrom,
        LocalDate createdTo,
        String keyword
    ) {
    }

    public record QuizRequest(
        @NotNull Long courseId,
        @NotBlank String title,
        String description,
        @NotNull @Min(1) Integer timeLimitMinutes,
        @NotNull @Min(1) Integer maxAttempts,
        @NotNull @Min(0) @Max(100) Double passingMark,
        @NotNull Boolean published,
        @NotNull Boolean unlockAfterVideos,
        @NotNull Boolean shuffleQuestions,
        @NotNull Boolean shuffleAnswers,
        @NotNull QuizDisplayMode questionDisplayMode,
        @NotNull Boolean showResultImmediately,
        LocalDateTime openAt,
        LocalDateTime closeAt,
        LocalDateTime resultReleaseAt,
        @NotNull List<Long> questionBankIds,
        QuizAutoSelectRequest autoSelect
    ) {
    }

    public record MarkAdjustmentRequest(
        @NotNull @Min(0) Double awardedPoints,
        String reason
    ) {
    }

    public record PublishRequest(@NotNull Boolean published) {
    }
}
