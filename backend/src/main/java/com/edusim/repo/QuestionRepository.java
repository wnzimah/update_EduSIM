package com.edusim.repo;

import com.edusim.model.Question;
import com.edusim.model.QuestionType;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByQuizIdOrderBySortOrder(Long quizId);
    void deleteByQuizId(Long quizId);
    void deleteByQuizCourseId(Long courseId);

    @Query("""
        select count(distinct q.quiz.id)
        from Question q
        where q.quiz.course.lecturer.id = :lecturerId
          and q.questionType = :questionType
          and q.prompt = :prompt
    """)
    long countDistinctQuizUsage(
        @Param("lecturerId") Long lecturerId,
        @Param("questionType") QuestionType questionType,
        @Param("prompt") String prompt
    );
}
