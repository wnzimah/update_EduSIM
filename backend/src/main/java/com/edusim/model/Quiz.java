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
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.SecondaryTable;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "quizzes")
@SecondaryTable(name = "quiz_feedback_settings", pkJoinColumns = @PrimaryKeyJoinColumn(name = "quiz_id"))
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

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean showScoreAfterSubmission = true;

    @Column(table = "quiz_feedback_settings", name = "show_correct_answer", nullable = false, columnDefinition = "boolean default true")
    private Boolean showCorrectAnswer = true;

    @Column(table = "quiz_feedback_settings", name = "show_explanation", nullable = false, columnDefinition = "boolean default true")
    private Boolean showExplanation = true;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean showRelatedConcept = true;

    @Column(table = "quiz_feedback_settings", name = "show_recommendation", nullable = false, columnDefinition = "boolean default true")
    private Boolean showLearningRecommendation = true;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean showStudentAnswerReview = true;

    @Enumerated(EnumType.STRING)
    @Column(table = "quiz_feedback_settings", name = "review_timing", nullable = false, length = 40, columnDefinition = "varchar(40) default 'IMMEDIATE_AFTER_SUBMISSION'")
    private ReviewTiming reviewTiming = ReviewTiming.IMMEDIATE_AFTER_SUBMISSION;

    @Column(table = "quiz_feedback_settings", name = "manual_release_status", nullable = false, columnDefinition = "boolean default false")
    private Boolean manualReleaseStatus = false;

    @Column(table = "quiz_feedback_settings", name = "show_selected_answer", nullable = false, columnDefinition = "boolean default true")
    private Boolean showSelectedAnswer = true;

    @Column(table = "quiz_feedback_settings", name = "show_confidence", nullable = false, columnDefinition = "boolean default true")
    private Boolean showConfidenceReflection = true;

    @Column(table = "quiz_feedback_settings", name = "show_score_breakdown", nullable = false, columnDefinition = "boolean default true")
    private Boolean showScoreBreakdown = true;

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

    public boolean isShowScoreAfterSubmission() {
        return showScoreAfterSubmission;
    }

    public void setShowScoreAfterSubmission(boolean showScoreAfterSubmission) {
        this.showScoreAfterSubmission = showScoreAfterSubmission;
        this.showScoreBreakdown = showScoreAfterSubmission;
    }

    public boolean isShowCorrectAnswer() {
        return showCorrectAnswer == null ? true : showCorrectAnswer;
    }

    public void setShowCorrectAnswer(boolean showCorrectAnswer) {
        this.showCorrectAnswer = showCorrectAnswer;
    }

    public boolean isShowExplanation() {
        return showExplanation == null ? true : showExplanation;
    }

    public void setShowExplanation(boolean showExplanation) {
        this.showExplanation = showExplanation;
    }

    public boolean isShowRelatedConcept() {
        return showRelatedConcept;
    }

    public void setShowRelatedConcept(boolean showRelatedConcept) {
        this.showRelatedConcept = showRelatedConcept;
    }

    public boolean isShowLearningRecommendation() {
        return showLearningRecommendation == null ? true : showLearningRecommendation;
    }

    public void setShowLearningRecommendation(boolean showLearningRecommendation) {
        this.showLearningRecommendation = showLearningRecommendation;
    }

    public boolean isShowStudentAnswerReview() {
        return showStudentAnswerReview;
    }

    public void setShowStudentAnswerReview(boolean showStudentAnswerReview) {
        this.showStudentAnswerReview = showStudentAnswerReview;
    }

    public ReviewTiming getReviewTiming() {
        return reviewTiming == null ? (showResultImmediately ? ReviewTiming.IMMEDIATE_AFTER_SUBMISSION : ReviewTiming.AFTER_DUE_DATE) : reviewTiming;
    }

    public void setReviewTiming(ReviewTiming reviewTiming) {
        this.reviewTiming = reviewTiming == null ? ReviewTiming.IMMEDIATE_AFTER_SUBMISSION : reviewTiming;
    }

    public boolean isManualReleaseStatus() {
        return manualReleaseStatus == null ? false : manualReleaseStatus;
    }

    public void setManualReleaseStatus(boolean manualReleaseStatus) {
        this.manualReleaseStatus = manualReleaseStatus;
    }

    public boolean isShowSelectedAnswer() {
        return showSelectedAnswer == null ? isShowStudentAnswerReview() : showSelectedAnswer;
    }

    public void setShowSelectedAnswer(boolean showSelectedAnswer) {
        this.showSelectedAnswer = showSelectedAnswer;
    }

    public boolean isShowConfidenceReflection() {
        return showConfidenceReflection == null ? true : showConfidenceReflection;
    }

    public boolean isShowConfidence() {
        return isShowConfidenceReflection();
    }

    public void setShowConfidenceReflection(boolean showConfidenceReflection) {
        this.showConfidenceReflection = showConfidenceReflection;
    }

    public void setShowConfidence(boolean showConfidence) {
        this.showConfidenceReflection = showConfidence;
    }

    public boolean isShowScoreBreakdown() {
        return showScoreBreakdown == null ? isShowScoreAfterSubmission() : showScoreBreakdown;
    }

    public void setShowScoreBreakdown(boolean showScoreBreakdown) {
        this.showScoreBreakdown = showScoreBreakdown;
        this.showScoreAfterSubmission = showScoreBreakdown;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
