package com.edusim.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.edusim.model.QuestionType;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Method;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LecturerServiceImportParsingTest {

    private LecturerService lecturerService;
    private Method explicitNumberedQuestionBlocks;
    private Method inferImportedQuestionType;

    @BeforeEach
    void setUp() throws Exception {
        lecturerService = new LecturerService(
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
            null,
            null,
            new ObjectMapper()
        );
        explicitNumberedQuestionBlocks = LecturerService.class.getDeclaredMethod("explicitNumberedQuestionBlocks", String.class);
        explicitNumberedQuestionBlocks.setAccessible(true);
        inferImportedQuestionType = LecturerService.class.getDeclaredMethod("inferImportedQuestionType", seedClass());
        inferImportedQuestionType.setAccessible(true);
    }

    @Test
    void parsesMixedNumberedPdfQuestionsIntoAllQuestionTypes() throws Exception {
        List<?> seeds = parse("""
            1.Question1-True/FalseAdatabaseisusedtostoreandorganizeinformation.A.TrueB.FalseAnswer:A(True)
            2.Question2-MatchingQuestionMatchthedatabasetermswiththeirmeanings.TermsMeanings
            1.TableA.Uniqueidentifier2.RowB.Collectionofrelateddata3.ColumnC.Singlerecord
            4.DatabaseD.Categoryofinformation5.PrimaryKeyE.OrganizeddatastorageAnswer:1-B2-C3-D4-E5-A
            3.Question3-MultipleSelectWhichofthefollowingaredatabasesoftware?(Selectmorethanoneanswer)
            ☐MicrosoftWord☑MySQL☑Oracle☑PostgreSQL☐CanvaAnswer:MySQL,Oracle,PostgreSQL
            4.Question4-MultipleChoiceWhichSQLcommandisusedtoretrievedatafromadatabase?
            A.DELETEB.SELECTC.UPDATED.INSERTAnswer:
            5.Question5(shorttextquestion)WhatdoesDBMSstandfor?ExpectedAnswer*Isijawapansebenar:
            DatabaseManagementSystemKeywordsDBMS,databasemanagementsystem,databasesystem
            """);

        assertThat(seeds).hasSize(5);
        assertThat(typeOf(seeds.get(0))).isEqualTo(QuestionType.TRUE_FALSE);
        assertThat(typeOf(seeds.get(1))).isEqualTo(QuestionType.MATCHING);
        assertThat(typeOf(seeds.get(2))).isEqualTo(QuestionType.MULTI_SELECT);
        assertThat(typeOf(seeds.get(3))).isEqualTo(QuestionType.MCQ);
        assertThat(typeOf(seeds.get(4))).isEqualTo(QuestionType.SHORT_ANSWER);
        assertThat(answerOf(seeds.get(3))).isEqualTo("SELECT");
        assertThat(answerOf(seeds.get(4))).isEqualTo("Database Management System");
    }

    private List<?> parse(String text) throws Exception {
        return (List<?>) explicitNumberedQuestionBlocks.invoke(lecturerService, text);
    }

    private QuestionType typeOf(Object seed) throws Exception {
        return (QuestionType) inferImportedQuestionType.invoke(lecturerService, seed);
    }

    private String answerOf(Object seed) throws Exception {
        Method answer = seed.getClass().getDeclaredMethod("answer");
        answer.setAccessible(true);
        return String.valueOf(answer.invoke(seed));
    }

    private Class<?> seedClass() {
        return List.of(LecturerService.class.getDeclaredClasses())
            .stream()
            .filter(type -> type.getSimpleName().equals("ImportedQuestionSeed"))
            .findFirst()
            .orElseThrow();
    }
}
