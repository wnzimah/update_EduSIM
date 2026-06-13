package com.edusim.repo;

import com.edusim.model.FeedbackViewLog;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackViewLogRepository extends JpaRepository<FeedbackViewLog, Long> {
    Optional<FeedbackViewLog> findByAttemptIdAndStudentId(Long attemptId, Long studentId);
    List<FeedbackViewLog> findByStudentIdAndAttemptIdIn(Long studentId, List<Long> attemptIds);
    void deleteByAttemptIdIn(List<Long> attemptIds);
    void deleteByAttemptQuizId(Long quizId);
    void deleteByAttemptQuizCourseId(Long courseId);
}
