package com.edusim.repo;

import com.edusim.model.TopicLearningResource;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TopicLearningResourceRepository extends JpaRepository<TopicLearningResource, Long> {
    List<TopicLearningResource> findByCourseId(Long courseId);
    List<TopicLearningResource> findByCourseIdAndTopicIgnoreCase(Long courseId, String topic);
    void deleteByVideoId(Long videoId);
    void deleteByNotesId(Long notesId);
    void deleteByPracticeQuizId(Long quizId);
    void deleteByCourseId(Long courseId);
}
