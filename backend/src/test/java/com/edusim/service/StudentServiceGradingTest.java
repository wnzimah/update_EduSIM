package com.edusim.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.edusim.model.Question;
import com.edusim.model.QuestionType;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class StudentServiceGradingTest {

    private StudentService studentService;
    private Method gradeAnswer;

    @BeforeEach
    void setUp() throws Exception {
        studentService = new StudentService(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            new ObjectMapper(),
            null
        );
        gradeAnswer = StudentService.class.getDeclaredMethod("gradeAnswer", Question.class, Object.class);
        gradeAnswer.setAccessible(true);
    }

    @Test
    void gradesMcqAndTrueFalseUsingNormalizedExactMatch() throws Exception {
        assertGrade(question(QuestionType.MCQ, "[\"ETL\",\"API\"]", "\"ETL\"", 2), " etl ", true, 2.0);
        assertGrade(question(QuestionType.TRUE_FALSE, "[\"True\",\"False\"]", "\"False\"", 1), "false", true, 1.0);
        assertGrade(question(QuestionType.MCQ, "[\"ETL\",\"API\"]", "\"ETL\"", 2), "API", false, 0.0);
    }

    @Test
    void gradesMultiSelectWithFullMatchPartialCreditAndDistractorPenalty() throws Exception {
        Question question = question(
            QuestionType.MULTI_SELECT,
            "[\"Batch\",\"Streaming\",\"Drawing\",\"File Transfer\"]",
            "[\"Batch\",\"Streaming\"]",
            4
        );

        assertGrade(question, List.of("Batch", "Streaming"), true, 4.0);
        assertGrade(question, List.of("Batch"), false, 2.0);
        assertGrade(question, List.of("Batch", "Drawing"), false, 0.0);
    }

    @Test
    void gradesShortAnswerByKeywordsWhenProvided() throws Exception {
        Question question = question(
            QuestionType.SHORT_ANSWER,
            "{\"keywords\":[\"application\",\"programming\",\"interface\"]}",
            "\"application programming interface\"",
            3
        );

        assertGrade(question, "Application Programming Interface", true, 3.0);
        assertGrade(question, "application interface", false, 2.0);
        assertGrade(question, "database", false, 0.0);
    }

    @Test
    void gradesMatchingExactlyByDefaultAndPartiallyWhenConfigured() throws Exception {
        Question exact = question(
            QuestionType.MATCHING,
            "{\"left\":[\"ETL\",\"API\"],\"right\":[\"Extract Transform Load\",\"Application Programming Interface\"]}",
            "{\"ETL\":\"Extract Transform Load\",\"API\":\"Application Programming Interface\"}",
            4
        );
        Question partial = question(
            QuestionType.MATCHING,
            "{\"left\":[\"ETL\",\"API\"],\"right\":[\"Extract Transform Load\",\"Application Programming Interface\"],\"scoringType\":\"PARTIAL\"}",
            "{\"ETL\":\"Extract Transform Load\",\"API\":\"Application Programming Interface\"}",
            4
        );

        Map<String, String> oneCorrect = Map.of(
            "ETL", "Extract Transform Load",
            "API", "Wrong"
        );
        Map<String, String> allCorrect = Map.of(
            "ETL", "Extract Transform Load",
            "API", "Application Programming Interface"
        );

        assertGrade(exact, allCorrect, true, 4.0);
        assertGrade(exact, oneCorrect, false, 0.0);
        assertGrade(partial, oneCorrect, false, 2.0);
    }

    private Question question(QuestionType type, String optionsJson, String correctAnswerJson, int points) {
        Question question = new Question();
        question.setQuestionType(type);
        question.setPrompt("Prompt");
        question.setOptionsJson(optionsJson);
        question.setCorrectAnswerJson(correctAnswerJson);
        question.setPoints(points);
        question.setSortOrder(1);
        return question;
    }

    private void assertGrade(Question question, Object submitted, boolean expectedCorrect, double expectedPoints) throws Exception {
        Object result = gradeAnswer.invoke(studentService, question, submitted);
        Method correct = result.getClass().getDeclaredMethod("correct");
        Method awardedPoints = result.getClass().getDeclaredMethod("awardedPoints");
        correct.setAccessible(true);
        awardedPoints.setAccessible(true);

        assertThat((boolean) correct.invoke(result)).isEqualTo(expectedCorrect);
        assertThat((double) awardedPoints.invoke(result)).isEqualTo(expectedPoints);
    }
}
