package com.edusim.controller;

import com.edusim.dto.LecturerDtos.CourseRequest;
import com.edusim.dto.LecturerDtos.CourseStudentRequest;
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
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
import org.springframework.web.multipart.MultipartFile;

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

    @GetMapping("/courses/{courseId}/students")
    public List<Map<String, Object>> courseStudents(@PathVariable Long courseId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.getCourseStudents(courseId, lecturer);
    }

    @PostMapping("/courses/{courseId}/students")
    public Map<String, Object> addCourseStudent(
        @PathVariable Long courseId,
        @Valid @RequestBody CourseStudentRequest request,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.addCourseStudent(courseId, request, lecturer);
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

    @PostMapping(
        value = {"/question-bank/import", "/question-bank/document-import", "/question-bank/document-import/upload"},
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public Map<String, Object> importQuestionBank(
        @RequestParam Long courseId,
        @RequestParam MultipartFile file,
        @RequestParam(required = false) String topicTag,
        @RequestParam(required = false) DifficultyLevel difficultyLevel,
        @RequestParam(required = false) QuestionType questionType,
        @RequestParam(defaultValue = "5") Integer questionCount,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.importQuestionBank(courseId, file, topicTag, difficultyLevel, questionType, questionCount, lecturer);
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

    @PutMapping("/quizzes/{quizId}")
    public Map<String, Object> updateQuiz(
        @PathVariable Long quizId,
        @Valid @RequestBody QuizRequest request,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.updateQuiz(quizId, request, lecturer);
    }

    @GetMapping("/quizzes")
    public List<Map<String, Object>> quizzes(
        @RequestParam(required = false) Long courseId,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.getQuizzes(lecturer, courseId);
    }

    @GetMapping("/quizzes/import-template")
    public ResponseEntity<byte[]> quizImportTemplate() {
        return csvDownload(
            "edusim-quiz-import-template.csv",
            lecturerService.quizImportTemplate()
        );
    }

    @GetMapping("/quizzes/export")
    public ResponseEntity<byte[]> exportQuizzes(
        @RequestParam(required = false) Long courseId,
        @RequestParam(required = false) Long quizId,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return csvDownload(
            "edusim-quiz-backup.csv",
            lecturerService.exportQuizzes(lecturer, courseId, quizId)
        );
    }

    @PostMapping("/quizzes/import")
    public Map<String, Object> importQuizBackup(
        @RequestParam Long courseId,
        @RequestParam MultipartFile file,
        @RequestParam(defaultValue = "false") boolean deleteExistingQuestions,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.importQuizBackup(courseId, file, deleteExistingQuestions, lecturer);
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

    @PatchMapping("/quizzes/{quizId}/release-result")
    public Map<String, Object> releaseQuizResult(@PathVariable Long quizId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.releaseQuizResult(quizId, lecturer);
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

    @GetMapping("/reset-requests")
    public List<Map<String, Object>> resetRequests(Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.getResetRequests(lecturer);
    }

    @PatchMapping("/reset-requests/{requestId}/approve")
    public Map<String, Object> approveResetRequest(@PathVariable Long requestId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.approveResetRequest(lecturer, requestId);
    }

    @PatchMapping("/reset-requests/{requestId}/reject")
    public Map<String, Object> rejectResetRequest(@PathVariable Long requestId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.rejectResetRequest(lecturer, requestId);
    }

    @DeleteMapping("/reset-requests/{requestId}")
    public Map<String, Object> deleteResetRequest(@PathVariable Long requestId, Authentication authentication) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.deleteResetRequest(lecturer, requestId);
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

    @GetMapping("/assessment-insights")
    public Map<String, Object> assessmentInsights(
        @RequestParam(required = false) Long quizId,
        @RequestParam(required = false) Long courseId,
        Authentication authentication
    ) {
        UserAccount lecturer = authService.getCurrentUser(authentication);
        return lecturerService.getAssessmentInsights(lecturer, quizId, courseId);
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

    private ResponseEntity<byte[]> csvDownload(String fileName, byte[] bytes) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(bytes);
    }
}
