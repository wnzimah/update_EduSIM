package com.edusim.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "quizzes")
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false)
    private Integer timeLimitMinutes;

    @Column(nullable = false)
    private Integer maxAttempts;

    @Column(nullable = false)
    private Double passingMark;

    @Column(nullable = false)
    private boolean published;

    @Column(nullable = false)
    private boolean unlockAfterVideos;

    private LocalDateTime openAt;

    private LocalDateTime closeAt;

    private LocalDateTime resultReleaseAt;

    @Column(nullable = false)
    private boolean shuffleQuestions;

    @Column(nullable = false)
    private boolean shuffleAnswers;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private QuizDisplayMode questionDisplayMode = QuizDisplayMode.ONE_BY_ONE;

    @Column(nullable = false)
    private boolean showResultImmediately = true;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() {
        return id;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getTimeLimitMinutes() {
        return timeLimitMinutes;
    }

    public void setTimeLimitMinutes(Integer timeLimitMinutes) {
        this.timeLimitMinutes = timeLimitMinutes;
    }

    public Integer getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(Integer maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public Double getPassingMark() {
        return passingMark;
    }

    public void setPassingMark(Double passingMark) {
        this.passingMark = passingMark;
    }

    public boolean isPublished() {
        return published;
    }

    public void setPublished(boolean published) {
        this.published = published;
    }

    public boolean isUnlockAfterVideos() {
        return unlockAfterVideos;
    }

    public void setUnlockAfterVideos(boolean unlockAfterVideos) {
        this.unlockAfterVideos = unlockAfterVideos;
    }

    public LocalDateTime getOpenAt() {
        return openAt;
    }

    public void setOpenAt(LocalDateTime openAt) {
        this.openAt = openAt;
    }

    public LocalDateTime getCloseAt() {
        return closeAt;
    }

    public void setCloseAt(LocalDateTime closeAt) {
        this.closeAt = closeAt;
    }

    public LocalDateTime getResultReleaseAt() {
        return resultReleaseAt;
    }

    public void setResultReleaseAt(LocalDateTime resultReleaseAt) {
        this.resultReleaseAt = resultReleaseAt;
    }

    public boolean isShuffleQuestions() {
        return shuffleQuestions;
    }

    public void setShuffleQuestions(boolean shuffleQuestions) {
        this.shuffleQuestions = shuffleQuestions;
    }

    public boolean isShuffleAnswers() {
        return shuffleAnswers;
    }

    public void setShuffleAnswers(boolean shuffleAnswers) {
        this.shuffleAnswers = shuffleAnswers;
    }

    public QuizDisplayMode getQuestionDisplayMode() {
        return questionDisplayMode;
    }

    public void setQuestionDisplayMode(QuizDisplayMode questionDisplayMode) {
        this.questionDisplayMode = questionDisplayMode;
    }

    public boolean isShowResultImmediately() {
        return showResultImmediately;
    }

    public void setShowResultImmediately(boolean showResultImmediately) {
        this.showResultImmediately = showResultImmediately;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
