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
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "lesson_progress",
    uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "lesson_id"})
)
public class LessonProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id")
    private UserAccount student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id")
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id")
    private LessonVideo lesson;

    @Column(nullable = false)
    private Integer videoProgress = 0;

    @Column(nullable = false)
    private boolean notesOpened;

    @Column(nullable = false)
    private Integer notesCompletion = 0;

    @Column(nullable = false)
    private boolean completed;

    @Column(nullable = false)
    private LocalDateTime lastAccessed = LocalDateTime.now();

    public Long getId() {
        return id;
    }

    public UserAccount getStudent() {
        return student;
    }

    public void setStudent(UserAccount student) {
        this.student = student;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public LessonVideo getLesson() {
        return lesson;
    }

    public void setLesson(LessonVideo lesson) {
        this.lesson = lesson;
    }

    public Integer getVideoProgress() {
        return videoProgress;
    }

    public void setVideoProgress(Integer videoProgress) {
        this.videoProgress = videoProgress;
    }

    public boolean isNotesOpened() {
        return notesOpened;
    }

    public void setNotesOpened(boolean notesOpened) {
        this.notesOpened = notesOpened;
    }

    public Integer getNotesCompletion() {
        return notesCompletion;
    }

    public void setNotesCompletion(Integer notesCompletion) {
        this.notesCompletion = notesCompletion;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    public LocalDateTime getLastAccessed() {
        return lastAccessed;
    }

    public void setLastAccessed(LocalDateTime lastAccessed) {
        this.lastAccessed = lastAccessed;
    }
}
