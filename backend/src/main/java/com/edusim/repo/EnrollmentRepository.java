package com.edusim.repo;

import com.edusim.model.Enrollment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    List<Enrollment> findByStudentId(Long studentId);
    List<Enrollment> findByCourseId(Long courseId);
    List<Enrollment> findByCourseIdIn(List<Long> courseIds);
    boolean existsByStudentIdAndCourseId(Long studentId, Long courseId);
    void deleteByCourseId(Long courseId);
}
