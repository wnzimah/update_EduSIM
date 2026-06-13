package com.edusim.repo;

import com.edusim.model.QuizAttempt;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {
    List<QuizAttempt> findByStudentIdOrderBySubmittedAtDesc(Long studentId);
    long countByQuizIdAndStudentId(Long quizId, Long studentId);
    boolean existsByQuizIdAndStudentIdAndSubmittedAtIsNotNull(Long quizId, Long studentId);
    Optional<QuizAttempt> findFirstByQuizIdAndStudentIdAndSubmittedAtIsNullOrderByStartedAtDesc(Long quizId, Long studentId);
    Optional<QuizAttempt> findByIdAndStudentId(Long id, Long studentId);
    List<QuizAttempt> findByQuizIdAndStudentIdAndSubmittedAtIsNotNullOrderByAttemptNumberAsc(Long quizId, Long studentId);
    List<QuizAttempt> findTop10ByQuizCourseLecturerIdOrderBySubmittedAtDesc(Long lecturerId);
    List<QuizAttempt> findByQuizCourseLecturerIdOrderBySubmittedAtDesc(Long lecturerId);
    List<QuizAttempt> findByQuizIdAndQuizCourseLecturerIdOrderBySubmittedAtDesc(Long quizId, Long lecturerId);
    List<QuizAttempt> findByQuizCourseIdAndStudentId(Long courseId, Long studentId);
    void deleteByQuizId(Long quizId);
    void deleteByQuizCourseId(Long courseId);
}
