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

@Entity
@Table(name = "topic_learning_resources")
public class TopicLearningResource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(nullable = false, length = 120)
    private String topic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id")
    private LessonVideo video;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notes_id")
    private CourseMaterial notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "practice_quiz_id")
    private Quiz practiceQuiz;

    public Long getId() {
        return id;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public LessonVideo getVideo() {
        return video;
    }

    public void setVideo(LessonVideo video) {
        this.video = video;
    }

    public CourseMaterial getNotes() {
        return notes;
    }

    public void setNotes(CourseMaterial notes) {
        this.notes = notes;
    }

    public Quiz getPracticeQuiz() {
        return practiceQuiz;
    }

    public void setPracticeQuiz(Quiz practiceQuiz) {
        this.practiceQuiz = practiceQuiz;
    }
}
