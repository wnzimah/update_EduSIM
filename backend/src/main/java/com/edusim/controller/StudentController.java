package com.edusim.controller;

import com.edusim.dto.StudentDtos.SubmitQuizRequest;
import com.edusim.dto.StudentDtos.LessonProgressRequest;
import com.edusim.dto.StudentDtos.VideoCommentRequest;
import com.edusim.model.UserAccount;
import com.edusim.service.AuthService;
import com.edusim.service.StudentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasRole('STUDENT')")
public class StudentController {

    private final StudentService studentService;
    private final AuthService authService;

    public StudentController(StudentService studentService, AuthService authService) {
        this.studentService = studentService;
        this.authService = authService;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(Authentication authentication) {
        UserAccount student = authService.getCurrentUser(authentication);
        return studentService.getDashboard(student);
    }

    @GetMapping("/courses/{courseId}")
    public Map<String, Object> courseDetails(@PathVariable Long courseId, Authentication authentication) {
        UserAccount student = authService.getCurrentUser(authentication);
        return studentService.getCourseDetails(courseId, student);
    }

    @PostMapping("/videos/{videoId}/complete")
    public Map<String, Object> completeVideo(@PathVariable Long videoId, Authentication authentication) {
        UserAccount student = authService.getCurrentUser(authentication);
        return studentService.completeVideo(videoId, student);
    }

    @PostMapping("/lessons/{lessonId}/progress")
    public Map<String, Object> updateLessonProgress(
        @PathVariable Long lessonId,
        @RequestBody LessonProgressRequest request,
        Authentication authentication
    ) {
        UserAccount student = authService.getCurrentUser(authentication);
        return studentService.updateLessonProgress(lessonId, request, student);
    }

    @PostMapping("/lessons/{lessonId}/notes/open")
    public Map<String, Object> openLessonNotes(@PathVariable Long lessonId, Authentication authentication) {
        UserAccount student = authService.getCurrentUser(authentication);
        return studentService.openLessonNotes(lessonId, student);
    }

    @GetMapping("/videos/{videoId}/comments")
    public List<Map<String, Object>> videoComments(@PathVariable Long videoId, Authentication authentication) {
        UserAccount student = authService.getCurrentUser(authentication);
        return studentService.getVideoComments(videoId, student);
    }

    @PostMapping("/videos/{videoId}/comments")
    public Map<String, Object> addVideoComment(
        @PathVariable Long videoId,
        @Valid @RequestBody VideoCommentRequest request,
        Authentication authentication
    ) {
        UserAccount student = authService.getCurrentUser(authentication);
        return studentService.addVideoComment(videoId, request, student);
    }

    @PostMapping("/courses/{courseId}/reset-request")
    public Map<String, Object> requestCourseReset(@PathVariable Long courseId, Authentication authentication) {
        UserAccount student = authService.getCurrentUser(authentication);
        return studentService.requestCourseReset(courseId, student);
    }

    @PostMapping("/quizzes/{quizId}/start")
    public Map<String, Object> startQuiz(@PathVariable Long quizId, Authentication authentication) {
        UserAccount student = authService.getCurrentUser(authentication);
        return studentService.startQuiz(quizId, student);
    }

    @PostMapping("/quizzes/{quizId}/submit")
    public Map<String, Object> submitQuiz(
        @PathVariable Long quizId,
        @Valid @RequestBody SubmitQuizRequest request,
        Authentication authentication
    ) {
        UserAccount student = authService.getCurrentUser(authentication);
        return studentService.submitQuiz(quizId, request, student);
    }

    @GetMapping("/attempts")
    public List<Map<String, Object>> attempts(Authentication authentication) {
        UserAccount student = authService.getCurrentUser(authentication);
        return studentService.getAttemptHistory(student);
    }

    @GetMapping("/attempts/{attemptId}")
    public Map<String, Object> attempt(@PathVariable Long attemptId, Authentication authentication) {
        UserAccount student = authService.getCurrentUser(authentication);
        return studentService.getAttemptResult(attemptId, student);
    }

    @GetMapping("/attempts/{attemptId}/ai-feedback")
    public Map<String, Object> aiFeedback(@PathVariable Long attemptId, Authentication authentication) {
        UserAccount student = authService.getCurrentUser(authentication);
        return studentService.getAiFeedback(attemptId, student);
    }
}
