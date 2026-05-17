package com.edusim.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "mark_adjustment_audits")
public class MarkAdjustmentAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attempt_answer_id")
    private QuizAttemptAnswer attemptAnswer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lecturer_id")
    private UserAccount lecturer;

    @Column(nullable = false)
    private Double previousPoints;

    @Column(nullable = false)
    private Double newPoints;

    @Column(length = 500)
    private String reason;

    @Column(nullable = false)
    private LocalDateTime changedAt = LocalDateTime.now();

    public Long getId() {
        return id;
    }

    public QuizAttemptAnswer getAttemptAnswer() {
        return attemptAnswer;
    }

    public void setAttemptAnswer(QuizAttemptAnswer attemptAnswer) {
        this.attemptAnswer = attemptAnswer;
    }

    public UserAccount getLecturer() {
        return lecturer;
    }

    public void setLecturer(UserAccount lecturer) {
        this.lecturer = lecturer;
    }

    public Double getPreviousPoints() {
        return previousPoints;
    }

    public void setPreviousPoints(Double previousPoints) {
        this.previousPoints = previousPoints;
    }

    public Double getNewPoints() {
        return newPoints;
    }

    public void setNewPoints(Double newPoints) {
        this.newPoints = newPoints;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public LocalDateTime getChangedAt() {
        return changedAt;
    }

    public void setChangedAt(LocalDateTime changedAt) {
        this.changedAt = changedAt;
    }
}
