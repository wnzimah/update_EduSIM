package com.edusim.controller;

import com.edusim.dto.LecturerDtos.CourseRequest;
import com.edusim.dto.LecturerDtos.MarkAdjustmentRequest;
import com.edusim.dto.LecturerDtos.MaterialRequest;
import com.edusim.dto.LecturerDtos.PublishRequest;
import com.edusim.dto.LecturerDtos.QuestionBankRequest;
import com.edusim.dto.LecturerDtos.QuizRequest;
import com.edusim.dto.LecturerDtos.VideoRequest;
import com.edusim.model.DifficultyLevel;
import com.edusim.model.QuestionType;
import com.edusim.model.UserAccount;
import com.edusim.service.AuthService;
import com.edusim.service.LecturerService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lecturer")
@PreAuthorize("hasRole('LECTURER')")
public class LecturerController {

    private final LecturerService lecturerService;
    private final AuthService authService;

    public LecturerController(LecturerService lecturerService, AuthService authService) {
        this.lecturerService = lecturerService;
        this.authService = authService;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.dashboard(lecturer);
    }

    @GetMapping("/courses")
    public List<Map<String, Object>> courses(Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.getCourses(lecturer);
    }

    @PostMapping("/courses")
    public Map<String, Object> createCourse(@Valid @RequestBody CourseRequest request, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.createCourse(request, lecturer);
    }

    @PutMapping("/courses/{courseId}")
    public Map<String, Object> updateCourse(
        @PathVariable Long courseId,
        @Valid @RequestBody CourseRequest request,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.updateCourse(courseId, request, lecturer);
    }

    @DeleteMapping("/courses/{courseId}")
    public Map<String, Object> deleteCourse(@PathVariable Long courseId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.deleteCourse(courseId, lecturer);
    }

    @PostMapping("/courses/{courseId}/videos")
    public Map<String, Object> addVideo(
        @PathVariable Long courseId,
        @Valid @RequestBody VideoRequest request,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.addVideo(courseId, request, lecturer);
    }

    @GetMapping("/courses/{courseId}/content")
    public Map<String, Object> courseContent(@PathVariable Long courseId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.getCourseContent(courseId, lecturer);
    }

    @PutMapping("/videos/{videoId}")
    public Map<String, Object> updateVideo(
        @PathVariable Long videoId,
        @Valid @RequestBody VideoRequest request,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.updateVideo(videoId, request, lecturer);
    }

    @DeleteMapping("/videos/{videoId}")
    public Map<String, Object> deleteVideo(@PathVariable Long videoId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.deleteVideo(videoId, lecturer);
    }

    @PostMapping("/videos/{videoId}/duplicate")
    public Map<String, Object> duplicateVideo(@PathVariable Long videoId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.duplicateVideo(videoId, lecturer);
    }

    @PostMapping("/courses/{courseId}/materials")
    public Map<String, Object> addMaterial(
        @PathVariable Long courseId,
        @Valid @RequestBody MaterialRequest request,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.addMaterial(courseId, request, lecturer);
    }

    @PutMapping("/materials/{materialId}")
    public Map<String, Object> updateMaterial(
        @PathVariable Long materialId,
        @Valid @RequestBody MaterialRequest request,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.updateMaterial(materialId, request, lecturer);
    }

    @DeleteMapping("/materials/{materialId}")
    public Map<String, Object> deleteMaterial(@PathVariable Long materialId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.deleteMaterial(materialId, lecturer);
    }

    @PostMapping("/materials/{materialId}/duplicate")
    public Map<String, Object> duplicateMaterial(@PathVariable Long materialId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.duplicateMaterial(materialId, lecturer);
    }

    @GetMapping("/question-bank")
    public List<Map<String, Object>> questionBank(
        @RequestParam(required = false) Long courseId,
        @RequestParam(required = false) String topicTag,
        @RequestParam(required = false) DifficultyLevel difficultyLevel,
        @RequestParam(required = false) QuestionType questionType,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdFrom,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdTo,
        @RequestParam(required = false) String search,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.getQuestionBank(
            lecturer,
            courseId,
            topicTag,
            difficultyLevel,
            questionType,
            createdFrom,
            createdTo,
            search
        );
    }

    @PostMapping("/question-bank")
    public Map<String, Object> addQuestionBank(
        @Valid @RequestBody QuestionBankRequest request,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.addQuestionBank(request, lecturer);
    }

    @PutMapping("/question-bank/{questionBankId}")
    public Map<String, Object> updateQuestionBank(
        @PathVariable Long questionBankId,
        @Valid @RequestBody QuestionBankRequest request,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.updateQuestionBank(questionBankId, request, lecturer);
    }

    @DeleteMapping("/question-bank/{questionBankId}")
    public Map<String, Object> deleteQuestionBank(@PathVariable Long questionBankId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.deleteQuestionBank(questionBankId, lecturer);
    }

    @PostMapping("/quizzes")
    public Map<String, Object> createQuiz(@Valid @RequestBody QuizRequest request, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.createQuiz(request, lecturer);
    }

    @GetMapping("/quizzes")
    public List<Map<String, Object>> quizzes(
        @RequestParam(required = false) Long courseId,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.getQuizzes(lecturer, courseId);
    }

    @PatchMapping("/quizzes/{quizId}/publish")
    public Map<String, Object> publishQuiz(
        @PathVariable Long quizId,
        @Valid @RequestBody PublishRequest request,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.publishQuiz(quizId, request, lecturer);
    }

    @PostMapping("/quizzes/{quizId}/duplicate")
    public Map<String, Object> duplicateQuiz(@PathVariable Long quizId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.duplicateQuiz(quizId, lecturer);
    }

    @DeleteMapping("/quizzes/{quizId}")
    public Map<String, Object> deleteQuiz(@PathVariable Long quizId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.deleteQuiz(quizId, lecturer);
    }

    @GetMapping("/quizzes/{quizId}/preview")
    public Map<String, Object> previewQuiz(@PathVariable Long quizId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.previewQuiz(quizId, lecturer);
    }

    @GetMapping("/results")
    public List<Map<String, Object>> results(
        @RequestParam(required = false) Long quizId,
        @RequestParam(required = false) Long courseId,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.getResults(lecturer, quizId, courseId);
    }

    @GetMapping("/results/{attemptId}")
    public Map<String, Object> resultDetail(@PathVariable Long attemptId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.getResultDetail(lecturer, attemptId);
    }

    @PatchMapping("/results/answers/{answerId}/adjust")
    public Map<String, Object> adjustScore(
        @PathVariable Long answerId,
        @Valid @RequestBody MarkAdjustmentRequest request,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.adjustAnswerScore(lecturer, answerId, request);
    }
}
