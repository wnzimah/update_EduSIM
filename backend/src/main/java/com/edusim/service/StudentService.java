package com.edusim.service;

import com.edusim.dto.StudentDtos.SubmitQuizRequest;
import com.edusim.model.Course;
import com.edusim.model.CourseMaterial;
import com.edusim.model.Enrollment;
import com.edusim.model.FeedbackViewLog;
import com.edusim.model.LessonVideo;
import com.edusim.model.Question;
import com.edusim.model.QuestionType;
import com.edusim.model.Quiz;
import com.edusim.model.QuizDisplayMode;
import com.edusim.model.QuizAttempt;
import com.edusim.model.QuizAttemptAnswer;
import com.edusim.model.UserAccount;
import com.edusim.model.VideoProgress;
import com.edusim.repo.CourseMaterialRepository;
import com.edusim.repo.CourseRepository;
import com.edusim.repo.EnrollmentRepository;
import com.edusim.repo.FeedbackViewLogRepository;
import com.edusim.repo.LessonVideoRepository;
import com.edusim.repo.QuestionRepository;
import com.edusim.repo.QuizAttemptAnswerRepository;
import com.edusim.repo.QuizAttemptRepository;
import com.edusim.repo.QuizRepository;
import com.edusim.repo.VideoProgressRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Collections;
import java.util.Objects;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentService {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final LessonVideoRepository lessonVideoRepository;
    private final VideoProgressRepository videoProgressRepository;
    private final CourseMaterialRepository courseMaterialRepository;
    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAttemptAnswerRepository quizAttemptAnswerRepository;
    private final FeedbackViewLogRepository feedbackViewLogRepository;
    private final ObjectMapper objectMapper;

    public StudentService(
        EnrollmentRepository enrollmentRepository,
        CourseRepository courseRepository,
        LessonVideoRepository lessonVideoRepository,
        VideoProgressRepository videoProgressRepository,
        CourseMaterialRepository courseMaterialRepository,
        QuizRepository quizRepository,
        QuestionRepository questionRepository,
        QuizAttemptRepository quizAttemptRepository,
        QuizAttemptAnswerRepository quizAttemptAnswerRepository,
        FeedbackViewLogRepository feedbackViewLogRepository,
        ObjectMapper objectMapper
    ) {
        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
        this.lessonVideoRepository = lessonVideoRepository;
        this.videoProgressRepository = videoProgressRepository;
        this.courseMaterialRepository = courseMaterialRepository;
        this.quizRepository = quizRepository;
        this.questionRepository = questionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.quizAttemptAnswerRepository = quizAttemptAnswerRepository;
        this.feedbackViewLogRepository = feedbackViewLogRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboard(UserAccount student) {
        List<Enrollment> enrollments = enrollmentRepository.findByStudentId(student.getId());
        List<Map<String, Object>> courseSummaries = new ArrayList<>();
        List<Map<String, Object>> pendingVideos = new ArrayList<>();
        List<Map<String, Object>> quizCards = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (Enrollment enrollment : enrollments) {
            Course course = enrollment.getCourse();
            List<LessonVideo> videos = lessonVideoRepository.findByCourseIdOrderBySortOrder(course.getId());
            Map<Long, Boolean> completionMap = toCompletionMap(
                videoProgressRepository.findByStudentIdAndVideoCourseId(student.getId(), course.getId())
            );
            long totalMandatory = videos.stream().filter(LessonVideo::isMandatory).count();
            long completedMandatory = videos.stream()
                .filter(LessonVideo::isMandatory)
                .filter(video -> completionMap.getOrDefault(video.getId(), false))
                .count();
            double progress = totalMandatory == 0 ? 100.0 : (completedMandatory * 100.0) / totalMandatory;

            courseSummaries.add(Map.of(
                "courseId", course.getId(),
                "title", course.getTitle(),
                "progress", round2(progress),
                "mandatoryCompleted", completedMandatory,
                "mandatoryTotal", totalMandatory
            ));

            for (LessonVideo video : videos) {
                if (!completionMap.getOrDefault(video.getId(), false)) {
                    pendingVideos.add(Map.of(
                        "videoId", video.getId(),
                        "courseId", course.getId(),
                        "courseTitle", course.getTitle(),
                        "title", video.getTitle(),
                        "durationMinutes", video.getDurationMinutes()
                    ));
                }
            }

            List<Quiz> quizzes = quizRepository.findByCourseIdAndPublishedTrue(course.getId());
            for (Quiz quiz : quizzes) {
                AttemptAvailability attemptAvailability = attemptAvailability(quiz, student.getId());
                String lockReason = lockReasonForQuiz(quiz, completedMandatory, totalMandatory, now);
                if (lockReason.isBlank() && !attemptAvailability.canAttempt()) {
                    lockReason = attemptAvailability.message();
                }
                boolean locked = !lockReason.isBlank();
                Map<String, Object> quizCard = new LinkedHashMap<>();
                quizCard.put("quizId", quiz.getId());
                quizCard.put("title", quiz.getTitle());
                quizCard.put("courseId", course.getId());
                quizCard.put("courseTitle", course.getTitle());
                quizCard.put("locked", locked);
                quizCard.put("lockReason", lockReason);
                quizCard.put("timeLimitMinutes", quiz.getTimeLimitMinutes());
                quizCard.put("maxAttempts", quiz.getMaxAttempts());
                quizCard.put("attemptsUsed", attemptAvailability.attemptsUsed());
                quizCard.put("attemptsRemaining", attemptAvailability.attemptsRemaining());
                quizCard.put("alreadySubmitted", attemptAvailability.alreadySubmitted());
                quizCard.put("canAttempt", !locked);
                quizCard.put("passingMark", quiz.getPassingMark());
                quizCard.put("openAt", quiz.getOpenAt());
                quizCard.put("closeAt", quiz.getCloseAt());
                quizCard.put("resultReleaseAt", effectiveResultReleaseAt(quiz));
                quizCard.put("displayMode", displayModeOrDefault(quiz).name());
                quizCards.add(quizCard);
            }
        }

        List<QuizAttempt> submittedAttempts = quizAttemptRepository.findByStudentIdOrderBySubmittedAtDesc(student.getId())
            .stream()
            .filter(attempt -> attempt.getSubmittedAt() != null)
            .toList();

        Map<Long, FeedbackViewLog> feedbackLogMap = feedbackLogMap(
            student.getId(),
            submittedAttempts.stream().map(QuizAttempt::getId).toList()
        );

        List<Map<String, Object>> latestResults = submittedAttempts.stream()
            .limit(5)
            .map(attempt -> toAttemptSummary(
                attempt,
                canRevealResult(attempt.getQuiz(), now),
                feedbackLogMap.get(attempt.getId())
            ))
            .toList();

        List<Map<String, Object>> resultNotifications = submittedAttempts.stream()
            .filter(attempt -> !attempt.getQuiz().isShowResultImmediately())
            .filter(attempt -> canRevealResult(attempt.getQuiz(), now))
            .filter(attempt -> !feedbackLogMap.containsKey(attempt.getId()))
            .limit(8)
            .map(attempt -> {
                Map<String, Object> notification = new LinkedHashMap<>();
                notification.put("attemptId", attempt.getId());
                notification.put("quizId", attempt.getQuiz().getId());
                notification.put("quizTitle", attempt.getQuiz().getTitle());
                notification.put("courseId", attempt.getQuiz().getCourse().getId());
                notification.put("courseTitle", attempt.getQuiz().getCourse().getTitle());
                notification.put("releaseAt", effectiveResultReleaseAt(attempt.getQuiz()));
                notification.put("message", "Result is now available for review.");
                return notification;
            })
            .toList();

        return Map.of(
            "student", Map.of(
                "id", student.getId(),
                "name", student.getFullName(),
                "email", student.getEmail()
            ),
            "courses", courseSummaries,
            "pendingVideos", pendingVideos,
            "availableQuizzes", quizCards,
            "latestResults", latestResults,
            "resultNotifications", resultNotifications
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getCourseDetails(Long courseId, UserAccount student) {
        ensureEnrolled(student.getId(), courseId);
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Course not found"));

        List<LessonVideo> videos = lessonVideoRepository.findByCourseIdOrderBySortOrder(courseId);
        Map<Long, Boolean> completionMap = toCompletionMap(
            videoProgressRepository.findByStudentIdAndVideoCourseId(student.getId(), courseId)
        );

        long totalMandatory = videos.stream().filter(LessonVideo::isMandatory).count();
        long completedMandatory = videos.stream()
            .filter(LessonVideo::isMandatory)
            .filter(video -> completionMap.getOrDefault(video.getId(), false))
            .count();

        List<Map<String, Object>> lessonData = videos.stream().map(video -> Map.<String, Object>of(
            "videoId", video.getId(),
            "title", video.getTitle(),
            "description", video.getDescription(),
            "durationMinutes", video.getDurationMinutes(),
            "sortOrder", video.getSortOrder(),
            "mandatory", video.isMandatory(),
            "completed", completionMap.getOrDefault(video.getId(), false),
            "videoUrl", video.getVideoUrl()
        )).toList();

        List<Map<String, Object>> materials = courseMaterialRepository.findByCourseId(courseId)
            .stream()
            .map(material -> Map.<String, Object>of(
                "materialId", material.getId(),
                "title", material.getTitle(),
                "materialType", material.getMaterialType(),
                "resourceUrl", material.getResourceUrl()
            ))
            .toList();

        List<Map<String, Object>> quizzes = quizRepository.findByCourseIdAndPublishedTrue(courseId)
            .stream()
            .map(quiz -> {
                AttemptAvailability attemptAvailability = attemptAvailability(quiz, student.getId());
                String lockReason = lockReasonForQuiz(quiz, completedMandatory, totalMandatory, LocalDateTime.now());
                if (lockReason.isBlank() && !attemptAvailability.canAttempt()) {
                    lockReason = attemptAvailability.message();
                }
                boolean locked = !lockReason.isBlank();
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("quizId", quiz.getId());
                row.put("title", quiz.getTitle());
                row.put("description", quiz.getDescription() == null ? "" : quiz.getDescription());
                row.put("timeLimitMinutes", quiz.getTimeLimitMinutes());
                row.put("maxAttempts", quiz.getMaxAttempts());
                row.put("attemptsUsed", attemptAvailability.attemptsUsed());
                row.put("attemptsRemaining", attemptAvailability.attemptsRemaining());
                row.put("alreadySubmitted", attemptAvailability.alreadySubmitted());
                row.put("canAttempt", !locked);
                row.put("passingMark", quiz.getPassingMark());
                row.put("locked", locked);
                row.put("lockReason", lockReason);
                row.put("openAt", quiz.getOpenAt());
                row.put("closeAt", quiz.getCloseAt());
                row.put("displayMode", displayModeOrDefault(quiz).name());
                row.put("showResultImmediately", quiz.isShowResultImmediately());
                row.put("resultReleaseAt", effectiveResultReleaseAt(quiz));
                return row;
            })
            .toList();

        return Map.of(
            "course", Map.of(
                "id", course.getId(),
                "title", course.getTitle(),
                "description", course.getDescription()
            ),
            "progress", Map.of(
                "mandatoryCompleted", completedMandatory,
                "mandatoryTotal", totalMandatory,
                "percent", totalMandatory == 0 ? 100.0 : round2(completedMandatory * 100.0 / totalMandatory)
            ),
            "videos", lessonData,
            "materials", materials,
            "quizzes", quizzes
        );
    }

    @Transactional
    public Map<String, Object> completeVideo(Long videoId, UserAccount student) {
        LessonVideo video = lessonVideoRepository.findById(videoId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Video not found"));
        ensureEnrolled(student.getId(), video.getCourse().getId());

        VideoProgress progress = videoProgressRepository.findByStudentIdAndVideoId(student.getId(), videoId)
            .orElseGet(VideoProgress::new);
        progress.setStudent(student);
        progress.setVideo(video);
        progress.setCompleted(true);
        progress.setLastPositionSeconds(video.getDurationMinutes() * 60);
        progress.setUpdatedAt(LocalDateTime.now());
        videoProgressRepository.save(progress);

        return Map.of(
            "message", "Video marked as completed",
            "videoId", videoId
        );
    }

    @Transactional
    public Map<String, Object> startQuiz(Long quizId, UserAccount student) {
        Quiz quiz = quizRepository.findById(quizId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Quiz not found"));
        if (!quiz.isPublished()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Quiz is not published yet");
        }

        ensureEnrolled(student.getId(), quiz.getCourse().getId());

        long totalMandatory = lessonVideoRepository.findByCourseIdAndMandatoryTrue(quiz.getCourse().getId()).size();
        long completedMandatory = totalMandatory == 0 ? 0 : videoProgressRepository
            .findByStudentIdAndVideoCourseId(student.getId(), quiz.getCourse().getId())
            .stream()
            .filter(VideoProgress::isCompleted)
            .filter(progress -> progress.getVideo().isMandatory())
            .count();
        String lockReason = lockReasonForQuiz(quiz, completedMandatory, totalMandatory, LocalDateTime.now());
        if (!lockReason.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, lockReason);
        }

        long attemptsUsed = quizAttemptRepository.countByQuizIdAndStudentId(quizId, student.getId());
        if (attemptsUsed >= quiz.getMaxAttempts()) {
            boolean alreadySubmitted = quizAttemptRepository
                .existsByQuizIdAndStudentIdAndSubmittedAtIsNotNull(quizId, student.getId());
            if (alreadySubmitted) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Your quiz is already answered.");
            }
            throw new ApiException(HttpStatus.BAD_REQUEST, "Maximum attempts reached.");
        }

        QuizAttempt attempt = new QuizAttempt();
        attempt.setQuiz(quiz);
        attempt.setStudent(student);
        attempt.setAttemptNumber((int) attemptsUsed + 1);
        attempt.setStartedAt(LocalDateTime.now());
        quizAttemptRepository.save(attempt);

        List<Question> questionsToServe = new ArrayList<>(questionRepository.findByQuizIdOrderBySortOrder(quizId));
        if (questionsToServe.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Quiz has no questions yet. Please contact your lecturer.");
        }
        if (quiz.isShuffleQuestions()) {
            shuffleInPlace(questionsToServe);
        }

        List<Map<String, Object>> questions = questionsToServe
            .stream()
            .map(question -> toQuestionForStudent(question, quiz))
            .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("attemptId", attempt.getId());
        response.put("quizId", quiz.getId());
        response.put("title", quiz.getTitle());
        response.put("description", quiz.getDescription() == null ? "" : quiz.getDescription());
        response.put("timeLimitMinutes", quiz.getTimeLimitMinutes());
        response.put("attemptNumber", attempt.getAttemptNumber());
        response.put("displayMode", displayModeOrDefault(quiz).name());
        response.put("showResultImmediately", quiz.isShowResultImmediately());
        response.put("resultReleaseAt", effectiveResultReleaseAt(quiz));
        response.put("openAt", quiz.getOpenAt());
        response.put("closeAt", quiz.getCloseAt());
        response.put("questions", questions);
        return response;
    }

    @Transactional
    public Map<String, Object> submitQuiz(Long quizId, SubmitQuizRequest request, UserAccount student) {
        Quiz quiz = quizRepository.findById(quizId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Quiz not found"));
        QuizAttempt attempt = quizAttemptRepository.findByIdAndStudentId(request.attemptId(), student.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Attempt not found"));

        if (!attempt.getQuiz().getId().equals(quiz.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Attempt does not belong to this quiz");
        }
        if (attempt.getSubmittedAt() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Your quiz is already answered.");
        }

        List<Question> questions = questionRepository.findByQuizIdOrderBySortOrder(quizId);
        double totalPoints = 0.0;
        double awardedPoints = 0.0;
        int correctCount = 0;

        List<QuizAttemptAnswer> answerRows = new ArrayList<>();
        List<Map<String, Object>> answerReview = new ArrayList<>();

        for (Question question : questions) {
            totalPoints += question.getPoints();
            Object submitted = request.answers().get(String.valueOf(question.getId()));
            GradingResult grading = gradeAnswer(question, submitted);
            boolean correct = grading.correct();
            double earned = grading.awardedPoints();
            if (correct) {
                correctCount++;
            }
            awardedPoints += earned;

            QuizAttemptAnswer answer = new QuizAttemptAnswer();
            answer.setAttempt(attempt);
            answer.setQuestion(question);
            answer.setCorrect(correct);
            answer.setAwardedPoints(earned);
            answer.setAnswerJson(writeSafeJson(submitted));
            answerRows.add(answer);

            answerReview.add(toAnswerReviewRow(question, submitted, correct, earned));
        }

        double score = totalPoints == 0 ? 0.0 : (awardedPoints * 100.0 / totalPoints);
        boolean passed = score >= quiz.getPassingMark();
        String feedback = buildFeedback(score);

        LocalDateTime now = LocalDateTime.now();
        attempt.setSubmittedAt(now);
        attempt.setScore(round2(score));
        attempt.setPassed(passed);
        attempt.setFeedback(feedback);
        quizAttemptRepository.save(attempt);
        quizAttemptAnswerRepository.saveAll(answerRows);

        boolean canRevealNow = canRevealResult(quiz, now);
        LocalDateTime releaseAt = effectiveResultReleaseAt(quiz);
        FeedbackViewLog feedbackLog = canRevealNow ? recordFeedbackView(attempt, student, now) : null;
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("attemptId", attempt.getId());
        response.put("quizId", quiz.getId());
        response.put("quizTitle", quiz.getTitle());
        response.put("resultReleased", canRevealNow);
        response.put("releaseAt", releaseAt);
        response.put("score", canRevealNow ? round2(score) : null);
        response.put("passed", canRevealNow ? passed : null);
        response.put("correctCount", canRevealNow ? correctCount : null);
        response.put("totalQuestions", questions.size());
        response.put("feedback", canRevealNow ? feedback : "Result will be released by lecturer settings.");
        response.put("startedAt", attempt.getStartedAt());
        response.put("submittedAt", attempt.getSubmittedAt());
        response.put("durationSeconds", durationSeconds(attempt));
        response.put("showResultImmediately", quiz.isShowResultImmediately());
        response.put("answers", canRevealNow ? answerReview : List.of());
        response.put("feedbackViewed", feedbackLog != null);
        response.put("feedbackViewedAt", feedbackLog == null ? null : feedbackLog.getLastViewedAt());
        if (!canRevealNow) {
            response.put("resultNote", "Detailed answers will be available after release time.");
        }
        return response;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAttemptHistory(UserAccount student) {
        List<QuizAttempt> attempts = quizAttemptRepository.findByStudentIdOrderBySubmittedAtDesc(student.getId())
            .stream()
            .filter(attempt -> attempt.getSubmittedAt() != null)
            .toList();

        Map<Long, FeedbackViewLog> feedbackLogMap = feedbackLogMap(
            student.getId(),
            attempts.stream().map(QuizAttempt::getId).toList()
        );

        return attempts.stream()
            .map(attempt -> toAttemptSummary(
                attempt,
                canRevealResult(attempt.getQuiz(), LocalDateTime.now()),
                feedbackLogMap.get(attempt.getId())
            ))
            .toList();
    }

    @Transactional
    public Map<String, Object> getAttemptResult(Long attemptId, UserAccount student) {
        QuizAttempt attempt = quizAttemptRepository.findByIdAndStudentId(attemptId, student.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Attempt not found"));
        if (attempt.getSubmittedAt() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Attempt has not been submitted");
        }
        LocalDateTime now = LocalDateTime.now();
        boolean canReveal = canRevealResult(attempt.getQuiz(), now);
        LocalDateTime releaseAt = effectiveResultReleaseAt(attempt.getQuiz());
        FeedbackViewLog feedbackLog = canReveal ? recordFeedbackView(attempt, student, now) : null;

        List<Map<String, Object>> answers = canReveal
            ? quizAttemptAnswerRepository.findByAttemptId(attemptId)
                .stream()
                .map(answer -> {
                  Map<String, Object> row = new LinkedHashMap<>();
                  row.put("answerId", answer.getId());
                  row.put("questionId", answer.getQuestion().getId());
                  row.put("sortOrder", answer.getQuestion().getSortOrder());
                  row.put("prompt", answer.getQuestion().getPrompt());
                  row.put("questionType", answer.getQuestion().getQuestionType().name());
                  row.put("explanation", answer.getQuestion().getExplanation() == null ? "" : answer.getQuestion().getExplanation());
                  row.put("mediaUrl", answer.getQuestion().getMediaUrl() == null ? "" : answer.getQuestion().getMediaUrl());
                  row.put("mediaType", answer.getQuestion().getMediaType() == null ? "" : answer.getQuestion().getMediaType());
                  row.put("studentAnswer", parseJsonSafe(answer.getAnswerJson()));
                  row.put("correctAnswer", parseJsonSafe(answer.getQuestion().getCorrectAnswerJson()));
                  row.put("correct", answer.isCorrect());
                  row.put("awardedPoints", answer.getAwardedPoints());
                  row.put("maxPoints", answer.getQuestion().getPoints());
                  return row;
                })
                .toList()
            : Collections.emptyList();

        Map<String, Object> summary = toAttemptSummary(attempt, canReveal, feedbackLog);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("summary", summary);
        response.put("answers", answers);
        response.put("resultReleased", canReveal);
        response.put("releaseAt", releaseAt);
        return response;
    }

    private void ensureEnrolled(Long studentId, Long courseId) {
        if (!enrollmentRepository.existsByStudentIdAndCourseId(studentId, courseId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Student is not enrolled in this course");
        }
    }

    private String lockReasonForQuiz(Quiz quiz, long completedMandatory, long totalMandatory, LocalDateTime now) {
        if (quiz.getOpenAt() != null && now.isBefore(quiz.getOpenAt())) {
            return "Quiz is not open yet.";
        }
        if (quiz.getCloseAt() != null && now.isAfter(quiz.getCloseAt())) {
            return "Quiz is already closed.";
        }
        if (quiz.isUnlockAfterVideos() && totalMandatory > 0 && completedMandatory < totalMandatory) {
            return "Complete all mandatory videos first.";
        }
        return "";
    }

    private AttemptAvailability attemptAvailability(Quiz quiz, Long studentId) {
        long attemptsUsed = quizAttemptRepository.countByQuizIdAndStudentId(quiz.getId(), studentId);
        int maxAttempts = quiz.getMaxAttempts() == null ? 1 : Math.max(1, quiz.getMaxAttempts());
        long attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed);
        boolean alreadySubmitted = quizAttemptRepository
            .existsByQuizIdAndStudentIdAndSubmittedAtIsNotNull(quiz.getId(), studentId);

        if (attemptsRemaining <= 0) {
            String message = alreadySubmitted
                ? "Your quiz is already answered (maximum attempts reached)."
                : "Maximum attempts reached.";
            return new AttemptAvailability(attemptsUsed, attemptsRemaining, alreadySubmitted, false, message);
        }

        return new AttemptAvailability(attemptsUsed, attemptsRemaining, alreadySubmitted, true, "");
    }

    private record AttemptAvailability(
        long attemptsUsed,
        long attemptsRemaining,
        boolean alreadySubmitted,
        boolean canAttempt,
        String message
    ) {
    }

    private QuizDisplayMode displayModeOrDefault(Quiz quiz) {
        return quiz.getQuestionDisplayMode() == null ? QuizDisplayMode.ONE_BY_ONE : quiz.getQuestionDisplayMode();
    }

    private boolean canRevealResult(Quiz quiz, LocalDateTime now) {
        if (quiz.isShowResultImmediately()) {
            return true;
        }
        LocalDateTime releaseAt = effectiveResultReleaseAt(quiz);
        return releaseAt != null && !now.isBefore(releaseAt);
    }

    private LocalDateTime effectiveResultReleaseAt(Quiz quiz) {
        if (quiz.isShowResultImmediately()) {
            return null;
        }
        return quiz.getResultReleaseAt() != null ? quiz.getResultReleaseAt() : quiz.getCloseAt();
    }

    private FeedbackViewLog recordFeedbackView(QuizAttempt attempt, UserAccount student, LocalDateTime viewedAt) {
        FeedbackViewLog log = feedbackViewLogRepository
            .findByAttemptIdAndStudentId(attempt.getId(), student.getId())
            .orElseGet(() -> {
                FeedbackViewLog created = new FeedbackViewLog();
                created.setAttempt(attempt);
                created.setStudent(student);
                created.setFirstViewedAt(viewedAt);
                created.setViewCount(0);
                return created;
            });

        log.setLastViewedAt(viewedAt);
        int currentCount = log.getViewCount() == null ? 0 : log.getViewCount();
        log.setViewCount(currentCount + 1);
        return feedbackViewLogRepository.save(log);
    }

    private Map<Long, FeedbackViewLog> feedbackLogMap(Long studentId, List<Long> attemptIds) {
        if (attemptIds == null || attemptIds.isEmpty()) {
            return Map.of();
        }

        return feedbackViewLogRepository.findByStudentIdAndAttemptIdIn(studentId, attemptIds)
            .stream()
            .collect(java.util.stream.Collectors.toMap(
                log -> log.getAttempt().getId(),
                log -> log,
                (left, right) -> left,
                LinkedHashMap::new
            ));
    }

    private Map<Long, Boolean> toCompletionMap(List<VideoProgress> progressRows) {
        Map<Long, Boolean> map = new HashMap<>();
        for (VideoProgress row : progressRows) {
            map.put(row.getVideo().getId(), row.isCompleted());
        }
        return map;
    }

    private Map<String, Object> toQuestionForStudent(Question question, Quiz quiz) {
        Object options = parseJsonSafe(question.getOptionsJson());
        if (quiz.isShuffleAnswers()) {
            options = shuffleOptionsForQuestion(question.getQuestionType(), options);
        }

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("questionId", question.getId());
        row.put("questionType", question.getQuestionType().name());
        row.put("prompt", question.getPrompt());
        row.put("explanation", question.getExplanation() == null ? "" : question.getExplanation());
        row.put("mediaUrl", question.getMediaUrl() == null ? "" : question.getMediaUrl());
        row.put("mediaType", question.getMediaType() == null ? "" : question.getMediaType());
        row.put("points", question.getPoints());
        row.put("sortOrder", question.getSortOrder());
        row.put("options", options);
        return row;
    }

    private Map<String, Object> toAttemptSummary(QuizAttempt attempt) {
        return toAttemptSummary(attempt, canRevealResult(attempt.getQuiz(), LocalDateTime.now()), null);
    }

    private Map<String, Object> toAttemptSummary(QuizAttempt attempt, boolean canReveal) {
        return toAttemptSummary(attempt, canReveal, null);
    }

    private Map<String, Object> toAttemptSummary(QuizAttempt attempt, boolean canReveal, FeedbackViewLog feedbackLog) {
        List<Question> quizQuestions = questionRepository.findByQuizIdOrderBySortOrder(attempt.getQuiz().getId());
        int questionCount = quizQuestions.size();
        double maxScore = quizQuestions
            .stream()
            .mapToDouble(question -> question.getPoints() == null ? 0.0 : question.getPoints())
            .sum();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("attemptId", attempt.getId());
        summary.put("quizId", attempt.getQuiz().getId());
        summary.put("quizTitle", attempt.getQuiz().getTitle());
        summary.put("courseId", attempt.getQuiz().getCourse().getId());
        summary.put("courseTitle", attempt.getQuiz().getCourse().getTitle());
        summary.put("attemptNumber", attempt.getAttemptNumber());
        summary.put("startedAt", attempt.getStartedAt());
        summary.put("submittedAt", attempt.getSubmittedAt());
        summary.put("durationSeconds", durationSeconds(attempt));
        summary.put("questionCount", questionCount);
        summary.put("maxScore", round2(maxScore));
        summary.put("score", canReveal ? attempt.getScore() : null);
        summary.put("passed", canReveal ? attempt.getPassed() : null);
        summary.put("feedback", canReveal ? attempt.getFeedback() : "Result is pending release by lecturer.");
        summary.put("resultReleased", canReveal);
        summary.put("releaseAt", effectiveResultReleaseAt(attempt.getQuiz()));
        summary.put("feedbackViewed", feedbackLog != null);
        summary.put("feedbackViewedAt", feedbackLog == null ? null : feedbackLog.getLastViewedAt());
        summary.put("feedbackViewCount", feedbackLog == null ? 0 : feedbackLog.getViewCount());
        return summary;
    }

    private GradingResult gradeAnswer(Question question, Object submitted) {
        try {
            JsonNode expectedNode = objectMapper.readTree(question.getCorrectAnswerJson());
            return switch (question.getQuestionType()) {
                case MCQ, TRUE_FALSE -> gradeExactText(expectedNode, submitted, question.getPoints());
                case SHORT_ANSWER -> gradeShortAnswer(question, expectedNode, submitted);
                case MULTI_SELECT -> gradeMultiSelect(expectedNode, submitted, question.getPoints());
                case MATCHING -> gradeMatching(question, expectedNode, submitted);
            };
        } catch (Exception ex) {
            return new GradingResult(false, 0.0);
        }
    }

    private GradingResult gradeExactText(JsonNode expectedNode, Object submitted, int points) {
        boolean correct = normalize(expectedNode.asText()).equals(normalize(stringValue(submitted)));
        return new GradingResult(correct, correct ? points : 0.0);
    }

    private GradingResult gradeShortAnswer(Question question, JsonNode expectedNode, Object submitted) {
        String submittedText = normalize(stringValue(submitted));
        if (submittedText.isBlank()) {
            return new GradingResult(false, 0.0);
        }

        List<String> keywords = extractShortAnswerKeywords(question.getOptionsJson(), expectedNode);
        if (keywords.isEmpty()) {
            boolean correct = submittedText.equals(normalize(expectedNode.asText()));
            return new GradingResult(correct, correct ? question.getPoints() : 0.0);
        }

        int matched = 0;
        for (String keyword : keywords) {
            if (submittedText.contains(keyword)) {
                matched++;
            }
        }

        double fraction = keywords.isEmpty() ? 0.0 : ((double) matched / keywords.size());
        double awarded = round2(question.getPoints() * fraction);
        boolean correct = matched == keywords.size();
        return new GradingResult(correct, awarded);
    }

    private GradingResult gradeMultiSelect(JsonNode expectedNode, Object submitted, int points) {
        Set<String> expected = toNormalizedSet(expectedNode);
        Set<String> submittedSet = toNormalizedSet(objectMapper.valueToTree(submitted));
        if (expected.isEmpty() || submittedSet.isEmpty()) {
            return new GradingResult(false, 0.0);
        }

        int truePositive = 0;
        int falsePositive = 0;
        for (String value : submittedSet) {
            if (expected.contains(value)) {
                truePositive++;
            } else {
                falsePositive++;
            }
        }

        double fraction = Math.max(0.0, (truePositive - falsePositive) / (double) expected.size());
        double awarded = round2(points * fraction);
        boolean correct = falsePositive == 0 && truePositive == expected.size() && submittedSet.size() == expected.size();
        return new GradingResult(correct, awarded);
    }

    private GradingResult gradeMatching(Question question, JsonNode expectedNode, Object submitted) {
        Map<String, String> expected = toNormalizedMap(expectedNode);
        Map<String, String> submittedMap = toNormalizedMap(objectMapper.valueToTree(submitted));
        if (expected.isEmpty()) {
            return new GradingResult(false, 0.0);
        }

        int matchedPairs = 0;
        for (Map.Entry<String, String> entry : expected.entrySet()) {
            String submittedValue = submittedMap.get(entry.getKey());
            if (entry.getValue().equals(submittedValue)) {
                matchedPairs++;
            }
        }

        boolean partialMode = isMatchingPartialMode(question.getOptionsJson());
        double fraction = partialMode
            ? (matchedPairs / (double) expected.size())
            : (matchedPairs == expected.size() ? 1.0 : 0.0);
        double awarded = round2(question.getPoints() * fraction);
        boolean correct = matchedPairs == expected.size();
        return new GradingResult(correct, awarded);
    }

    private boolean isMatchingPartialMode(String optionsJson) {
        try {
            JsonNode optionsNode = objectMapper.readTree(optionsJson);
            String scoring = normalize(optionsNode.path("scoringType").asText("EXACT"));
            return Objects.equals(scoring, "partial");
        } catch (Exception ex) {
            return false;
        }
    }

    private List<String> extractShortAnswerKeywords(String optionsJson, JsonNode expectedNode) {
        List<String> keywords = new ArrayList<>();
        try {
            JsonNode optionsNode = objectMapper.readTree(optionsJson);
            JsonNode keywordNode = optionsNode.path("keywords");
            if (keywordNode.isArray()) {
                for (JsonNode item : keywordNode) {
                    String keyword = normalize(item.asText());
                    if (!keyword.isBlank()) {
                        keywords.add(keyword);
                    }
                }
            }
        } catch (Exception ignored) {
            // ignore malformed options json for backward compatibility
        }

        if (!keywords.isEmpty()) {
            return keywords.stream().distinct().toList();
        }

        if (expectedNode.isArray()) {
            for (JsonNode item : expectedNode) {
                String keyword = normalize(item.asText());
                if (!keyword.isBlank()) {
                    keywords.add(keyword);
                }
            }
            return keywords.stream().distinct().toList();
        }

        String expectedText = normalize(expectedNode.asText());
        if (!expectedText.isBlank()) {
            keywords.add(expectedText);
        }
        return keywords;
    }

    private Set<String> toNormalizedSet(JsonNode node) {
        Set<String> set = new HashSet<>();
        if (node == null || !node.isArray()) {
            return set;
        }
        for (JsonNode item : node) {
            set.add(normalize(item.asText()));
        }
        return set;
    }

    private Map<String, String> toNormalizedMap(JsonNode node) {
        Map<String, String> map = new HashMap<>();
        if (node == null || !node.isObject()) {
            return map;
        }
        node.fields().forEachRemaining(entry -> map.put(
            normalize(entry.getKey()),
            normalize(entry.getValue().asText())
        ));
        return map;
    }

    private Object shuffleOptionsForQuestion(QuestionType questionType, Object options) {
        if (options == null) {
            return null;
        }

        if (questionType == QuestionType.MCQ || questionType == QuestionType.TRUE_FALSE || questionType == QuestionType.MULTI_SELECT) {
            List<String> list = new ArrayList<>(toStringList(options));
            shuffleInPlace(list);
            return list;
        }

        if (questionType == QuestionType.MATCHING) {
            Map<String, Object> matching = toMatchingOptionMap(options);
            List<String> right = new ArrayList<>(toStringList(matching.get("right")));
            shuffleInPlace(right);
            matching.put("right", right);
            return matching;
        }

        return options;
    }

    private Map<String, Object> toMatchingOptionMap(Object options) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (options instanceof Map<?, ?> genericMap) {
            Object left = genericMap.get("left");
            Object right = genericMap.get("right");
            map.put("left", toStringList(left));
            map.put("right", toStringList(right));
            if (genericMap.containsKey("scoringType")) {
                map.put("scoringType", genericMap.get("scoringType"));
            }
            return map;
        }

        JsonNode node = objectMapper.valueToTree(options);
        map.put("left", toStringList(node.path("left")));
        map.put("right", toStringList(node.path("right")));
        if (node.has("scoringType")) {
            map.put("scoringType", node.path("scoringType").asText());
        }
        return map;
    }

    private List<String> toStringList(Object value) {
        List<String> list = new ArrayList<>();
        JsonNode node = objectMapper.valueToTree(value);
        if (!node.isArray()) {
            return list;
        }
        for (JsonNode item : node) {
            String text = item.asText();
            if (text != null) {
                list.add(text);
            }
        }
        return list;
    }

    private Map<String, Object> toAnswerReviewRow(Question question, Object submitted, boolean correct, double earned) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("questionId", question.getId());
        row.put("sortOrder", question.getSortOrder());
        row.put("questionType", question.getQuestionType().name());
        row.put("prompt", question.getPrompt());
        row.put("explanation", question.getExplanation() == null ? "" : question.getExplanation());
        row.put("mediaUrl", question.getMediaUrl() == null ? "" : question.getMediaUrl());
        row.put("mediaType", question.getMediaType() == null ? "" : question.getMediaType());
        row.put("studentAnswer", submitted == null ? "" : submitted);
        row.put("correctAnswer", parseJsonSafe(question.getCorrectAnswerJson()));
        row.put("correct", correct);
        row.put("awardedPoints", earned);
        row.put("maxPoints", question.getPoints());
        return row;
    }

    private String buildFeedback(double score) {
        if (score >= 85) {
            return "Excellent work.";
        }
        if (score >= 60) {
            return "Good attempt. Keep reviewing key concepts.";
        }
        return "Please review the lesson videos and retry.";
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private long durationSeconds(QuizAttempt attempt) {
        if (attempt.getStartedAt() == null || attempt.getSubmittedAt() == null) {
            return 0L;
        }
        return Duration.between(attempt.getStartedAt(), attempt.getSubmittedAt()).toSeconds();
    }

    private Object parseJsonSafe(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException ex) {
            return value;
        }
    }

    private String writeSafeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return "\"\"";
        }
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private <T> void shuffleInPlace(List<T> list) {
        if (list == null || list.size() < 2) {
            return;
        }

        List<T> original = new ArrayList<>(list);
        Collections.shuffle(list);

        if (list.equals(original)) {
            Collections.rotate(list, 1);
        }
    }

    private record GradingResult(boolean correct, double awardedPoints) {}
}
