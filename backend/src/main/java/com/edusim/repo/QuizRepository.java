package com.edusim.repo;

import com.edusim.model.Quiz;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizRepository extends JpaRepository<Quiz, Long> {
    List<Quiz> findByCourseId(Long courseId);
    List<Quiz> findByCourseIdAndPublishedTrue(Long courseId);
    long countByCourseId(Long courseId);
    Optional<Quiz> findByIdAndCourseLecturerId(Long id, Long lecturerId);
    void deleteByCourseId(Long courseId);
}
