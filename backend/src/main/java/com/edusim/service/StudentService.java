package com.edusim.service;

import com.edusim.dto.StudentDtos.SubmitQuizRequest;
import com.edusim.dto.StudentDtos.LessonProgressRequest;
import com.edusim.dto.StudentDtos.VideoCommentRequest;
import com.edusim.model.Course;
import com.edusim.model.CourseMaterial;
import com.edusim.model.Enrollment;
import com.edusim.model.FeedbackViewLog;
import com.edusim.model.LessonProgress;
import com.edusim.model.LessonVideo;
import com.edusim.model.Question;
import com.edusim.model.QuestionType;
import com.edusim.model.Quiz;
import com.edusim.model.QuizDisplayMode;
import com.edusim.model.QuizAttempt;
import com.edusim.model.QuizAttemptAnswer;
import com.edusim.model.QuizResetRequest;
import com.edusim.model.ReviewTiming;
import com.edusim.model.ResetRequestStatus;
import com.edusim.model.TopicLearningResource;
import com.edusim.model.UserAccount;
import com.edusim.model.VideoComment;
import com.edusim.model.VideoProgress;
import com.edusim.repo.CourseMaterialRepository;
import com.edusim.repo.CourseRepository;
import com.edusim.repo.EnrollmentRepository;
import com.edusim.repo.FeedbackViewLogRepository;
import com.edusim.repo.LessonProgressRepository;
import com.edusim.repo.LessonVideoRepository;
import com.edusim.repo.QuestionRepository;
import com.edusim.repo.QuizAttemptAnswerRepository;
import com.edusim.repo.QuizAttemptRepository;
import com.edusim.repo.QuizRepository;
import com.edusim.repo.QuizResetRequestRepository;
import com.edusim.repo.TopicLearningResourceRepository;
import com.edusim.repo.VideoCommentRepository;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Collections;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentService {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final LessonVideoRepository lessonVideoRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final VideoProgressRepository videoProgressRepository;
    private final CourseMaterialRepository courseMaterialRepository;
    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAttemptAnswerRepository quizAttemptAnswerRepository;
    private final FeedbackViewLogRepository feedbackViewLogRepository;
    private final VideoCommentRepository videoCommentRepository;
    private final QuizResetRequestRepository quizResetRequestRepository;
    private final TopicLearningResourceRepository topicLearningResourceRepository;
    private final ObjectMapper objectMapper;
    private final AiLearningService aiLearningService;

    public StudentService(
        EnrollmentRepository enrollmentRepository,
        CourseRepository courseRepository,
        LessonVideoRepository lessonVideoRepository,
        LessonProgressRepository lessonProgressRepository,
        VideoProgressRepository videoProgressRepository,
        CourseMaterialRepository courseMaterialRepository,
        QuizRepository quizRepository,
        QuestionRepository questionRepository,
        QuizAttemptRepository quizAttemptRepository,
        QuizAttemptAnswerRepository quizAttemptAnswerRepository,
        FeedbackViewLogRepository feedbackViewLogRepository,
        VideoCommentRepository videoCommentRepository,
        QuizResetRequestRepository quizResetRequestRepository,
        TopicLearningResourceRepository topicLearningResourceRepository,
        ObjectMapper objectMapper,
        AiLearningService aiLearningService
    ) {
        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
        this.lessonVideoRepository = lessonVideoRepository;
        this.lessonProgressRepository = lessonProgressRepository;
        this.videoProgressRepository = videoProgressRepository;
        this.courseMaterialRepository = courseMaterialRepository;
        this.quizRepository = quizRepository;
        this.questionRepository = questionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.quizAttemptAnswerRepository = quizAttemptAnswerRepository;
        this.feedbackViewLogRepository = feedbackViewLogRepository;
        this.videoCommentRepository = videoCommentRepository;
        this.quizResetRequestRepository = quizResetRequestRepository;
        this.topicLearningResourceRepository = topicLearningResourceRepository;
        this.objectMapper = objectMapper;
        this.aiLearningService = aiLearningService;
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

            Map<String, Object> courseSummary = new LinkedHashMap<>();
            courseSummary.put("courseId", course.getId());
            courseSummary.put("title", course.getTitle());
            courseSummary.put("description", course.getDescription());
            courseSummary.put("imageUrl", course.getImageUrl() == null ? "" : course.getImageUrl());
            courseSummary.put("progress", round2(progress));
            courseSummary.put("mandatoryCompleted", completedMandatory);
            courseSummary.put("mandatoryTotal", totalMandatory);
            courseSummaries.add(courseSummary);

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
                quizCard.put("hasOpenAttempt", attemptAvailability.hasOpenAttempt());
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
                row.put("hasOpenAttempt", attemptAvailability.hasOpenAttempt());
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
                "description", course.getDescription(),
                "imageUrl", course.getImageUrl() == null ? "" : course.getImageUrl()
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

        LessonProgress lessonProgress = lessonProgressRepository.findByStudentIdAndLessonId(student.getId(), videoId)
            .orElseGet(LessonProgress::new);
        lessonProgress.setStudent(student);
        lessonProgress.setCourse(video.getCourse());
        lessonProgress.setLesson(video);
        lessonProgress.setVideoProgress(100);
        lessonProgress.setCompleted(true);
        lessonProgress.setLastAccessed(LocalDateTime.now());
        lessonProgressRepository.save(lessonProgress);

        return Map.of(
            "message", "Video marked as completed",
            "videoId", videoId
        );
    }

    @Transactional
    public Map<String, Object> updateLessonProgress(Long lessonId, LessonProgressRequest request, UserAccount student) {
        LessonVideo lesson = lessonVideoRepository.findById(lessonId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Lesson not found"));
        ensureEnrolled(student.getId(), lesson.getCourse().getId());

        LessonProgress progress = lessonProgressRepository.findByStudentIdAndLessonId(student.getId(), lessonId)
            .orElseGet(LessonProgress::new);
        progress.setStudent(student);
        progress.setCourse(lesson.getCourse());
        progress.setLesson(lesson);
        if (request != null && request.videoProgress() != null) {
            progress.setVideoProgress(clampPercent(request.videoProgress()));
        }
        if (request != null && request.notesOpened() != null) {
            progress.setNotesOpened(request.notesOpened());
        }
        if (request != null && request.notesCompletion() != null) {
            progress.setNotesCompletion(clampPercent(request.notesCompletion()));
            progress.setNotesOpened(progress.getNotesCompletion() > 0 || progress.isNotesOpened());
        }
        if (request != null && request.completed() != null) {
            progress.setCompleted(request.completed());
        } else {
            progress.setCompleted(progress.isCompleted() || progress.getVideoProgress() >= 95);
        }
        progress.setLastAccessed(LocalDateTime.now());
        lessonProgressRepository.save(progress);

        return Map.of(
            "message", "Lesson progress updated",
            "lessonId", lessonId,
            "videoProgress", progress.getVideoProgress(),
            "notesOpened", progress.isNotesOpened(),
            "notesCompletion", progress.getNotesCompletion(),
            "completed", progress.isCompleted()
        );
    }

    @Transactional
    public Map<String, Object> openLessonNotes(Long lessonId, UserAccount student) {
        return updateLessonProgress(
            lessonId,
            new LessonProgressRequest(null, true, 100, null),
            student
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getVideoComments(Long videoId, UserAccount student) {
        LessonVideo video = lessonVideoRepository.findById(videoId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Video not found"));
        ensureEnrolled(student.getId(), video.getCourse().getId());

        return videoCommentRepository.findByVideoIdOrderByCreatedAtDesc(videoId)
            .stream()
            .map(comment -> toVideoCommentRow(comment, student.getId()))
            .toList();
    }

    @Transactional
    public Map<String, Object> addVideoComment(Long videoId, VideoCommentRequest request, UserAccount student) {
        LessonVideo video = lessonVideoRepository.findById(videoId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Video not found"));
        ensureEnrolled(student.getId(), video.getCourse().getId());

        String text = request.comment() == null ? "" : request.comment().trim();
        if (text.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Comment is required.");
        }

        VideoComment comment = new VideoComment();
        comment.setVideo(video);
        comment.setStudent(student);
        comment.setComment(text);
        comment.setCreatedAt(LocalDateTime.now());
        comment.setUpdatedAt(LocalDateTime.now());
        videoCommentRepository.save(comment);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Comment added");
        response.put("comment", toVideoCommentRow(comment, student.getId()));
        return response;
    }

    @Transactional
    public Map<String, Object> requestCourseReset(Long courseId, UserAccount student) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Course not found"));
        ensureEnrolled(student.getId(), course.getId());

        boolean pendingExists = quizResetRequestRepository
            .existsByStudentIdAndCourseIdAndStatus(student.getId(), course.getId(), ResetRequestStatus.PENDING);
        if (pendingExists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Your reset request is already pending lecturer approval.");
        }

        QuizResetRequest resetRequest = new QuizResetRequest();
        resetRequest.setStudent(student);
        resetRequest.setCourse(course);
        resetRequest.setStatus(ResetRequestStatus.PENDING);
        resetRequest.setRequestedAt(LocalDateTime.now());
        quizResetRequestRepository.save(resetRequest);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Reset request submitted");
        response.put("requestId", resetRequest.getId());
        response.put("status", resetRequest.getStatus().name());
        return response;
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

        Optional<QuizAttempt> existingAttempt = quizAttemptRepository
            .findFirstByQuizIdAndStudentIdAndSubmittedAtIsNullOrderByStartedAtDesc(quizId, student.getId());
        if (existingAttempt.isPresent()) {
            return buildQuizAttemptResponse(quiz, existingAttempt.get(), true);
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

        return buildQuizAttemptResponse(quiz, attempt, false);
    }

    private Map<String, Object> buildQuizAttemptResponse(Quiz quiz, QuizAttempt attempt, boolean resumed) {
        List<Question> questionsToServe = new ArrayList<>(questionRepository.findByQuizIdOrderBySortOrder(quiz.getId()));
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
        response.put("resumed", resumed);
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
        Map<String, TopicMastery> masteryMap = new LinkedHashMap<>();
        ConfidenceSummary confidenceSummary = new ConfidenceSummary();
        TimeSummary timeSummary = new TimeSummary();

        for (Question question : questions) {
            totalPoints += question.getPoints();
            String questionKey = String.valueOf(question.getId());
            Object submitted = request.answers().get(questionKey);
            GradingResult grading = gradeAnswer(question, submitted);
            boolean correct = grading.correct();
            double earned = grading.awardedPoints();
            String topicTag = inferTopicTag(question);
            String confidenceLevel = normalizeConfidence(request.confidence() == null ? null : request.confidence().get(questionKey));
            int timeSpent = normalizeTimeSpent(request.timeSpentSeconds() == null ? null : request.timeSpentSeconds().get(questionKey));
            String timeSignal = buildTimeSignal(correct, timeSpent, question.getQuestionType());
            if (correct) {
                correctCount++;
            }
            awardedPoints += earned;
            masteryMap.computeIfAbsent(topicTag, TopicMastery::new).add(question.getPoints(), earned, correct);
            confidenceSummary.add(confidenceLevel, correct);
            timeSummary.add(timeSignal, timeSpent, correct);

            QuizAttemptAnswer answer = new QuizAttemptAnswer();
            answer.setAttempt(attempt);
            answer.setQuestion(question);
            answer.setCorrect(correct);
            answer.setAwardedPoints(earned);
            answer.setAnswerJson(writeSafeJson(submitted));
            answer.setCorrectAnswerJson(question.getCorrectAnswerJson());
            answer.setTopicTag(topicTag);
            answer.setConfidenceLevel(confidenceLevel);
            answer.setTimeSpentSeconds(timeSpent);
            answer.setTimeSignal(timeSignal);
            answer.setMisconception(buildMisconception(question, correct, earned));
            answerRows.add(answer);

            answerReview.add(toAnswerReviewRow(question, submitted, correct, earned, topicTag, confidenceLevel, timeSpent, timeSignal));
        }

        double score = totalPoints == 0 ? 0.0 : (awardedPoints * 100.0 / totalPoints);
        boolean passed = score >= quiz.getPassingMark();
        String feedback = buildFeedback(score);
        List<Map<String, Object>> mastery = buildMasteryRows(masteryMap);
        List<Map<String, Object>> recommendations = buildRecommendations(answerReview, mastery, quiz, student, score);
        Map<String, Object> retakePlan = buildRetakePlan(answerReview, mastery, recommendations);
        Map<String, Object> timeAnalysis = timeSummary.toMap();
        Map<String, Object> confidenceInsight = confidenceSummary.toMap();

        LocalDateTime now = LocalDateTime.now();
        attempt.setSubmittedAt(now);
        attempt.setScore(round2(score));
        attempt.setPassed(passed);
        attempt.setFeedback(feedback);
        attempt.setReflection(trimToNull(request.reflection()));
        attempt.setMasteryJson(writeSafeJson(mastery));
        attempt.setRecommendationJson(writeSafeJson(recommendations));
        attempt.setRetakePlanJson(writeSafeJson(retakePlan));
        attempt.setTimeAnalysisJson(writeSafeJson(timeAnalysis));
        attempt.setConfidenceSummaryJson(writeSafeJson(confidenceInsight));
        quizAttemptRepository.save(attempt);
        quizAttemptAnswerRepository.saveAll(answerRows);

        boolean canRevealNow = canRevealResult(quiz, now);
        LocalDateTime releaseAt = effectiveResultReleaseAt(quiz);
        FeedbackViewLog feedbackLog = canRevealNow ? recordFeedbackView(attempt, student, now) : null;
        boolean showScore = canRevealNow && quiz.isShowScoreBreakdown();
        boolean showRelatedConcept = canRevealNow && quiz.isShowRelatedConcept();
        boolean showLearningRecommendation = canRevealNow && quiz.isShowLearningRecommendation();
        boolean showConfidence = canRevealNow && quiz.isShowConfidenceReflection();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("attemptId", attempt.getId());
        response.put("quizId", quiz.getId());
        response.put("quizTitle", quiz.getTitle());
        response.put("attemptNumber", attempt.getAttemptNumber());
        response.put("resultReleased", canRevealNow);
        response.put("releaseAt", releaseAt);
        response.put("score", showScore ? round2(score) : null);
        response.put("passed", showScore ? passed : null);
        response.put("correctCount", showScore ? correctCount : null);
        response.put("totalQuestions", questions.size());
        response.put("feedback", canRevealNow ? (showScore ? feedback : "Your quiz was submitted. Lecturer has hidden score display for this quiz.") : reviewUnavailableMessage(quiz));
        response.put("streak", showScore ? longestCorrectStreak(answerReview) : null);
        response.put("achievement", showScore ? buildAchievement(score, passed) : null);
        response.put("summaryPoints", showScore ? buildSummaryPoints(score, correctCount, questions.size(), passed) : List.of());
        response.put("mastery", showRelatedConcept ? mastery : List.of());
        response.put("recommendations", showLearningRecommendation ? recommendations : List.of());
        response.put("retakePlan", showLearningRecommendation ? retakePlan : Map.of());
        response.put("timeAnalysis", showConfidence ? timeAnalysis : Map.of());
        response.put("confidenceSummary", showConfidence ? confidenceInsight : Map.of());
        response.put("reflection", canRevealNow ? attempt.getReflection() : "");
        response.put("startedAt", attempt.getStartedAt());
        response.put("submittedAt", attempt.getSubmittedAt());
        response.put("durationSeconds", durationSeconds(attempt));
        response.put("showResultImmediately", quiz.isShowResultImmediately());
        response.put("reviewTiming", quiz.getReviewTiming().name());
        response.put("feedbackSettings", feedbackSettings(quiz));
        response.put("answers", canRevealNow ? visibleAnswerRows(answerReview, quiz) : List.of());
        response.put("feedbackViewed", feedbackLog != null);
        response.put("feedbackViewedAt", feedbackLog == null ? null : feedbackLog.getLastViewedAt());
        if (!canRevealNow) {
            response.put("resultNote", reviewUnavailableMessage(quiz));
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
            ? visibleAnswerRows(quizAttemptAnswerRepository.findByAttemptId(attemptId)
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
                  row.put("correctAnswer", parseJsonSafe(answer.getCorrectAnswerJson() == null ? answer.getQuestion().getCorrectAnswerJson() : answer.getCorrectAnswerJson()));
                  row.put("correct", answer.isCorrect());
                  row.put("awardedPoints", answer.getAwardedPoints());
                  row.put("maxPoints", answer.getQuestion().getPoints());
                  String topicTag = answer.getTopicTag() == null ? inferTopicTag(answer.getQuestion()) : answer.getTopicTag();
                  row.put("topicTag", topicTag);
                  row.put("learningConcept", inferLearningConcept(answer.getQuestion(), topicTag));
                  row.put("confidenceLevel", answer.getConfidenceLevel() == null ? "UNSET" : answer.getConfidenceLevel());
                  row.put("confidenceReflection", buildConfidenceReflection(answer.isCorrect(), answer.getConfidenceLevel()));
                  row.put("timeSpentSeconds", answer.getTimeSpentSeconds() == null ? 0 : answer.getTimeSpentSeconds());
                  row.put("timeSignal", answer.getTimeSignal() == null ? "NOT_TRACKED" : answer.getTimeSignal());
                  row.put("misconception", answer.getMisconception() == null ? buildMisconception(answer.getQuestion(), answer.isCorrect(), answer.getAwardedPoints()) : answer.getMisconception());
                  row.put("recommendation", buildRecommendationForTopic(topicTag, answer.isCorrect()));
                  row.put("feedbackTitle", buildAnswerFeedbackTitle(answer.isCorrect(), answer.getAwardedPoints(), answer.getQuestion().getPoints()));
                  row.put("feedbackDetail", buildAnswerFeedbackDetail(answer.getQuestion(), answer.isCorrect()));
                  row.put("learningTip", buildLearningTip(answer.getQuestion(), answer.isCorrect()));
                  row.put("simulationImpact", buildSimulationImpact(answer.getQuestion(), answer.isCorrect()));
                  row.put("optionFeedback", buildOptionFeedback(answer.getQuestion(), parseJsonSafe(answer.getAnswerJson())));
                  return row;
                })
                .toList(), attempt.getQuiz())
            : Collections.emptyList();

        Map<String, Object> summary = toAttemptSummary(attempt, canReveal, feedbackLog);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("summary", summary);
        response.put("answers", answers);
        response.put("resultReleased", canReveal);
        response.put("releaseAt", releaseAt);
        response.put("feedbackSettings", feedbackSettings(attempt.getQuiz()));
        if (!canReveal) {
            response.put("resultNote", reviewUnavailableMessage(attempt.getQuiz()));
        }
        return response;
    }

    @Transactional
    public Map<String, Object> getAiFeedback(Long attemptId, UserAccount student) {
        QuizAttempt attempt = quizAttemptRepository.findByIdAndStudentId(attemptId, student.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Attempt not found"));
        if (attempt.getSubmittedAt() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Attempt has not been submitted");
        }
        if (!canRevealResult(attempt.getQuiz(), LocalDateTime.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "AI feedback will be available after result release time.");
        }
        if (!attempt.getQuiz().isShowLearningRecommendation()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Learning recommendation is hidden by lecturer settings.");
        }

        List<Map<String, Object>> answerRows = quizAttemptAnswerRepository.findByAttemptId(attemptId)
            .stream()
            .map(this::toAiFeedbackAnswerRow)
            .toList();
        List<Map<String, Object>> wrongAnswers = answerRows.stream()
            .filter(row -> !Boolean.TRUE.equals(row.get("correct")))
            .limit(8)
            .toList();
        List<Map<String, Object>> mastery = toListOfMaps(parseJsonSafe(attempt.getMasteryJson()));
        List<Map<String, Object>> recommendations = toListOfMaps(parseJsonSafe(attempt.getRecommendationJson()));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("attemptId", attempt.getId());
        response.put("quizId", attempt.getQuiz().getId());
        response.put("quizTitle", attempt.getQuiz().getTitle());
        response.put("score", attempt.getScore());
        response.put("passed", attempt.getPassed());
        response.put("wrongAnswerCount", wrongAnswers.size());
        response.put("coach", aiLearningService.studentAttemptFeedback(attempt, wrongAnswers, mastery, recommendations));
        return response;
    }

    private Map<String, Object> toVideoCommentRow(VideoComment comment, Long viewerStudentId) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("commentId", comment.getId());
        row.put("videoId", comment.getVideo().getId());
        row.put("comment", comment.getComment());
        row.put("createdAt", comment.getCreatedAt());
        row.put("updatedAt", comment.getUpdatedAt());
        row.put("studentId", comment.getStudent().getId());
        row.put("studentName", comment.getStudent().getFullName());
        row.put("me", Objects.equals(comment.getStudent().getId(), viewerStudentId));
        return row;
    }

    private Map<String, Object> toAiFeedbackAnswerRow(QuizAttemptAnswer answer) {
        Question question = answer.getQuestion();
        String topicTag = answer.getTopicTag() == null ? inferTopicTag(question) : answer.getTopicTag();
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("answerId", answer.getId());
        row.put("questionId", question.getId());
        row.put("sortOrder", question.getSortOrder());
        row.put("questionType", question.getQuestionType().name());
        row.put("prompt", question.getPrompt());
        row.put("studentAnswer", parseJsonSafe(answer.getAnswerJson()));
        row.put("correctAnswer", parseJsonSafe(question.getCorrectAnswerJson()));
        row.put("correct", answer.isCorrect());
        row.put("awardedPoints", answer.getAwardedPoints());
        row.put("maxPoints", question.getPoints());
        row.put("topicTag", topicTag);
        row.put("learningConcept", inferLearningConcept(question, topicTag));
        row.put("misconception", answer.getMisconception() == null
            ? buildMisconception(question, answer.isCorrect(), answer.getAwardedPoints())
            : answer.getMisconception());
        row.put("feedbackDetail", buildAnswerFeedbackDetail(question, answer.isCorrect()));
        row.put("learningTip", buildLearningTip(question, answer.isCorrect()));
        return row;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> toListOfMaps(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                rows.add(new LinkedHashMap<>((Map<String, Object>) map));
            }
        }
        return rows;
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
        boolean hasOpenAttempt = quizAttemptRepository
            .findFirstByQuizIdAndStudentIdAndSubmittedAtIsNullOrderByStartedAtDesc(quiz.getId(), studentId)
            .isPresent();

        if (hasOpenAttempt) {
            return new AttemptAvailability(attemptsUsed, attemptsRemaining, alreadySubmitted, true, true, "");
        }

        if (attemptsRemaining <= 0) {
            String message = alreadySubmitted
                ? "Your quiz is already answered (maximum attempts reached)."
                : "Maximum attempts reached.";
            return new AttemptAvailability(attemptsUsed, attemptsRemaining, alreadySubmitted, false, false, message);
        }

        return new AttemptAvailability(attemptsUsed, attemptsRemaining, alreadySubmitted, false, true, "");
    }

    private record AttemptAvailability(
        long attemptsUsed,
        long attemptsRemaining,
        boolean alreadySubmitted,
        boolean hasOpenAttempt,
        boolean canAttempt,
        String message
    ) {
    }

    private QuizDisplayMode displayModeOrDefault(Quiz quiz) {
        return quiz.getQuestionDisplayMode() == null ? QuizDisplayMode.ONE_BY_ONE : quiz.getQuestionDisplayMode();
    }

    private boolean canRevealResult(Quiz quiz, LocalDateTime now) {
        return switch (quiz.getReviewTiming()) {
            case IMMEDIATE_AFTER_SUBMISSION -> true;
            case AFTER_DUE_DATE -> {
                LocalDateTime releaseAt = effectiveResultReleaseAt(quiz);
                yield releaseAt != null && !now.isBefore(releaseAt);
            }
            case MANUAL_RELEASE -> quiz.isManualReleaseStatus();
            case HIDDEN -> false;
        };
    }

    private LocalDateTime effectiveResultReleaseAt(Quiz quiz) {
        if (quiz.getReviewTiming() == ReviewTiming.AFTER_DUE_DATE) {
            return quiz.getResultReleaseAt() != null ? quiz.getResultReleaseAt() : quiz.getCloseAt();
        }
        return null;
    }

    private String reviewUnavailableMessage(Quiz quiz) {
        if (quiz.getReviewTiming() == ReviewTiming.HIDDEN) {
            return "Quiz review is currently unavailable. The lecturer has hidden review access for this quiz.";
        }
        return "Quiz review is currently unavailable. Please wait for lecturer release.";
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
        row.put("topic", question.getTopic() == null ? inferTopicTag(question) : question.getTopic());
        row.put("difficultyLevel", question.getDifficultyLevel() == null ? "MEDIUM" : question.getDifficultyLevel().name());
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
        Quiz quiz = attempt.getQuiz();
        boolean showScore = canReveal && quiz.isShowScoreBreakdown();
        boolean showRelatedConcept = canReveal && quiz.isShowRelatedConcept();
        boolean showLearningRecommendation = canReveal && quiz.isShowLearningRecommendation();
        boolean showConfidence = canReveal && quiz.isShowConfidenceReflection();
        summary.put("score", showScore ? attempt.getScore() : null);
        summary.put("passed", showScore ? attempt.getPassed() : null);
        summary.put("feedback", canReveal ? (showScore ? attempt.getFeedback() : "Result released. Score display is hidden by lecturer settings.") : reviewUnavailableMessage(quiz));
        summary.put("resultReleased", canReveal);
        summary.put("releaseAt", effectiveResultReleaseAt(quiz));
        summary.put("reviewTiming", quiz.getReviewTiming().name());
        summary.put("reflection", canReveal ? (attempt.getReflection() == null ? "" : attempt.getReflection()) : "");
        summary.put("mastery", showRelatedConcept ? parseJsonSafe(attempt.getMasteryJson()) : List.of());
        summary.put("recommendations", showLearningRecommendation ? parseJsonSafe(attempt.getRecommendationJson()) : List.of());
        summary.put("retakePlan", showLearningRecommendation ? parseJsonSafe(attempt.getRetakePlanJson()) : Map.of());
        summary.put("timeAnalysis", showConfidence ? parseJsonSafe(attempt.getTimeAnalysisJson()) : Map.of());
        summary.put("confidenceSummary", showConfidence ? parseJsonSafe(attempt.getConfidenceSummaryJson()) : Map.of());
        summary.put("feedbackSettings", feedbackSettings(quiz));
        summary.put("feedbackViewed", feedbackLog != null);
        summary.put("feedbackViewedAt", feedbackLog == null ? null : feedbackLog.getLastViewedAt());
        summary.put("feedbackViewCount", feedbackLog == null ? 0 : feedbackLog.getViewCount());
        return summary;
    }

    private Map<String, Object> feedbackSettings(Quiz quiz) {
        Map<String, Object> settings = new LinkedHashMap<>();
        settings.put("reviewTiming", quiz.getReviewTiming().name());
        settings.put("manualReleaseStatus", quiz.isManualReleaseStatus());
        settings.put("showSelectedAnswer", quiz.isShowSelectedAnswer());
        settings.put("showScoreAfterSubmission", quiz.isShowScoreAfterSubmission());
        settings.put("showScoreBreakdown", quiz.isShowScoreBreakdown());
        settings.put("showCorrectAnswer", quiz.isShowCorrectAnswer());
        settings.put("showExplanation", quiz.isShowExplanation());
        settings.put("showRelatedConcept", quiz.isShowRelatedConcept());
        settings.put("showLearningRecommendation", quiz.isShowLearningRecommendation());
        settings.put("showConfidence", quiz.isShowConfidenceReflection());
        settings.put("showStudentAnswerReview", quiz.isShowStudentAnswerReview());
        return settings;
    }

    private List<Map<String, Object>> visibleAnswerRows(List<Map<String, Object>> rows, Quiz quiz) {
        return rows.stream()
            .map(row -> visibleAnswerRow(row, quiz))
            .toList();
    }

    private Map<String, Object> visibleAnswerRow(Map<String, Object> row, Quiz quiz) {
        Map<String, Object> visible = new LinkedHashMap<>(row);
        if (!quiz.isShowScoreBreakdown()) {
            visible.put("correct", null);
            visible.put("awardedPoints", null);
            visible.put("maxPoints", null);
            visible.put("feedbackTitle", "");
        }
        if (!quiz.isShowSelectedAnswer()) {
            visible.remove("studentAnswer");
        }
        if (!quiz.isShowCorrectAnswer()) {
            visible.remove("correctAnswer");
        }
        if (!quiz.isShowExplanation()) {
            visible.remove("explanation");
            visible.remove("feedbackDetail");
            visible.remove("learningTip");
            visible.remove("simulationImpact");
            visible.remove("optionFeedback");
        }
        if (!quiz.isShowRelatedConcept()) {
            visible.remove("learningConcept");
        }
        if (!quiz.isShowLearningRecommendation()) {
            visible.remove("recommendation");
        }
        if (!quiz.isShowConfidenceReflection()) {
            visible.remove("confidenceLevel");
            visible.remove("confidenceReflection");
            visible.remove("timeSpentSeconds");
            visible.remove("timeSignal");
            visible.remove("misconception");
        }
        return visible;
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

    private Map<String, Object> toAnswerReviewRow(
        Question question,
        Object submitted,
        boolean correct,
        double earned,
        String topicTag,
        String confidenceLevel,
        int timeSpentSeconds,
        String timeSignal
    ) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("questionId", question.getId());
        row.put("sortOrder", question.getSortOrder());
        row.put("questionType", question.getQuestionType().name());
        row.put("prompt", question.getPrompt());
        row.put("topicTag", topicTag);
        row.put("learningConcept", inferLearningConcept(question, topicTag));
        row.put("explanation", question.getExplanation() == null ? "" : question.getExplanation());
        row.put("mediaUrl", question.getMediaUrl() == null ? "" : question.getMediaUrl());
        row.put("mediaType", question.getMediaType() == null ? "" : question.getMediaType());
        row.put("studentAnswer", submitted == null ? "" : submitted);
        row.put("correctAnswer", parseJsonSafe(question.getCorrectAnswerJson()));
        row.put("correct", correct);
        row.put("awardedPoints", earned);
        row.put("maxPoints", question.getPoints());
        row.put("confidenceLevel", confidenceLevel);
        row.put("confidenceReflection", buildConfidenceReflection(correct, confidenceLevel));
        row.put("timeSpentSeconds", timeSpentSeconds);
        row.put("timeSignal", timeSignal);
        row.put("misconception", buildMisconception(question, correct, earned));
        row.put("recommendation", buildRecommendationForTopic(topicTag, correct));
        row.put("feedbackTitle", buildAnswerFeedbackTitle(correct, earned, question.getPoints()));
        row.put("feedbackDetail", buildAnswerFeedbackDetail(question, correct));
        row.put("learningTip", buildLearningTip(question, correct));
        row.put("simulationImpact", buildSimulationImpact(question, correct));
        row.put("optionFeedback", buildOptionFeedback(question, submitted));
        return row;
    }

    private String inferTopicTag(Question question) {
        if (question.getTopic() != null && !question.getTopic().isBlank()) {
            return question.getTopic();
        }
        String source = normalize(
            question.getPrompt() + " " +
            (question.getExplanation() == null ? "" : question.getExplanation()) + " " +
            question.getQuiz().getTitle() + " " +
            question.getQuiz().getCourse().getTitle()
        );
        if (
            source.contains("etl") ||
            source.contains("data management") ||
            source.contains("data warehouse") ||
            source.contains("warehousing") ||
            source.contains("data cleaning") ||
            source.contains("cleaning") ||
            source.contains("structured data") ||
            source.contains("store structured") ||
            source.contains("sql join") ||
            source.contains(" join") ||
            source.contains("star schema") ||
            source.contains("fact table") ||
            source.contains("dimension")
        ) {
            return "Data Warehousing";
        }
        if (source.contains("integration") || source.contains("pipeline") || source.contains("batch") || source.contains("streaming")) {
            return "Data Integration";
        }
        if (source.contains("sql") || source.contains("database") || source.contains("table") || source.contains("key")) {
            return "Database";
        }
        if (source.contains("api") || source.contains("rest") || source.contains("url")) {
            return "API";
        }
        if (source.contains("frontend") || source.contains("backend") || source.contains("web")) {
            return "Web Architecture";
        }
        if (source.contains("security") || source.contains("secure") || source.contains("auth")) {
            return "Security";
        }
        return question.getQuiz().getCourse().getTitle();
    }

    private String inferLearningConcept(Question question, String topicTag) {
        String source = normalize(
            question.getPrompt() + " " +
            (question.getExplanation() == null ? "" : question.getExplanation()) + " " +
            question.getQuiz().getTitle()
        );
        if (source.contains("data management")) {
            return "Data Management";
        }
        if (source.contains("structured data") || source.contains("store structured")) {
            return "Structured Data Storage";
        }
        if (source.contains("etl")) {
            return "ETL";
        }
        if (source.contains("data cleaning") || source.contains("cleaning")) {
            return "Data Cleaning";
        }
        if (source.contains("sql join") || source.contains(" join")) {
            return "SQL JOIN";
        }
        if (source.contains("data warehouse") || source.contains("warehousing")) {
            return "Data Warehouse Basics";
        }
        if (source.contains("batch") || source.contains("streaming") || source.contains("integration style")) {
            return "Data Integration Styles";
        }
        if (source.contains("api") || source.contains("rest")) {
            return "API Basics";
        }
        if (source.contains("sql") || source.contains("database") || source.contains("relational")) {
            return "SQL Basics";
        }
        return topicTag == null || topicTag.isBlank() ? "General Revision" : topicTag;
    }

    private String normalizeConfidence(String value) {
        String normalized = normalize(value);
        if (normalized.equals("high") || normalized.equals("medium") || normalized.equals("low")) {
            return normalized.toUpperCase(Locale.ROOT);
        }
        return "UNSET";
    }

    private int normalizeTimeSpent(Integer value) {
        if (value == null || value < 0) {
            return 0;
        }
        return Math.min(value, 7200);
    }

    private String buildTimeSignal(boolean correct, int timeSpentSeconds, QuestionType questionType) {
        if (timeSpentSeconds <= 0) {
            return "NOT_TRACKED";
        }
        int fastThreshold = questionType == QuestionType.SHORT_ANSWER || questionType == QuestionType.MATCHING ? 20 : 8;
        int slowThreshold = questionType == QuestionType.SHORT_ANSWER || questionType == QuestionType.MATCHING ? 120 : 75;
        if (timeSpentSeconds <= fastThreshold && !correct) {
            return "FAST_WRONG";
        }
        if (timeSpentSeconds >= slowThreshold && correct) {
            return "SLOW_CORRECT";
        }
        if (timeSpentSeconds >= slowThreshold) {
            return "SLOW_WRONG";
        }
        return correct ? "STEADY_CORRECT" : "STEADY_WRONG";
    }

    private String buildMisconception(Question question, boolean correct, double earned) {
        if (correct) {
            return "Concept is secure.";
        }
        if (earned > 0) {
            return "Partial understanding detected. One or more key parts are missing.";
        }
        return switch (question.getQuestionType()) {
            case MCQ, TRUE_FALSE -> "Likely distractor selection. Recheck the keyword in the question stem.";
            case SHORT_ANSWER -> "Missing or mismatched core term. Compare your wording with the expected concept.";
            case MULTI_SELECT -> "Incomplete set or extra distractor selected. Re-evaluate every option.";
            case MATCHING -> "Relationship mismatch. Review how each term connects to its function.";
        };
    }

    private List<Map<String, Object>> buildMasteryRows(Map<String, TopicMastery> masteryMap) {
        return masteryMap.values().stream()
            .map(TopicMastery::toMap)
            .toList();
    }

    private List<Map<String, Object>> buildRecommendations(
        List<Map<String, Object>> answerReview,
        List<Map<String, Object>> mastery,
        Quiz quiz,
        UserAccount student,
        double currentScore
    ) {
        Long courseId = quiz.getCourse().getId();
        Map<String, LinkedHashSet<String>> conceptsByTopic = new LinkedHashMap<>();
        Map<String, Integer> mistakeCountByTopic = new LinkedHashMap<>();
        Map<String, List<String>> confidenceByTopic = new LinkedHashMap<>();
        List<Map<String, Object>> learningResources = learningResourceCatalog(courseId);
        Map<Long, LessonProgress> progressByLesson = lessonProgressRepository
            .findByStudentIdAndCourseId(student.getId(), courseId)
            .stream()
            .collect(
                LinkedHashMap::new,
                (map, progress) -> map.put(progress.getLesson().getId(), progress),
                LinkedHashMap::putAll
            );
        Map<String, TopicLearningResource> mappedResources = mappedResourcesByTopic(courseId);
        Map<String, Object> attemptTrend = buildAttemptTrend(quiz, student, currentScore);

        for (Map<String, Object> answer : answerReview) {
            String topic = String.valueOf(answer.getOrDefault("topicTag", "General"));
            String confidenceReflection = String.valueOf(answer.getOrDefault("confidenceReflection", "")).trim();
            if (!confidenceReflection.isBlank()) {
                confidenceByTopic.computeIfAbsent(topic, ignored -> new ArrayList<>()).add(confidenceReflection);
            }
            if (Boolean.TRUE.equals(answer.get("correct"))) {
                continue;
            }
            String concept = String.valueOf(answer.getOrDefault("learningConcept", topic));
            conceptsByTopic.computeIfAbsent(topic, ignored -> new LinkedHashSet<>()).add(concept);
            mistakeCountByTopic.merge(topic, 1, Integer::sum);
        }
        for (Map<String, Object> row : mastery) {
            double topicScore = toDouble(row.get("score"), 100.0);
            if (topicScore >= 70) {
                continue;
            }
            String topic = String.valueOf(row.getOrDefault("topicTag", "General"));
            conceptsByTopic.computeIfAbsent(topic, ignored -> new LinkedHashSet<>()).add(topic);
            mistakeCountByTopic.putIfAbsent(topic, toDouble(row.get("questionCount"), 0.0) > 0 ? 1 : 0);
        }
        if (conceptsByTopic.isEmpty()) {
            return List.of(Map.of(
                "topicTag", "Next Challenge",
                "weakTopic", "Next Challenge",
                "title", "Try a harder practice scenario",
                "reason", "Your answers show stable understanding in this attempt.",
                "actionLabel", "Continue learning",
                "concepts", List.of(),
                "learningMaterials", List.of()
            ));
        }
        List<Map<String, Object>> recommendations = new ArrayList<>();
        for (Map.Entry<String, LinkedHashSet<String>> entry : conceptsByTopic.entrySet()) {
            String topic = entry.getKey();
            List<String> concepts = new ArrayList<>(entry.getValue());
            TopicLearningResource mapped = mappedResources.get(normalize(topic));
            List<Map<String, Object>> materials = selectLearningMaterials(topic, concepts, learningResources, mapped);
            Map<String, Object> engagement = buildMaterialEngagement(mapped, progressByLesson, student.getId(), courseId);
            double masteryScore = mastery.stream()
                .filter(row -> topic.equals(String.valueOf(row.getOrDefault("topicTag", ""))))
                .findFirst()
                .map(row -> toDouble(row.get("score"), 0.0))
                .orElse(0.0);
            List<String> engagementMessages = buildEngagementMessages(engagement);
            boolean strongerPlan = Boolean.TRUE.equals(attemptTrend.get("lowImprovement")) && masteryScore < 70;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("topicTag", topic);
            row.put("weakTopic", topic);
            row.put("title", "Revise " + topic);
            row.put("reason", recommendationReason(topic, concepts, masteryScore, engagementMessages, strongerPlan));
            row.put("actionLabel", materials.isEmpty() ? "Review related lesson" : "Open recommended materials");
            row.put("topicMastery", round2(masteryScore));
            row.put("mistakeCount", mistakeCountByTopic.getOrDefault(topic, 0));
            row.put("concepts", concepts);
            row.put("confidenceReflections", confidenceByTopic.getOrDefault(topic, List.of()));
            row.put("materialCompletionStatus", engagement);
            row.put("engagementMessages", engagementMessages);
            row.put("attemptTrend", attemptTrend);
            row.put("suggestedLearningPath", suggestedLearningPath(strongerPlan, engagement, mapped));
            row.put("learningMaterials", materials);
            row.put("recommendedVideo", mapped == null || mapped.getVideo() == null ? null : learningResourceRow(
                mapped.getVideo().getId(),
                "VIDEO",
                mapped.getVideo().getTitle(),
                mapped.getVideo().getVideoUrl(),
                mapped.getVideo().getDescription()
            ));
            row.put("recommendedNotes", mapped == null || mapped.getNotes() == null ? null : learningResourceRow(
                mapped.getNotes().getId(),
                mapped.getNotes().getMaterialType(),
                mapped.getNotes().getTitle(),
                mapped.getNotes().getResourceUrl(),
                mapped.getNotes().getMaterialType()
            ));
            row.put("practiceQuiz", mapped == null || mapped.getPracticeQuiz() == null ? null : Map.of(
                "quizId", mapped.getPracticeQuiz().getId(),
                "title", mapped.getPracticeQuiz().getTitle(),
                "published", mapped.getPracticeQuiz().isPublished()
            ));
            recommendations.add(row);
        }
        return recommendations;
    }

    private String buildConfidenceReflection(boolean correct, String confidenceLevel) {
        if (!correct && "HIGH".equals(confidenceLevel)) {
            return "Potential misconception detected. Please revise this topic.";
        }
        if (correct && "LOW".equals(confidenceLevel)) {
            return "You answered correctly but confidence was low. Further revision is recommended.";
        }
        return "";
    }

    private Map<String, Object> buildRecommendationForTopic(String topicTag, boolean correct) {
        String topic = topicTag == null || topicTag.isBlank() ? "General" : topicTag;
        if (correct) {
            return Map.of(
                "topicTag", topic,
                "title", "Reinforce " + topic,
                "reason", "You handled this concept well. Keep it fresh with one quick review.",
                "actionLabel", "Review notes"
            );
        }
        String action = topic.toLowerCase(Locale.ROOT).contains("data")
            ? "Rewatch integration lesson"
            : topic.toLowerCase(Locale.ROOT).contains("database")
                ? "Review SQL/database notes"
                : topic.toLowerCase(Locale.ROOT).contains("api")
                    ? "Review API material"
                    : "Review related lesson";
        return Map.of(
            "topicTag", topic,
            "title", "Strengthen " + topic,
            "reason", "This topic caused at least one incorrect or partial answer.",
            "actionLabel", action
        );
    }

    private List<Map<String, Object>> learningResourceCatalog(Long courseId) {
        List<Map<String, Object>> resources = new ArrayList<>();
        for (LessonVideo video : lessonVideoRepository.findByCourseIdOrderBySortOrder(courseId)) {
            resources.add(learningResourceRow(
                video.getId(),
                "VIDEO",
                video.getTitle(),
                video.getVideoUrl(),
                video.getDescription()
            ));
        }
        for (CourseMaterial material : courseMaterialRepository.findByCourseId(courseId)) {
            resources.add(learningResourceRow(
                material.getId(),
                material.getMaterialType(),
                material.getTitle(),
                material.getResourceUrl(),
                material.getMaterialType()
            ));
        }
        return resources;
    }

    private Map<String, Object> learningResourceRow(Long id, String type, String title, String url, String description) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("type", type == null || type.isBlank() ? "MATERIAL" : type);
        row.put("title", title == null || title.isBlank() ? "Learning material" : title);
        row.put("resourceUrl", url == null ? "" : url);
        row.put("description", description == null ? "" : description);
        return row;
    }

    private List<Map<String, Object>> selectLearningMaterials(
        String topic,
        List<String> concepts,
        List<Map<String, Object>> learningResources,
        TopicLearningResource mapped
    ) {
        List<Map<String, Object>> selected = new ArrayList<>();
        Set<String> selectedTitles = new HashSet<>();
        if (mapped != null && mapped.getVideo() != null) {
            Map<String, Object> video = learningResourceRow(
                mapped.getVideo().getId(),
                "VIDEO",
                mapped.getVideo().getTitle(),
                mapped.getVideo().getVideoUrl(),
                mapped.getVideo().getDescription()
            );
            selected.add(video);
            selectedTitles.add(normalize(String.valueOf(video.get("title"))));
        }
        if (mapped != null && mapped.getNotes() != null) {
            Map<String, Object> notes = learningResourceRow(
                mapped.getNotes().getId(),
                mapped.getNotes().getMaterialType(),
                mapped.getNotes().getTitle(),
                mapped.getNotes().getResourceUrl(),
                mapped.getNotes().getMaterialType()
            );
            String title = normalize(String.valueOf(notes.get("title")));
            if (selectedTitles.add(title)) {
                selected.add(notes);
            }
        }
        if (mapped != null && mapped.getPracticeQuiz() != null) {
            Map<String, Object> quiz = learningResourceRow(
                mapped.getPracticeQuiz().getId(),
                "PRACTICE_QUIZ",
                mapped.getPracticeQuiz().getTitle(),
                "/student/quiz/" + mapped.getPracticeQuiz().getId(),
                mapped.getPracticeQuiz().getDescription()
            );
            String title = normalize(String.valueOf(quiz.get("title")));
            if (selectedTitles.add(title)) {
                selected.add(quiz);
            }
        }
        for (Map<String, Object> resource : learningResources) {
            if (matchesLearningResource(topic, concepts, resource)) {
                String title = normalize(String.valueOf(resource.get("title")));
                if (selectedTitles.add(title)) {
                    selected.add(resource);
                }
            }
            if (selected.size() >= 3) {
                return selected;
            }
        }
        return selected;
    }

    private Map<String, TopicLearningResource> mappedResourcesByTopic(Long courseId) {
        Map<String, TopicLearningResource> mapped = new LinkedHashMap<>();
        for (TopicLearningResource resource : topicLearningResourceRepository.findByCourseId(courseId)) {
            String topic = normalize(resource.getTopic());
            if (!topic.isBlank()) {
                mapped.putIfAbsent(topic, resource);
            }
        }
        return mapped;
    }

    private Map<String, Object> buildMaterialEngagement(
        TopicLearningResource mapped,
        Map<Long, LessonProgress> progressByLesson,
        Long studentId,
        Long courseId
    ) {
        int videoProgress = 0;
        boolean notesOpened = false;
        int notesCompletion = 0;
        boolean completed = false;
        Long lessonId = null;

        if (mapped != null && mapped.getVideo() != null) {
            lessonId = mapped.getVideo().getId();
            LessonProgress progress = progressByLesson.get(lessonId);
            if (progress != null) {
                videoProgress = progress.getVideoProgress() == null ? 0 : progress.getVideoProgress();
                notesOpened = progress.isNotesOpened();
                notesCompletion = progress.getNotesCompletion() == null ? 0 : progress.getNotesCompletion();
                completed = progress.isCompleted();
            } else {
                Optional<VideoProgress> legacy = videoProgressRepository.findByStudentIdAndVideoId(studentId, lessonId);
                if (legacy.isPresent()) {
                    VideoProgress oldProgress = legacy.get();
                    videoProgress = oldProgress.isCompleted() ? 100 : estimateVideoPercent(oldProgress);
                    completed = oldProgress.isCompleted();
                }
            }
        } else {
            List<LessonProgress> rows = lessonProgressRepository.findByStudentIdAndCourseId(studentId, courseId);
            if (!rows.isEmpty()) {
                videoProgress = (int) Math.round(rows.stream()
                    .mapToInt(row -> row.getVideoProgress() == null ? 0 : row.getVideoProgress())
                    .average()
                    .orElse(0.0));
                notesOpened = rows.stream().anyMatch(LessonProgress::isNotesOpened);
                notesCompletion = (int) Math.round(rows.stream()
                    .mapToInt(row -> row.getNotesCompletion() == null ? 0 : row.getNotesCompletion())
                    .average()
                    .orElse(0.0));
                completed = rows.stream().anyMatch(LessonProgress::isCompleted);
            }
        }

        Map<String, Object> engagement = new LinkedHashMap<>();
        engagement.put("lessonId", lessonId);
        engagement.put("videoProgress", clampPercent(videoProgress));
        engagement.put("notesOpened", notesOpened);
        engagement.put("notesCompletion", clampPercent(notesCompletion));
        engagement.put("completed", completed);
        return engagement;
    }

    private List<String> buildEngagementMessages(Map<String, Object> engagement) {
        List<String> messages = new ArrayList<>();
        int videoProgress = (int) toDouble(engagement.get("videoProgress"), 0.0);
        boolean notesOpened = Boolean.TRUE.equals(engagement.get("notesOpened"));
        int notesCompletion = (int) toDouble(engagement.get("notesCompletion"), 0.0);
        if (videoProgress < 50) {
            messages.add("Complete lesson video before retrying the quiz.");
        }
        if (!notesOpened) {
            messages.add("Please review the learning notes.");
        } else if (notesCompletion < 70) {
            messages.add("Notes are opened but incomplete. Finish the notes before retrying.");
        }
        return messages;
    }

    private String recommendationReason(
        String topic,
        List<String> concepts,
        double masteryScore,
        List<String> engagementMessages,
        boolean strongerPlan
    ) {
        List<String> parts = new ArrayList<>();
        parts.add("Topic mastery is " + round2(masteryScore) + "% for " + topic + ".");
        if (!concepts.isEmpty()) {
            parts.add("Focus concepts: " + String.join(", ", concepts) + ".");
        }
        parts.addAll(engagementMessages);
        if (strongerPlan) {
            parts.add("Previous attempts show low improvement, so follow the full learning path before retrying.");
        }
        return String.join(" ", parts);
    }

    private List<String> suggestedLearningPath(boolean strongerPlan, Map<String, Object> engagement, TopicLearningResource mapped) {
        List<String> steps = new ArrayList<>();
        if (toDouble(engagement.get("videoProgress"), 0.0) < 50) {
            steps.add("Watch lesson video");
        }
        if (!Boolean.TRUE.equals(engagement.get("notesOpened")) || toDouble(engagement.get("notesCompletion"), 0.0) < 70) {
            steps.add("Read notes");
        }
        if (mapped != null && mapped.getPracticeQuiz() != null) {
            steps.add("Retry beginner quiz");
        } else {
            steps.add("Retry similar practice questions");
        }
        if (strongerPlan) {
            steps.add(0, "Restart from foundation review");
        }
        return steps;
    }

    private Map<String, Object> buildAttemptTrend(Quiz quiz, UserAccount student, double currentScore) {
        List<QuizAttempt> previousAttempts = quizAttemptRepository
            .findByQuizIdAndStudentIdAndSubmittedAtIsNotNullOrderByAttemptNumberAsc(quiz.getId(), student.getId());
        List<Double> scores = previousAttempts.stream()
            .map(QuizAttempt::getScore)
            .filter(Objects::nonNull)
            .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
        if (scores.isEmpty() || Math.abs(scores.get(scores.size() - 1) - currentScore) > 0.01) {
            scores.add(round2(currentScore));
        }
        boolean lowImprovement = false;
        double improvement = 0.0;
        if (scores.size() >= 3) {
            List<Double> lastThree = scores.subList(scores.size() - 3, scores.size());
            improvement = round2(lastThree.get(2) - lastThree.get(0));
            lowImprovement = improvement < 8.0 && lastThree.get(2) < 70.0;
        }
        Map<String, Object> trend = new LinkedHashMap<>();
        trend.put("scores", scores);
        trend.put("attemptCount", scores.size());
        trend.put("improvement", improvement);
        trend.put("lowImprovement", lowImprovement);
        trend.put("message", lowImprovement
            ? "Progress is improving slowly across attempts. Use the full guided path before retrying."
            : "Attempt trend does not require stronger intervention yet.");
        return trend;
    }

    private boolean matchesLearningResource(String topic, List<String> concepts, Map<String, Object> resource) {
        String searchable = normalize(
            String.valueOf(resource.get("title")) + " " +
            String.valueOf(resource.get("type")) + " " +
            String.valueOf(resource.get("description")) + " " +
            String.valueOf(resource.get("resourceUrl"))
        );
        for (String concept : concepts) {
            String normalizedConcept = normalize(concept);
            if (!normalizedConcept.isBlank() && searchable.contains(normalizedConcept)) {
                return true;
            }
            if ("ETL".equalsIgnoreCase(concept) && searchable.contains("etl")) {
                return true;
            }
            if ("SQL JOIN".equalsIgnoreCase(concept) && (searchable.contains("join") || searchable.contains("sql"))) {
                return true;
            }
        }
        return normalize(topic).contains("data") &&
            (searchable.contains("data") || searchable.contains("pipeline") || searchable.contains("warehouse"));
    }

    private Map<String, Object> buildRetakePlan(
        List<Map<String, Object>> answerReview,
        List<Map<String, Object>> mastery,
        List<Map<String, Object>> recommendations
    ) {
        List<Map<String, Object>> weakQuestions = answerReview.stream()
            .filter(answer -> !Boolean.TRUE.equals(answer.get("correct")))
            .limit(5)
            .map(answer -> Map.<String, Object>of(
                "questionId", answer.get("questionId"),
                "topicTag", answer.get("topicTag"),
                "prompt", answer.get("prompt"),
                "focus", answer.get("misconception")
            ))
            .toList();
        List<String> weakTopics = mastery.stream()
            .filter(row -> toDouble(row.get("score"), 100.0) < 70)
            .map(row -> String.valueOf(row.get("topicTag")))
            .toList();
        boolean lowImprovement = recommendations.stream()
            .map(row -> row.get("attemptTrend"))
            .filter(Map.class::isInstance)
            .map(Map.class::cast)
            .anyMatch(trend -> Boolean.TRUE.equals(trend.get("lowImprovement")));
        List<String> learningPath = recommendations.stream()
            .map(row -> row.get("suggestedLearningPath"))
            .filter(List.class::isInstance)
            .map(List.class::cast)
            .findFirst()
            .map(path -> path.stream().map(String::valueOf).toList())
            .orElse(List.of("Watch lesson video", "Read notes", "Retry beginner quiz"));
        return Map.of(
            "title", weakQuestions.isEmpty() ? "Challenge Retake" : "Personalized Retake Plan",
            "weakTopics", weakTopics,
            "questions", weakQuestions,
            "suggestedLearningPath", learningPath,
            "strongerRecommendation", lowImprovement,
            "message", weakQuestions.isEmpty()
                ? "No weak question detected. Use the next attempt for higher difficulty practice."
                : lowImprovement
                    ? "Your improvement is slow. Follow the learning path fully before retrying."
                    : "Retake should focus on the listed topics and similar question types."
        );
    }

    private String buildFeedback(double score) {
        if (score >= 85) {
            return "Excellent work. You showed strong understanding and can move forward with confidence.";
        }
        if (score >= 60) {
            return "Good attempt. Review the highlighted questions to strengthen the concepts before the next assessment.";
        }
        return "Keep going. Revisit the lesson notes, focus on the explanation cards, and retry when you are ready.";
    }

    private String buildAchievement(double score, boolean passed) {
        if (score >= 90) {
            return "Quiz Master";
        }
        if (score >= 75) {
            return "Sharp Thinker";
        }
        if (passed) {
            return "Steady Learner";
        }
        return "Comeback Builder";
    }

    private List<String> buildSummaryPoints(double score, int correctCount, int totalQuestions, boolean passed) {
        List<String> summary = new ArrayList<>();
        summary.add("You answered " + correctCount + " out of " + totalQuestions + " questions correctly.");
        summary.add(passed
            ? "You passed this attempt. Use the review cards to polish weaker areas."
            : "You have not passed yet. Start with the incorrect review cards and try again.");
        summary.add(score >= 80
            ? "Next step: challenge yourself with a harder scenario or practice task."
            : "Next step: reread the notes, watch the related video, then retake similar questions.");
        return summary;
    }

    private int longestCorrectStreak(List<Map<String, Object>> answerReview) {
        int best = 0;
        int current = 0;
        for (Map<String, Object> row : answerReview) {
            if (Boolean.TRUE.equals(row.get("correct"))) {
                current++;
                best = Math.max(best, current);
            } else {
                current = 0;
            }
        }
        return best;
    }

    private List<Map<String, Object>> buildOptionFeedback(Question question, Object submitted) {
        try {
            return switch (question.getQuestionType()) {
                case MCQ, TRUE_FALSE -> buildChoiceOptionFeedback(question, submitted, false);
                case MULTI_SELECT -> buildChoiceOptionFeedback(question, submitted, true);
                case SHORT_ANSWER -> buildShortAnswerOptionFeedback(question, submitted);
                case MATCHING -> buildMatchingOptionFeedback(question, submitted);
            };
        } catch (Exception ex) {
            return List.of();
        }
    }

    private List<Map<String, Object>> buildChoiceOptionFeedback(Question question, Object submitted, boolean multiSelect) throws JsonProcessingException {
        List<String> options = toStringList(parseJsonSafe(question.getOptionsJson()));
        JsonNode expectedNode = objectMapper.readTree(question.getCorrectAnswerJson());
        Set<String> correctOptions = multiSelect
            ? toNormalizedSet(expectedNode)
            : Set.of(normalize(expectedNode.asText()));
        Set<String> submittedOptions = multiSelect
            ? toNormalizedSet(objectMapper.valueToTree(submitted))
            : Set.of(normalize(stringValue(submitted)));

        List<Map<String, Object>> feedback = new ArrayList<>();
        for (String option : options) {
            String normalizedOption = normalize(option);
            boolean correctOption = correctOptions.contains(normalizedOption);
            boolean selected = submittedOptions.contains(normalizedOption);
            String reason;
            if (correctOption) {
                reason = selected
                    ? "Correct option selected. This matches the expected concept."
                    : "This is a correct option that should be included in the answer.";
            } else if (selected) {
                reason = "This was selected, but it is a distractor and does not match the expected concept.";
            } else {
                reason = "This option is a distractor, so it should be eliminated.";
            }
            feedback.add(optionFeedbackRow(option, correctOption, selected, reason));
        }
        return feedback;
    }

    private List<Map<String, Object>> buildShortAnswerOptionFeedback(Question question, Object submitted) throws JsonProcessingException {
        JsonNode expectedNode = objectMapper.readTree(question.getCorrectAnswerJson());
        List<String> keywords = extractShortAnswerKeywords(question.getOptionsJson(), expectedNode);
        String submittedText = normalize(stringValue(submitted));
        List<Map<String, Object>> feedback = new ArrayList<>();
        for (String keyword : keywords) {
            boolean found = !submittedText.isBlank() && submittedText.contains(normalize(keyword));
            feedback.add(optionFeedbackRow(
                keyword,
                true,
                found,
                found
                    ? "Keyword found in your answer."
                    : "This expected keyword or idea was missing from your answer."
            ));
        }
        return feedback;
    }

    private List<Map<String, Object>> buildMatchingOptionFeedback(Question question, Object submitted) throws JsonProcessingException {
        JsonNode expectedNode = objectMapper.readTree(question.getCorrectAnswerJson());
        Map<String, String> expected = toDisplayMap(expectedNode);
        Map<String, String> submittedMap = toDisplayMap(objectMapper.valueToTree(submitted));
        List<Map<String, Object>> feedback = new ArrayList<>();
        for (Map.Entry<String, String> entry : expected.entrySet()) {
            String submittedValue = submittedMap.getOrDefault(entry.getKey(), "");
            boolean matched = normalize(entry.getValue()).equals(normalize(submittedValue));
            feedback.add(optionFeedbackRow(
                entry.getKey(),
                matched,
                !submittedValue.isBlank(),
                matched
                    ? "Matched correctly with " + entry.getValue() + "."
                    : "Expected match is " + entry.getValue() + ", but your match was " + (submittedValue.isBlank() ? "not selected" : submittedValue) + "."
            ));
        }
        return feedback;
    }

    private Map<String, String> toDisplayMap(JsonNode node) {
        Map<String, String> map = new LinkedHashMap<>();
        if (node == null || !node.isObject()) {
            return map;
        }
        node.fields().forEachRemaining(entry -> map.put(entry.getKey(), entry.getValue().asText()));
        return map;
    }

    private Map<String, Object> optionFeedbackRow(String option, boolean correctOption, boolean selected, String reason) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("option", option);
        row.put("correctOption", correctOption);
        row.put("selected", selected);
        row.put("reason", reason);
        return row;
    }

    private String buildAnswerFeedbackTitle(boolean correct, double earned, int maxPoints) {
        if (correct) {
            return "Correct decision";
        }
        if (earned > 0 && earned < maxPoints) {
            return "Partially correct";
        }
        return "Review this concept";
    }

    private String buildAnswerFeedbackDetail(Question question, boolean correct) {
        String explanation = question.getExplanation() == null ? "" : question.getExplanation().trim();
        if (!explanation.isBlank()) {
            return explanation;
        }
        if (correct) {
            return "Your answer matches the expected concept. Keep using the same reasoning in similar scenarios.";
        }
        String concept = inferLearningConcept(question, inferTopicTag(question));
        return "Compare your answer with the correct answer and focus on the core concept: " + concept + ".";
    }

    private String buildLearningTip(Question question, boolean correct) {
        return switch (question.getQuestionType()) {
            case MCQ, TRUE_FALSE -> correct
                ? "Notice the clue that made this option the best choice."
                : "Read every option carefully and eliminate distractors before choosing.";
            case SHORT_ANSWER -> correct
                ? "Your wording captured the key idea."
                : "Short answers are now checked case-insensitively, but the key idea still needs to match.";
            case MULTI_SELECT -> correct
                ? "You selected the complete set without extra distractors."
                : "Check whether you missed a correct option or selected an extra distractor.";
            case MATCHING -> correct
                ? "Your pairs show the relationships clearly."
                : "Review each pair one-by-one and connect terms to their exact function.";
        };
    }

    private String buildSimulationImpact(Question question, boolean correct) {
        if (correct) {
            return "Simulation impact: the scenario stays stable because your decision supports the next step.";
        }
        return switch (question.getQuestionType()) {
            case MCQ, TRUE_FALSE -> "Simulation impact: choosing this in a real case could send the workflow down the wrong path.";
            case SHORT_ANSWER -> "Simulation impact: missing the key term may cause the system to apply the wrong rule.";
            case MULTI_SELECT -> "Simulation impact: an incomplete set can leave part of the scenario unresolved.";
            case MATCHING -> "Simulation impact: a wrong match can connect the wrong tool, data, or action in the scenario.";
        };
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private int clampPercent(Integer value) {
        if (value == null) {
            return 0;
        }
        return Math.max(0, Math.min(100, value));
    }

    private int estimateVideoPercent(VideoProgress progress) {
        if (progress == null || progress.getVideo() == null || progress.getVideo().getDurationMinutes() == null) {
            return 0;
        }
        int durationSeconds = Math.max(1, progress.getVideo().getDurationMinutes() * 60);
        int positionSeconds = Math.max(0, progress.getLastPositionSeconds() == null ? 0 : progress.getLastPositionSeconds());
        return clampPercent((int) Math.round(positionSeconds * 100.0 / durationSeconds));
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

    private double toDouble(Object value, double fallback) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return value == null ? fallback : Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return fallback;
        }
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

    private final class TopicMastery {
        private final String topicTag;
        private double totalPoints;
        private double awardedPoints;
        private int questionCount;
        private int correctCount;

        private TopicMastery(String topicTag) {
            this.topicTag = topicTag;
        }

        private void add(double points, double awarded, boolean correct) {
            totalPoints += points;
            awardedPoints += awarded;
            questionCount++;
            if (correct) {
                correctCount++;
            }
        }

        private Map<String, Object> toMap() {
            double score = totalPoints == 0 ? 0.0 : round2(awardedPoints * 100.0 / totalPoints);
            String status = score >= 85 ? "Secure" : score >= 60 ? "Developing" : "Emerging";
            return Map.of(
                "topicTag", topicTag,
                "score", score,
                "status", status,
                "questionCount", questionCount,
                "correctCount", correctCount,
                "weak", score < 70
            );
        }
    }

    private final class ConfidenceSummary {
        private int highTotal;
        private int highWrong;
        private int mediumTotal;
        private int lowTotal;
        private int unsetTotal;

        private void add(String confidenceLevel, boolean correct) {
            if ("HIGH".equals(confidenceLevel)) {
                highTotal++;
                if (!correct) {
                    highWrong++;
                }
                return;
            }
            if ("MEDIUM".equals(confidenceLevel)) {
                mediumTotal++;
                return;
            }
            if ("LOW".equals(confidenceLevel)) {
                lowTotal++;
                return;
            }
            unsetTotal++;
        }

        private Map<String, Object> toMap() {
            return Map.of(
                "highTotal", highTotal,
                "highWrong", highWrong,
                "mediumTotal", mediumTotal,
                "lowTotal", lowTotal,
                "unsetTotal", unsetTotal,
                "riskLabel", highWrong > 0 ? "Overconfidence risk" : "Confidence aligned",
                "message", highWrong > 0
                    ? "Some answers were marked high confidence but were incorrect. Review these first."
                    : "Confidence pattern looks aligned with performance."
            );
        }
    }

    private final class TimeSummary {
        private int trackedCount;
        private int totalSeconds;
        private int fastWrong;
        private int slowCorrect;
        private int slowWrong;

        private void add(String signal, int seconds, boolean correct) {
            if (seconds > 0) {
                trackedCount++;
                totalSeconds += seconds;
            }
            if ("FAST_WRONG".equals(signal)) {
                fastWrong++;
            }
            if ("SLOW_CORRECT".equals(signal)) {
                slowCorrect++;
            }
            if ("SLOW_WRONG".equals(signal)) {
                slowWrong++;
            }
        }

        private Map<String, Object> toMap() {
            int averageSeconds = trackedCount == 0 ? 0 : Math.round(totalSeconds / (float) trackedCount);
            String message = fastWrong > 0
                ? "Slow down on fast incorrect answers; read every option before deciding."
                : slowWrong > 0
                    ? "Long effort still led to mistakes on some questions. Revisit those concepts."
                    : "Timing pattern is steady.";
            return Map.of(
                "trackedCount", trackedCount,
                "averageSeconds", averageSeconds,
                "fastWrong", fastWrong,
                "slowCorrect", slowCorrect,
                "slowWrong", slowWrong,
                "message", message
            );
        }
    }

    private record GradingResult(boolean correct, double awardedPoints) {}
}
