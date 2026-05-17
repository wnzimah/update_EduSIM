package com.edusim.repo;

import com.edusim.model.CourseMaterial;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseMaterialRepository extends JpaRepository<CourseMaterial, Long> {
    List<CourseMaterial> findByCourseId(Long courseId);
    Optional<CourseMaterial> findByIdAndCourseLecturerId(Long id, Long lecturerId);
    long countByCourseId(Long courseId);
    void deleteByCourseId(Long courseId);
}
