package com.edusim.repo;

import com.edusim.model.QuizResetRequest;
import com.edusim.model.ResetRequestStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizResetRequestRepository extends JpaRepository<QuizResetRequest, Long> {
    boolean existsByStudentIdAndCourseIdAndStatus(Long studentId, Long courseId, ResetRequestStatus status);
    List<QuizResetRequest> findByCourseLecturerIdOrderByRequestedAtDesc(Long lecturerId);
}
