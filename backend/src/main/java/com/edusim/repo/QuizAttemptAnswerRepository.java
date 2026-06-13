package com.edusim.repo;

import com.edusim.model.QuestionType;
import com.edusim.model.QuizAttemptAnswer;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuizAttemptAnswerRepository extends JpaRepository<QuizAttemptAnswer, Long> {
    List<QuizAttemptAnswer> findByAttemptId(Long attemptId);
    List<QuizAttemptAnswer> findByAttemptIdIn(List<Long> attemptIds);
    Optional<QuizAttemptAnswer> findByIdAndAttemptQuizCourseLecturerId(Long answerId, Long lecturerId);
    void deleteByAttemptIdIn(List<Long> attemptIds);
    void deleteByAttemptQuizId(Long quizId);
    void deleteByAttemptQuizCourseId(Long courseId);

    @Query("""
        select max(a.attempt.submittedAt)
        from QuizAttemptAnswer a
        where a.question.quiz.course.lecturer.id = :lecturerId
          and a.question.questionType = :questionType
          and a.question.prompt = :prompt
    """)
    LocalDateTime findLastUsedAt(
        @Param("lecturerId") Long lecturerId,
        @Param("questionType") QuestionType questionType,
        @Param("prompt") String prompt
    );
}
