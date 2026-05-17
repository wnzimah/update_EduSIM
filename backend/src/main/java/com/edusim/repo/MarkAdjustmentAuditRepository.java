package com.edusim.repo;

import com.edusim.model.MarkAdjustmentAudit;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarkAdjustmentAuditRepository extends JpaRepository<MarkAdjustmentAudit, Long> {
    List<MarkAdjustmentAudit> findByAttemptAnswerAttemptIdOrderByChangedAtDesc(Long attemptId);
    void deleteByAttemptAnswerAttemptQuizId(Long quizId);
    void deleteByAttemptAnswerAttemptQuizCourseId(Long courseId);
}
