package com.edusim.repo;

import com.edusim.model.QuestionBankItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionBankItemRepository extends JpaRepository<QuestionBankItem, Long> {
    List<QuestionBankItem> findByCourseLecturerId(Long lecturerId);
    List<QuestionBankItem> findByCourseIdAndCourseLecturerId(Long courseId, Long lecturerId);
    Optional<QuestionBankItem> findByIdAndCourseLecturerId(Long id, Long lecturerId);
    List<QuestionBankItem> findByIdInAndCourseLecturerId(List<Long> ids, Long lecturerId);
    void deleteByCourseId(Long courseId);
}
