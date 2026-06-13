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

@Entity
@Table(name = "quiz_attempt_answers")
public class QuizAttemptAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attempt_id")
    private QuizAttempt attempt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id")
    private Question question;

    @Lob
    @Column(nullable = false)
    private String answerJson;

    @Lob
    private String correctAnswerJson;

    @Column(nullable = false)
    private boolean correct;

    @Column(nullable = false)
    private Double awardedPoints;

    @Column(length = 80)
    private String topicTag;

    @Column(length = 40)
    private String confidenceLevel;

    private Integer timeSpentSeconds;

    @Column(length = 80)
    private String timeSignal;

    @Column(length = 500)
    private String misconception;

    public Long getId() {
        return id;
    }

    public QuizAttempt getAttempt() {
        return attempt;
    }

    public void setAttempt(QuizAttempt attempt) {
        this.attempt = attempt;
    }

    public Question getQuestion() {
        return question;
    }

    public void setQuestion(Question question) {
        this.question = question;
    }

    public String getAnswerJson() {
        return answerJson;
    }

    public void setAnswerJson(String answerJson) {
        this.answerJson = answerJson;
    }

    public String getCorrectAnswerJson() {
        return correctAnswerJson;
    }

    public void setCorrectAnswerJson(String correctAnswerJson) {
        this.correctAnswerJson = correctAnswerJson;
    }

    public boolean isCorrect() {
        return correct;
    }

    public void setCorrect(boolean correct) {
        this.correct = correct;
    }

    public Double getAwardedPoints() {
        return awardedPoints;
    }

    public void setAwardedPoints(Double awardedPoints) {
        this.awardedPoints = awardedPoints;
    }

    public String getTopicTag() {
        return topicTag;
    }

    public void setTopicTag(String topicTag) {
        this.topicTag = topicTag;
    }

    public String getConfidenceLevel() {
        return confidenceLevel;
    }

    public void setConfidenceLevel(String confidenceLevel) {
        this.confidenceLevel = confidenceLevel;
    }

    public Integer getTimeSpentSeconds() {
        return timeSpentSeconds;
    }

    public void setTimeSpentSeconds(Integer timeSpentSeconds) {
        this.timeSpentSeconds = timeSpentSeconds;
    }

    public String getTimeSignal() {
        return timeSignal;
    }

    public void setTimeSignal(String timeSignal) {
        this.timeSignal = timeSignal;
    }

    public String getMisconception() {
        return misconception;
    }

    public void setMisconception(String misconception) {
        this.misconception = misconception;
    }
}
