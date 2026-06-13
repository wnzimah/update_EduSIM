package com.edusim.repo;

import com.edusim.model.LessonProgress;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {
    Optional<LessonProgress> findByStudentIdAndLessonId(Long studentId, Long lessonId);
    List<LessonProgress> findByStudentIdAndCourseId(Long studentId, Long courseId);
    void deleteByLessonId(Long lessonId);
    void deleteByCourseId(Long courseId);
}
