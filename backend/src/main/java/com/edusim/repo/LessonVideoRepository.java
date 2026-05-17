package com.edusim.repo;

import com.edusim.model.LessonVideo;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonVideoRepository extends JpaRepository<LessonVideo, Long> {
    List<LessonVideo> findByCourseIdOrderBySortOrder(Long courseId);
    long countByCourseId(Long courseId);
    List<LessonVideo> findByCourseIdAndMandatoryTrue(Long courseId);
    Optional<LessonVideo> findByIdAndCourseLecturerId(Long id, Long lecturerId);
    Optional<LessonVideo> findTopByCourseIdOrderBySortOrderDesc(Long courseId);
    void deleteByCourseId(Long courseId);
}
