package com.edusim.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "quiz_attempts")
public class QuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id")
    private Quiz quiz;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id")
    private UserAccount student;

    @Column(nullable = false)
    private Integer attemptNumber;

    @Column(nullable = false)
    private LocalDateTime startedAt;

    private LocalDateTime submittedAt;

    private Double score;

    private Boolean passed;

    @Column(length = 500)
    private String feedback;

    @Column(length = 2000)
    private String reflection;

    @Lob
    private String masteryJson;

    @Lob
    private String recommendationJson;

    @Lob
    private String retakePlanJson;

    @Lob
    private String timeAnalysisJson;

    @Lob
    private String confidenceSummaryJson;

    public Long getId() {
        return id;
    }

    public Quiz getQuiz() {
        return quiz;
    }

    public void setQuiz(Quiz quiz) {
        this.quiz = quiz;
    }

    public UserAccount getStudent() {
        return student;
    }

    public void setStudent(UserAccount student) {
        this.student = student;
    }

    public Integer getAttemptNumber() {
        return attemptNumber;
    }

    public void setAttemptNumber(Integer attemptNumber) {
        this.attemptNumber = attemptNumber;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public Double getScore() {
        return score;
    }

    public void setScore(Double score) {
        this.score = score;
    }

    public Boolean getPassed() {
        return passed;
    }

    public void setPassed(Boolean passed) {
        this.passed = passed;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public String getReflection() {
        return reflection;
    }

    public void setReflection(String reflection) {
        this.reflection = reflection;
    }

    public String getMasteryJson() {
        return masteryJson;
    }

    public void setMasteryJson(String masteryJson) {
        this.masteryJson = masteryJson;
    }

    public String getRecommendationJson() {
        return recommendationJson;
    }

    public void setRecommendationJson(String recommendationJson) {
        this.recommendationJson = recommendationJson;
    }

    public String getRetakePlanJson() {
        return retakePlanJson;
    }

    public void setRetakePlanJson(String retakePlanJson) {
        this.retakePlanJson = retakePlanJson;
    }

    public String getTimeAnalysisJson() {
        return timeAnalysisJson;
    }

    public void setTimeAnalysisJson(String timeAnalysisJson) {
        this.timeAnalysisJson = timeAnalysisJson;
    }

    public String getConfidenceSummaryJson() {
        return confidenceSummaryJson;
    }

    public void setConfidenceSummaryJson(String confidenceSummaryJson) {
        this.confidenceSummaryJson = confidenceSummaryJson;
    }
}
