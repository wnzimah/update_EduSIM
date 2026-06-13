package com.edusim.service;

import com.edusim.dto.LecturerDtos.CourseRequest;
import com.edusim.dto.LecturerDtos.CourseStudentRequest;
import com.edusim.dto.LecturerDtos.MarkAdjustmentRequest;
import com.edusim.dto.LecturerDtos.MaterialRequest;
import com.edusim.dto.LecturerDtos.PublishRequest;
import com.edusim.dto.LecturerDtos.QuestionBankRequest;
import com.edusim.dto.LecturerDtos.QuizAutoSelectRequest;
import com.edusim.dto.LecturerDtos.QuizRequest;
import com.edusim.dto.LecturerDtos.VideoRequest;
import com.edusim.model.Course;
import com.edusim.model.CourseMaterial;
import com.edusim.model.DifficultyLevel;
import com.edusim.model.Enrollment;
import com.edusim.model.LessonVideo;
import com.edusim.model.MarkAdjustmentAudit;
import com.edusim.model.Question;
import com.edusim.model.QuestionBankItem;
import com.edusim.model.QuestionType;
import com.edusim.model.Quiz;
import com.edusim.model.QuizDisplayMode;
import com.edusim.model.QuizAttempt;
import com.edusim.model.QuizAttemptAnswer;
import com.edusim.model.QuizResetRequest;
import com.edusim.model.ReviewTiming;
import com.edusim.model.ResetRequestStatus;
import com.edusim.model.Role;
import com.edusim.model.UserAccount;
import com.edusim.repo.CourseRepository;
import com.edusim.repo.CourseMaterialRepository;
import com.edusim.repo.EnrollmentRepository;
import com.edusim.repo.FeedbackViewLogRepository;
import com.edusim.repo.LessonProgressRepository;
import com.edusim.repo.LessonVideoRepository;
import com.edusim.repo.MarkAdjustmentAuditRepository;
import com.edusim.repo.QuestionBankItemRepository;
import com.edusim.repo.QuestionRepository;
import com.edusim.repo.QuizAttemptRepository;
import com.edusim.repo.QuizAttemptAnswerRepository;
import com.edusim.repo.QuizRepository;
import com.edusim.repo.QuizResetRequestRepository;
import com.edusim.repo.TopicLearningResourceRepository;
import com.edusim.repo.VideoProgressRepository;
import com.edusim.repo.UserAccountRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.LinkedHashMap;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.InflaterInputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LecturerService {

    private static final List<String> QUIZ_IMPORT_HEADERS = List.of(
        "quiz_title",
        "quiz_description",
        "time_limit_minutes",
        "max_attempts",
        "passing_mark",
        "published",
        "unlock_after_videos",
        "open_at",
        "close_at",
        "result_release_at",
        "shuffle_questions",
        "shuffle_answers",
        "question_display_mode",
        "show_result_immediately",
        "show_score_after_submission",
        "show_correct_answer",
        "show_explanation",
        "show_related_concept",
        "show_learning_recommendation",
        "show_student_answer_review",
        "sort_order",
        "question_type",
        "topic",
        "difficulty_level",
        "prompt",
        "options_json",
        "correct_answer_json",
        "points",
        "explanation",
        "media_url",
        "media_type"
    );

    private final CourseRepository courseRepository;
    private final LessonVideoRepository lessonVideoRepository;
    private final CourseMaterialRepository courseMaterialRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final FeedbackViewLogRepository feedbackViewLogRepository;
    private final QuizRepository quizRepository;
    private final QuestionBankItemRepository questionBankItemRepository;
    private final QuestionRepository questionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAttemptAnswerRepository quizAttemptAnswerRepository;
    private final QuizResetRequestRepository quizResetRequestRepository;
    private final MarkAdjustmentAuditRepository markAdjustmentAuditRepository;
    private final VideoProgressRepository videoProgressRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final TopicLearningResourceRepository topicLearningResourceRepository;
    private final UserAccountRepository userAccountRepository;
    private final ObjectMapper objectMapper;

    public LecturerService(
        CourseRepository courseRepository,
        LessonVideoRepository lessonVideoRepository,
        CourseMaterialRepository courseMaterialRepository,
        EnrollmentRepository enrollmentRepository,
        FeedbackViewLogRepository feedbackViewLogRepository,
        QuizRepository quizRepository,
        QuestionBankItemRepository questionBankItemRepository,
        QuestionRepository questionRepository,
        QuizAttemptRepository quizAttemptRepository,
        QuizAttemptAnswerRepository quizAttemptAnswerRepository,
        QuizResetRequestRepository quizResetRequestRepository,
        MarkAdjustmentAuditRepository markAdjustmentAuditRepository,
        VideoProgressRepository videoProgressRepository,
        LessonProgressRepository lessonProgressRepository,
        TopicLearningResourceRepository topicLearningResourceRepository,
        UserAccountRepository userAccountRepository,
        ObjectMapper objectMapper
    ) {
        this.courseRepository = courseRepository;
        this.lessonVideoRepository = lessonVideoRepository;
        this.courseMaterialRepository = courseMaterialRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.feedbackViewLogRepository = feedbackViewLogRepository;
        this.quizRepository = quizRepository;
        this.questionBankItemRepository = questionBankItemRepository;
        this.questionRepository = questionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.quizAttemptAnswerRepository = quizAttemptAnswerRepository;
        this.quizResetRequestRepository = quizResetRequestRepository;
        this.markAdjustmentAuditRepository = markAdjustmentAuditRepository;
        this.videoProgressRepository = videoProgressRepository;
        this.lessonProgressRepository = lessonProgressRepository;
        this.topicLearningResourceRepository = topicLearningResourceRepository;
        this.userAccountRepository = userAccountRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard(UserAccount lecturer) {
        List<Course> courses = courseRepository.findByLecturerId(lecturer.getId());
        long videos = 0;
        long quizzes = 0;
        for (Course course : courses) {
            videos += lessonVideoRepository.countByCourseId(course.getId());
            quizzes += quizRepository.countByCourseId(course.getId());
        }

        Set<Long> studentIds = new HashSet<>();
        if (!courses.isEmpty()) {
            List<Long> courseIds = courses.stream().map(Course::getId).toList();
            List<Enrollment> enrollments = enrollmentRepository.findByCourseIdIn(courseIds);
            for (Enrollment enrollment : enrollments) {
                studentIds.add(enrollment.getStudent().getId());
            }
        }

        List<Map<String, Object>> recentActivity = quizAttemptRepository
            .findTop10ByQuizCourseLecturerIdOrderBySubmittedAtDesc(lecturer.getId())
            .stream()
            .filter(attempt -> attempt.getSubmittedAt() != null)
            .map(attempt -> Map.<String, Object>of(
                "attemptId", attempt.getId(),
                "studentName", attempt.getStudent().getFullName(),
                "quizTitle", attempt.getQuiz().getTitle(),
                "courseTitle", attempt.getQuiz().getCourse().getTitle(),
                "score", attempt.getScore(),
                "passed", attempt.getPassed(),
                "submittedAt", attempt.getSubmittedAt()
            ))
            .toList();

        return Map.of(
            "lecturer", Map.of(
                "id", lecturer.getId(),
                "name", lecturer.getFullName(),
                "email", lecturer.getEmail()
            ),
            "stats", Map.of(
                "courses", courses.size(),
                "videos", videos,
                "quizzes", quizzes,
                "students", studentIds.size()
            ),
            "recentActivity", recentActivity
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCourses(UserAccount lecturer) {
        return courseRepository.findByLecturerId(lecturer.getId())
            .stream()
            .map(course -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("courseId", course.getId());
                row.put("title", course.getTitle());
                row.put("description", course.getDescription());
                row.put("imageUrl", course.getImageUrl() == null ? "" : course.getImageUrl());
                row.put("videoCount", lessonVideoRepository.countByCourseId(course.getId()));
                row.put("quizCount", quizRepository.countByCourseId(course.getId()));
                return row;
            })
            .toList();
    }

    @Transactional
    public Map<String, Object> createCourse(CourseRequest request, UserAccount lecturer) {
        Course course = new Course();
        course.setTitle(request.title());
        course.setDescription(request.description());
        course.setImageUrl(trimToNull(request.imageUrl()));
        course.setLecturer(lecturer);
        courseRepository.save(course);
        return Map.of("message", "Course created", "courseId", course.getId());
    }

    @Transactional
    public Map<String, Object> updateCourse(Long courseId, CourseRequest request, UserAccount lecturer) {
        Course course = getOwnedCourse(courseId, lecturer);
        course.setTitle(request.title());
        course.setDescription(request.description());
        course.setImageUrl(trimToNull(request.imageUrl()));
        courseRepository.save(course);
        return Map.of("message", "Course updated", "courseId", course.getId());
    }

    @Transactional
    public Map<String, Object> deleteCourse(Long courseId, UserAccount lecturer) {
        Course course = getOwnedCourse(courseId, lecturer);
        tryDeleteOptional(() -> markAdjustmentAuditRepository.deleteByAttemptAnswerAttemptQuizCourseId(courseId));
        tryDeleteOptional(() -> feedbackViewLogRepository.deleteByAttemptQuizCourseId(courseId));
        quizAttemptAnswerRepository.deleteByAttemptQuizCourseId(courseId);
        quizAttemptRepository.deleteByQuizCourseId(courseId);
        questionRepository.deleteByQuizCourseId(courseId);
        quizRepository.deleteByCourseId(courseId);
        questionBankItemRepository.deleteByCourseId(courseId);
        topicLearningResourceRepository.deleteByCourseId(courseId);
        lessonProgressRepository.deleteByCourseId(courseId);
        videoProgressRepository.deleteByVideoCourseId(courseId);
        lessonVideoRepository.deleteByCourseId(courseId);
        courseMaterialRepository.deleteByCourseId(courseId);
        enrollmentRepository.deleteByCourseId(courseId);
        courseRepository.delete(course);
        return Map.of("message", "Course deleted", "courseId", courseId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCourseStudents(Long courseId, UserAccount lecturer) {
        getOwnedCourse(courseId, lecturer);
        return enrollmentRepository.findByCourseId(courseId)
            .stream()
            .sorted(Comparator.comparing(enrollment -> enrollment.getStudent().getFullName(), String.CASE_INSENSITIVE_ORDER))
            .map(this::toCourseStudentRow)
            .toList();
    }

    @Transactional
    public Map<String, Object> addCourseStudent(Long courseId, CourseStudentRequest request, UserAccount lecturer) {
        Course course = getOwnedCourse(courseId, lecturer);
        String email = request.email() == null ? "" : request.email().trim().toLowerCase();
        UserAccount student = userAccountRepository.findByEmail(email)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Student email not found"));
        if (student.getRole() != Role.STUDENT) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only student accounts can be added to a course");
        }
        if (enrollmentRepository.existsByStudentIdAndCourseId(student.getId(), courseId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Student is already enrolled in this course");
        }

        Enrollment enrollment = new Enrollment();
        enrollment.setCourse(course);
        enrollment.setStudent(student);
        enrollmentRepository.save(enrollment);

        return Map.of(
            "message", "Student added to course",
            "courseId", course.getId(),
            "student", toCourseStudentRow(enrollment)
        );
    }

    @Transactional
    public Map<String, Object> addVideo(Long courseId, VideoRequest request, UserAccount lecturer) {
        Course course = getOwnedCourse(courseId, lecturer);
        LessonVideo video = new LessonVideo();
        video.setCourse(course);
        video.setTitle(request.title());
        video.setDescription(request.description());
        video.setVideoUrl(request.videoUrl());
        video.setDurationMinutes(request.durationMinutes());
        video.setSortOrder(request.sortOrder());
        video.setMandatory(request.mandatory());
        lessonVideoRepository.save(video);
        return Map.of("message", "Video added", "videoId", video.getId());
    }

    @Transactional
    public Map<String, Object> addMaterial(Long courseId, MaterialRequest request, UserAccount lecturer) {
        Course course = getOwnedCourse(courseId, lecturer);
        CourseMaterial material = new CourseMaterial();
        material.setCourse(course);
        material.setTitle(request.title());
        material.setMaterialType(request.materialType());
        material.setResourceUrl(request.resourceUrl());
        courseMaterialRepository.save(material);
        return Map.of("message", "Material added", "materialId", material.getId());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getCourseContent(Long courseId, UserAccount lecturer) {
        Course course = getOwnedCourse(courseId, lecturer);
        List<Map<String, Object>> videos = lessonVideoRepository.findByCourseIdOrderBySortOrder(courseId)
            .stream()
            .map(this::toVideoContentMap)
            .toList();
        List<Map<String, Object>> materials = courseMaterialRepository.findByCourseId(courseId)
            .stream()
            .map(this::toMaterialContentMap)
            .toList();

        return Map.of(
            "courseId", course.getId(),
            "courseTitle", course.getTitle(),
            "videos", videos,
            "materials", materials
        );
    }

    @Transactional
    public Map<String, Object> updateVideo(Long videoId, VideoRequest request, UserAccount lecturer) {
        LessonVideo video = getOwnedVideo(videoId, lecturer);
        video.setTitle(request.title());
        video.setDescription(request.description());
        video.setVideoUrl(request.videoUrl());
        video.setDurationMinutes(request.durationMinutes());
        video.setSortOrder(request.sortOrder());
        video.setMandatory(request.mandatory());
        lessonVideoRepository.save(video);
        return Map.of("message", "Video updated", "videoId", video.getId());
    }

    @Transactional
    public Map<String, Object> deleteVideo(Long videoId, UserAccount lecturer) {
        LessonVideo video = getOwnedVideo(videoId, lecturer);
        topicLearningResourceRepository.deleteByVideoId(videoId);
        lessonProgressRepository.deleteByLessonId(videoId);
        videoProgressRepository.deleteByVideoId(videoId);
        lessonVideoRepository.delete(video);
        return Map.of("message", "Video deleted", "videoId", videoId);
    }

    @Transactional
    public Map<String, Object> duplicateVideo(Long videoId, UserAccount lecturer) {
        LessonVideo source = getOwnedVideo(videoId, lecturer);
        LessonVideo copy = new LessonVideo();
        copy.setCourse(source.getCourse());
        copy.setTitle(source.getTitle() + " (Copy)");
        copy.setDescription(source.getDescription());
        copy.setVideoUrl(source.getVideoUrl());
        copy.setDurationMinutes(source.getDurationMinutes());
        copy.setMandatory(source.isMandatory());
        int nextOrder = lessonVideoRepository.findTopByCourseIdOrderBySortOrderDesc(source.getCourse().getId())
            .map(video -> video.getSortOrder() + 1)
            .orElse(1);
        copy.setSortOrder(nextOrder);
        lessonVideoRepository.save(copy);
        return Map.of("message", "Video duplicated", "videoId", copy.getId());
    }

    @Transactional
    public Map<String, Object> updateMaterial(Long materialId, MaterialRequest request, UserAccount lecturer) {
        CourseMaterial material = getOwnedMaterial(materialId, lecturer);
        material.setTitle(request.title());
        material.setMaterialType(request.materialType());
        material.setResourceUrl(request.resourceUrl());
        courseMaterialRepository.save(material);
        return Map.of("message", "Material updated", "materialId", material.getId());
    }

    @Transactional
    public Map<String, Object> deleteMaterial(Long materialId, UserAccount lecturer) {
        CourseMaterial material = getOwnedMaterial(materialId, lecturer);
        topicLearningResourceRepository.deleteByNotesId(materialId);
        courseMaterialRepository.delete(material);
        return Map.of("message", "Material deleted", "materialId", materialId);
    }

    @Transactional
    public Map<String, Object> duplicateMaterial(Long materialId, UserAccount lecturer) {
        CourseMaterial source = getOwnedMaterial(materialId, lecturer);
        CourseMaterial copy = new CourseMaterial();
        copy.setCourse(source.getCourse());
        copy.setTitle(source.getTitle() + " (Copy)");
        copy.setMaterialType(source.getMaterialType());
        copy.setResourceUrl(source.getResourceUrl());
        courseMaterialRepository.save(copy);
        return Map.of("message", "Material duplicated", "materialId", copy.getId());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getQuestionBank(
        UserAccount lecturer,
        Long courseId,
        String topicTag,
        DifficultyLevel difficultyLevel,
        QuestionType questionType,
        LocalDate createdFrom,
        LocalDate createdTo,
        String search
    ) {
        List<QuestionBankItem> questions = courseId == null
            ? questionBankItemRepository.findByCourseLecturerId(lecturer.getId())
            : questionBankItemRepository.findByCourseIdAndCourseLecturerId(courseId, lecturer.getId());

        String topicFilter = normalizeNullable(topicTag);
        String searchFilter = normalizeNullable(search);

        return questions.stream()
            .filter(item -> topicFilter == null || normalize(item.getTopicTag()).contains(topicFilter))
            .filter(item -> difficultyLevel == null || difficultyLevel.equals(item.getDifficultyLevel()))
            .filter(item -> questionType == null || questionType.equals(item.getQuestionType()))
            .filter(item -> createdFrom == null || !item.getCreatedAt().toLocalDate().isBefore(createdFrom))
            .filter(item -> createdTo == null || !item.getCreatedAt().toLocalDate().isAfter(createdTo))
            .filter(item -> searchFilter == null || matchesSearch(item, searchFilter))
            .sorted(Comparator.comparing(QuestionBankItem::getCreatedAt).reversed())
            .map(this::toQuestionBankMap)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getQuizzes(UserAccount lecturer, Long courseId) {
        List<Quiz> quizzes = new ArrayList<>();
        if (courseId != null) {
            Course course = getOwnedCourse(courseId, lecturer);
            quizzes.addAll(quizRepository.findByCourseId(course.getId()));
        } else {
            List<Course> courses = courseRepository.findByLecturerId(lecturer.getId());
            for (Course course : courses) {
                quizzes.addAll(quizRepository.findByCourseId(course.getId()));
            }
        }

        return quizzes.stream().map(quiz -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("quizId", quiz.getId());
            row.put("title", quiz.getTitle());
            row.put("description", quiz.getDescription());
            row.put("courseId", quiz.getCourse().getId());
            row.put("courseTitle", quiz.getCourse().getTitle());
            row.put("published", quiz.isPublished());
            row.put("timeLimitMinutes", quiz.getTimeLimitMinutes());
            row.put("maxAttempts", quiz.getMaxAttempts());
            row.put("passingMark", quiz.getPassingMark());
            row.put("openAt", quiz.getOpenAt());
            row.put("closeAt", quiz.getCloseAt());
            row.put("resultReleaseAt", effectiveResultReleaseAt(quiz));
            row.put("reviewTiming", quiz.getReviewTiming().name());
            row.put("manualReleaseStatus", quiz.isManualReleaseStatus());
            row.put("shuffleQuestions", quiz.isShuffleQuestions());
            row.put("shuffleAnswers", quiz.isShuffleAnswers());
            row.put("questionDisplayMode", displayModeOrDefault(quiz).name());
            row.put("showResultImmediately", quiz.isShowResultImmediately());
            row.put("feedbackSettings", feedbackSettings(quiz));
            return row;
        }).toList();
    }

    @Transactional
    public Map<String, Object> addQuestionBank(QuestionBankRequest request, UserAccount lecturer) {
        Course course = getOwnedCourse(request.courseId(), lecturer);
        QuestionBankItem item = new QuestionBankItem();
        item.setCourse(course);
        item.setCreator(lecturer);
        item.setQuestionType(request.questionType());
        item.setDifficultyLevel(request.difficultyLevel());
        item.setTopicTag(trimToDefault(request.topicTag(), "General"));
        item.setModuleTag(trimToDefault(request.moduleTag(), course.getTitle()));
        item.setPrompt(request.prompt());
        item.setExplanation(trimToNull(request.explanation()));
        item.setMediaUrl(trimToNull(request.mediaUrl()));
        item.setMediaType(trimToNull(request.mediaType()));
        item.setOptionsJson(writeSafe(request.options()));
        item.setCorrectAnswerJson(writeSafe(request.correctAnswer()));
        item.setPoints(request.points());
        questionBankItemRepository.save(item);
        return Map.of("message", "Question bank item added", "questionBankId", item.getId());
    }

    @Transactional
    public Map<String, Object> importQuestionBank(
        Long courseId,
        MultipartFile file,
        String topicTag,
        DifficultyLevel difficultyLevel,
        QuestionType questionType,
        Integer questionCount,
        UserAccount lecturer
    ) {
        Course course = getOwnedCourse(courseId, lecturer);
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please upload a Word, PDF, or text file.");
        }

        String fileName = trimToDefault(file.getOriginalFilename(), "uploaded-file");
        String text = extractImportText(file, fileName);
        List<ImportedQuestionSeed> explicitQuestions = explicitImportedQuestions(text);
        List<String> sourceSentences = explicitQuestions.isEmpty() ? sourceSentences(text) : List.of();
        if (explicitQuestions.isEmpty() && sourceSentences.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Not enough readable text found to generate questions.");
        }

        int targetCount = Math.max(1, Math.min(20, questionCount == null ? 5 : questionCount));
        String effectiveTopic = trimToDefault(topicTag, course.getTitle());
        DifficultyLevel effectiveDifficulty = difficultyLevel == null ? DifficultyLevel.MEDIUM : difficultyLevel;
        List<QuestionBankItem> generated = explicitQuestions.isEmpty()
            ? generateImportedQuestions(
                course,
                lecturer,
                sourceSentences,
                effectiveTopic,
                effectiveDifficulty,
                questionType,
                targetCount
            )
            : generateStructuredImportedQuestions(
                course,
                lecturer,
                explicitQuestions,
                effectiveTopic,
                effectiveDifficulty,
                questionType
            );
        List<QuestionBankItem> saved = questionBankItemRepository.saveAll(generated);

        return Map.of(
            "message", saved.size() + " question(s) generated from " + fileName,
            "fileName", fileName,
            "sourceTextLength", text.length(),
            "generatedCount", saved.size(),
            "questions", saved.stream().map(this::toQuestionBankMap).toList()
        );
    }

    @Transactional
    public Map<String, Object> updateQuestionBank(Long questionBankId, QuestionBankRequest request, UserAccount lecturer) {
        QuestionBankItem item = getOwnedQuestionBankItem(questionBankId, lecturer);
        Course targetCourse = getOwnedCourse(request.courseId(), lecturer);
        item.setCourse(targetCourse);
        item.setQuestionType(request.questionType());
        item.setDifficultyLevel(request.difficultyLevel());
        item.setTopicTag(trimToDefault(request.topicTag(), "General"));
        item.setModuleTag(trimToDefault(request.moduleTag(), targetCourse.getTitle()));
        item.setPrompt(request.prompt());
        item.setExplanation(trimToNull(request.explanation()));
        item.setMediaUrl(trimToNull(request.mediaUrl()));
        item.setMediaType(trimToNull(request.mediaType()));
        item.setOptionsJson(writeSafe(request.options()));
        item.setCorrectAnswerJson(writeSafe(request.correctAnswer()));
        item.setPoints(request.points());
        questionBankItemRepository.save(item);
        return Map.of("message", "Question updated", "questionBankId", item.getId());
    }

    @Transactional
    public Map<String, Object> deleteQuestionBank(Long questionBankId, UserAccount lecturer) {
        QuestionBankItem item = getOwnedQuestionBankItem(questionBankId, lecturer);
        questionBankItemRepository.delete(item);
        return Map.of("message", "Question removed from bank", "questionBankId", questionBankId);
    }

    @Transactional
    public Map<String, Object> createQuiz(QuizRequest request, UserAccount lecturer) {
        Course course = getOwnedCourse(request.courseId(), lecturer);
        if (request.closeAt() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Due date/time is required for quiz.");
        }
        ReviewTiming reviewTiming = resolveReviewTiming(request.reviewTiming(), request.showResultImmediately());
        LocalDateTime releaseAt = resolveResultReleaseAt(reviewTiming, request.closeAt(), request.resultReleaseAt());
        validateQuizSchedule(request.openAt(), request.closeAt(), releaseAt, reviewTiming);

        List<QuestionBankItem> bankItems = new ArrayList<>();
        if (!request.questionBankIds().isEmpty()) {
            bankItems = questionBankItemRepository
                .findByIdInAndCourseLecturerId(request.questionBankIds(), lecturer.getId());
            if (bankItems.size() != request.questionBankIds().size()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Some question bank items are invalid");
            }
        } else if (request.autoSelect() != null) {
            bankItems = autoSelectBankItems(course, lecturer, request.autoSelect());
            if (bankItems.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "No question found for auto selection criteria");
            }
        }
        if (bankItems.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please select at least one question before creating quiz.");
        }
        ensureQuizHasMixedQuestionTypes(course, lecturer, bankItems);

        Quiz quiz = new Quiz();
        quiz.setCourse(course);
        quiz.setTitle(request.title());
        quiz.setDescription(trimToNull(request.description()));
        quiz.setTimeLimitMinutes(request.timeLimitMinutes());
        quiz.setMaxAttempts(request.maxAttempts());
        quiz.setPassingMark(request.passingMark());
        quiz.setPublished(request.published());
        quiz.setUnlockAfterVideos(request.unlockAfterVideos());
        quiz.setOpenAt(request.openAt());
        quiz.setCloseAt(request.closeAt());
        quiz.setResultReleaseAt(releaseAt);
        quiz.setShuffleQuestions(request.shuffleQuestions());
        quiz.setShuffleAnswers(request.shuffleAnswers());
        quiz.setQuestionDisplayMode(request.questionDisplayMode());
        applyFeedbackSettings(quiz, reviewTiming, releaseAt, request);
        quiz.setShowCorrectAnswer(enabled(request.showCorrectAnswer()));
        quiz.setShowExplanation(enabled(request.showExplanation()));
        quiz.setShowRelatedConcept(enabled(request.showRelatedConcept()));
        quiz.setShowLearningRecommendation(enabled(request.showLearningRecommendation()));
        quizRepository.save(quiz);

        List<Question> questions = new ArrayList<>();
        int sort = 1;
        for (QuestionBankItem bank : bankItems) {
            Question question = new Question();
            question.setQuiz(quiz);
            question.setQuestionType(bank.getQuestionType());
            question.setPrompt(bank.getPrompt());
            question.setExplanation(bank.getExplanation());
            question.setMediaUrl(bank.getMediaUrl());
            question.setMediaType(bank.getMediaType());
            question.setOptionsJson(bank.getOptionsJson());
            question.setCorrectAnswerJson(bank.getCorrectAnswerJson());
            question.setPoints(bank.getPoints());
            question.setSortOrder(sort++);
            question.setTopic(trimToDefault(bank.getTopicTag(), course.getTitle()));
            question.setDifficultyLevel(bank.getDifficultyLevel() == null ? DifficultyLevel.MEDIUM : bank.getDifficultyLevel());
            questions.add(question);
        }
        questionRepository.saveAll(questions);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Quiz successfully created.");
        response.put("quizId", quiz.getId());
        response.put("questionCount", questions.size());
        response.put("openAt", quiz.getOpenAt());
        response.put("closeAt", quiz.getCloseAt());
        response.put("resultReleaseAt", effectiveResultReleaseAt(quiz));
        return response;
    }

    @Transactional(readOnly = true)
    public byte[] quizImportTemplate() {
        List<List<String>> rows = new ArrayList<>();
        rows.add(QUIZ_IMPORT_HEADERS);
        rows.add(List.of(
            "Sample Migration Quiz",
            "Imported quiz template for backup or migration.",
            "60",
            "1",
            "50",
            "false",
            "true",
            "",
            LocalDateTime.now().plusDays(7).withSecond(0).withNano(0).toString(),
            "",
            "true",
            "true",
            QuizDisplayMode.ONE_BY_ONE.name(),
            "true",
            "true",
            "true",
            "true",
            "true",
            "true",
            "true",
            "1",
            QuestionType.MCQ.name(),
            "General",
            DifficultyLevel.MEDIUM.name(),
            "Which answer is correct?",
            "[\"Answer A\",\"Answer B\",\"Answer C\",\"Answer D\"]",
            "\"Answer A\"",
            "1",
            "Explain the correct answer here.",
            "",
            ""
        ));
        return toCsvBytes(rows);
    }

    @Transactional(readOnly = true)
    public byte[] exportQuizzes(UserAccount lecturer, Long courseId, Long quizId) {
        List<Quiz> quizzes = new ArrayList<>();
        if (quizId != null) {
            quizzes.add(getOwnedQuiz(quizId, lecturer));
        } else if (courseId != null) {
            Course course = getOwnedCourse(courseId, lecturer);
            quizzes.addAll(quizRepository.findByCourseId(course.getId()));
        } else {
            for (Course course : courseRepository.findByLecturerId(lecturer.getId())) {
                quizzes.addAll(quizRepository.findByCourseId(course.getId()));
            }
        }

        List<List<String>> rows = new ArrayList<>();
        rows.add(QUIZ_IMPORT_HEADERS);
        for (Quiz quiz : quizzes) {
            List<Question> questions = questionRepository.findByQuizIdOrderBySortOrder(quiz.getId());
            for (Question question : questions) {
                rows.add(List.of(
                    valueOrBlank(quiz.getTitle()),
                    valueOrBlank(quiz.getDescription()),
                    String.valueOf(quiz.getTimeLimitMinutes()),
                    String.valueOf(quiz.getMaxAttempts()),
                    String.valueOf(quiz.getPassingMark()),
                    String.valueOf(quiz.isPublished()),
                    String.valueOf(quiz.isUnlockAfterVideos()),
                    dateTimeOrBlank(quiz.getOpenAt()),
                    dateTimeOrBlank(quiz.getCloseAt()),
                    dateTimeOrBlank(quiz.getResultReleaseAt()),
                    String.valueOf(quiz.isShuffleQuestions()),
                    String.valueOf(quiz.isShuffleAnswers()),
                    displayModeOrDefault(quiz).name(),
                    String.valueOf(quiz.isShowResultImmediately()),
                    String.valueOf(quiz.isShowScoreAfterSubmission()),
                    String.valueOf(quiz.isShowCorrectAnswer()),
                    String.valueOf(quiz.isShowExplanation()),
                    String.valueOf(quiz.isShowRelatedConcept()),
                    String.valueOf(quiz.isShowLearningRecommendation()),
                    String.valueOf(quiz.isShowStudentAnswerReview()),
                    String.valueOf(question.getSortOrder()),
                    question.getQuestionType().name(),
                    valueOrBlank(question.getTopic()),
                    question.getDifficultyLevel() == null ? DifficultyLevel.MEDIUM.name() : question.getDifficultyLevel().name(),
                    valueOrBlank(question.getPrompt()),
                    valueOrBlank(question.getOptionsJson()),
                    valueOrBlank(question.getCorrectAnswerJson()),
                    String.valueOf(question.getPoints()),
                    valueOrBlank(question.getExplanation()),
                    valueOrBlank(question.getMediaUrl()),
                    valueOrBlank(question.getMediaType())
                ));
            }
        }
        return toCsvBytes(rows);
    }

    @Transactional
    public Map<String, Object> importQuizBackup(
        Long courseId,
        MultipartFile file,
        boolean deleteExistingQuestions,
        UserAccount lecturer
    ) {
        Course course = getOwnedCourse(courseId, lecturer);
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please upload a CSV, XLS, or XLSX quiz file.");
        }

        List<Map<String, String>> rows = readQuizImportRows(file);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Import file does not contain quiz questions.");
        }

        Map<String, String> first = rows.get(0);
        String requestedTitle = trimToDefault(first.get("quiz_title"), "Imported Quiz");
        Quiz quiz = null;
        if (deleteExistingQuestions) {
            quiz = quizRepository.findByCourseId(course.getId())
                .stream()
                .filter(item -> requestedTitle.equalsIgnoreCase(item.getTitle()))
                .findFirst()
                .orElse(null);
            if (quiz != null) {
                clearQuizRuntimeData(quiz.getId());
                questionRepository.deleteByQuizId(quiz.getId());
            }
        }

        if (quiz == null) {
            quiz = new Quiz();
            quiz.setCourse(course);
            if (!deleteExistingQuestions && quizTitleExists(course.getId(), requestedTitle)) {
                quiz.setTitle(requestedTitle + " (Imported " + LocalDateTime.now().withNano(0) + ")");
            } else {
                quiz.setTitle(requestedTitle);
            }
        } else {
            quiz.setTitle(requestedTitle);
        }

        LocalDateTime closeAt = parseDateTime(first.get("close_at"), LocalDateTime.now().plusDays(7));
        boolean showResultImmediately = parseBoolean(first.get("show_result_immediately"), true);
        ReviewTiming reviewTiming = parseReviewTiming(first.get("review_timing"), showResultImmediately);
        LocalDateTime resultReleaseAt = resolveResultReleaseAt(
            reviewTiming,
            closeAt,
            parseDateTime(first.get("result_release_at"), closeAt)
        );
        validateQuizSchedule(parseDateTime(first.get("open_at"), null), closeAt, resultReleaseAt, reviewTiming);

        quiz.setDescription(trimToNull(first.get("quiz_description")));
        quiz.setTimeLimitMinutes(Math.max(1, parseInt(first.get("time_limit_minutes"), 60)));
        quiz.setMaxAttempts(Math.max(1, parseInt(first.get("max_attempts"), 1)));
        quiz.setPassingMark(Math.max(0, Math.min(100, parseDouble(first.get("passing_mark"), 50.0))));
        quiz.setPublished(parseBoolean(first.get("published"), false));
        quiz.setUnlockAfterVideos(parseBoolean(first.get("unlock_after_videos"), true));
        quiz.setOpenAt(parseDateTime(first.get("open_at"), null));
        quiz.setCloseAt(closeAt);
        quiz.setResultReleaseAt(resultReleaseAt);
        quiz.setShuffleQuestions(parseBoolean(first.get("shuffle_questions"), true));
        quiz.setShuffleAnswers(parseBoolean(first.get("shuffle_answers"), true));
        quiz.setQuestionDisplayMode(parseDisplayMode(first.get("question_display_mode")));
        quiz.setReviewTiming(reviewTiming);
        quiz.setShowResultImmediately(reviewTiming == ReviewTiming.IMMEDIATE_AFTER_SUBMISSION);
        quiz.setManualReleaseStatus(parseBoolean(first.get("manual_release_status"), false));
        quiz.setShowScoreAfterSubmission(parseBoolean(first.get("show_score_after_submission"), true));
        quiz.setShowScoreBreakdown(parseBoolean(first.get("show_score_breakdown"), parseBoolean(first.get("show_score_after_submission"), true)));
        quiz.setShowSelectedAnswer(parseBoolean(first.get("show_selected_answer"), parseBoolean(first.get("show_student_answer_review"), true)));
        quiz.setShowCorrectAnswer(parseBoolean(first.get("show_correct_answer"), true));
        quiz.setShowExplanation(parseBoolean(first.get("show_explanation"), true));
        quiz.setShowRelatedConcept(parseBoolean(first.get("show_related_concept"), true));
        quiz.setShowLearningRecommendation(parseBoolean(first.get("show_learning_recommendation"), true));
        quiz.setShowConfidenceReflection(parseBoolean(first.get("show_confidence"), true));
        quiz.setShowStudentAnswerReview(parseBoolean(first.get("show_student_answer_review"), true));
        quizRepository.save(quiz);

        List<Question> questions = new ArrayList<>();
        int fallbackSort = 1;
        for (Map<String, String> row : rows) {
            String prompt = trimToNull(row.get("prompt"));
            if (prompt == null) {
                continue;
            }

            QuestionType questionType = parseQuestionType(row.get("question_type"));
            Question question = new Question();
            question.setQuiz(quiz);
            question.setQuestionType(questionType);
            question.setPrompt(prompt);
            question.setOptionsJson(jsonOrDefault(row.get("options_json"), defaultOptionsFor(questionType)));
            question.setCorrectAnswerJson(jsonOrDefault(row.get("correct_answer_json"), defaultCorrectAnswerFor(questionType)));
            question.setPoints(Math.max(1, parseInt(row.get("points"), 1)));
            question.setSortOrder(Math.max(1, parseInt(row.get("sort_order"), fallbackSort)));
            question.setTopic(trimToDefault(row.get("topic"), course.getTitle()));
            question.setDifficultyLevel(parseDifficultyLevel(row.get("difficulty_level")));
            question.setExplanation(trimToNull(row.get("explanation")));
            question.setMediaUrl(trimToNull(row.get("media_url")));
            question.setMediaType(trimToNull(row.get("media_type")));
            questions.add(question);
            fallbackSort++;
        }

        if (questions.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Import file has no valid question rows.");
        }

        questionRepository.saveAll(questions);
        return Map.of(
            "message", "Quiz imported successfully.",
            "quizId", quiz.getId(),
            "questionCount", questions.size(),
            "updatedExistingQuiz", deleteExistingQuestions
        );
    }

    @Transactional
    public Map<String, Object> publishQuiz(Long quizId, PublishRequest request, UserAccount lecturer) {
        Quiz quiz = quizRepository.findByIdAndCourseLecturerId(quizId, lecturer.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Quiz not found"));
        quiz.setPublished(request.published());
        quizRepository.save(quiz);
        return Map.of("message", "Quiz publication updated", "published", quiz.isPublished());
    }

    @Transactional
    public Map<String, Object> releaseQuizResult(Long quizId, UserAccount lecturer) {
        Quiz quiz = getOwnedQuiz(quizId, lecturer);
        quiz.setManualReleaseStatus(true);
        quizRepository.save(quiz);
        return Map.of(
            "message", "Quiz result released",
            "quizId", quiz.getId(),
            "reviewTiming", quiz.getReviewTiming().name(),
            "manualReleaseStatus", quiz.isManualReleaseStatus(),
            "resultReleased", isResultReleased(quiz, LocalDateTime.now())
        );
    }

    @Transactional
    public Map<String, Object> duplicateQuiz(Long quizId, UserAccount lecturer) {
        Quiz source = getOwnedQuiz(quizId, lecturer);
        Quiz copy = new Quiz();
        copy.setCourse(source.getCourse());
        copy.setTitle(source.getTitle() + " (Copy)");
        copy.setDescription(source.getDescription());
        copy.setTimeLimitMinutes(source.getTimeLimitMinutes());
        copy.setMaxAttempts(source.getMaxAttempts());
        copy.setPassingMark(source.getPassingMark());
        copy.setPublished(false);
        copy.setUnlockAfterVideos(source.isUnlockAfterVideos());
        copy.setOpenAt(source.getOpenAt());
        copy.setCloseAt(source.getCloseAt());
        copy.setResultReleaseAt(source.getResultReleaseAt());
        copy.setShuffleQuestions(source.isShuffleQuestions());
        copy.setShuffleAnswers(source.isShuffleAnswers());
        copy.setQuestionDisplayMode(source.getQuestionDisplayMode());
        copy.setShowResultImmediately(source.isShowResultImmediately());
        copy.setReviewTiming(source.getReviewTiming());
        copy.setManualReleaseStatus(false);
        copy.setShowSelectedAnswer(source.isShowSelectedAnswer());
        copy.setShowConfidenceReflection(source.isShowConfidenceReflection());
        copy.setShowScoreBreakdown(source.isShowScoreBreakdown());
        copy.setShowScoreAfterSubmission(source.isShowScoreAfterSubmission());
        copy.setShowCorrectAnswer(source.isShowCorrectAnswer());
        copy.setShowExplanation(source.isShowExplanation());
        copy.setShowRelatedConcept(source.isShowRelatedConcept());
        copy.setShowLearningRecommendation(source.isShowLearningRecommendation());
        copy.setShowStudentAnswerReview(source.isShowStudentAnswerReview());
        quizRepository.save(copy);

        List<Question> sourceQuestions = questionRepository.findByQuizIdOrderBySortOrder(source.getId());
        List<Question> clones = new ArrayList<>();
        for (Question sourceQuestion : sourceQuestions) {
            Question clone = new Question();
            clone.setQuiz(copy);
            clone.setQuestionType(sourceQuestion.getQuestionType());
            clone.setPrompt(sourceQuestion.getPrompt());
            clone.setExplanation(sourceQuestion.getExplanation());
            clone.setMediaUrl(sourceQuestion.getMediaUrl());
            clone.setMediaType(sourceQuestion.getMediaType());
            clone.setOptionsJson(sourceQuestion.getOptionsJson());
            clone.setCorrectAnswerJson(sourceQuestion.getCorrectAnswerJson());
            clone.setPoints(sourceQuestion.getPoints());
            clone.setSortOrder(sourceQuestion.getSortOrder());
            clone.setTopic(sourceQuestion.getTopic());
            clone.setDifficultyLevel(sourceQuestion.getDifficultyLevel());
            clones.add(clone);
        }
        questionRepository.saveAll(clones);

        return Map.of(
            "message", "Quiz duplicated",
            "quizId", copy.getId(),
            "questionCount", clones.size()
        );
    }

    @Transactional
    public Map<String, Object> deleteQuiz(Long quizId, UserAccount lecturer) {
        Quiz quiz = getOwnedQuiz(quizId, lecturer);
        topicLearningResourceRepository.deleteByPracticeQuizId(quizId);
        tryDeleteOptional(() -> markAdjustmentAuditRepository.deleteByAttemptAnswerAttemptQuizId(quizId));
        tryDeleteOptional(() -> feedbackViewLogRepository.deleteByAttemptQuizId(quizId));
        quizAttemptAnswerRepository.deleteByAttemptQuizId(quizId);
        quizAttemptRepository.deleteByQuizId(quizId);
        questionRepository.deleteByQuizId(quizId);
        quizRepository.delete(quiz);
        return Map.of("message", "Quiz deleted", "quizId", quizId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> previewQuiz(Long quizId, UserAccount lecturer) {
        Quiz quiz = getOwnedQuiz(quizId, lecturer);
        List<Map<String, Object>> questions = questionRepository.findByQuizIdOrderBySortOrder(quizId)
            .stream()
            .map(question -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("questionId", question.getId());
                row.put("sortOrder", question.getSortOrder());
                row.put("questionType", question.getQuestionType().name());
                row.put("prompt", question.getPrompt());
                row.put("explanation", question.getExplanation() == null ? "" : question.getExplanation());
                row.put("mediaUrl", question.getMediaUrl() == null ? "" : question.getMediaUrl());
                row.put("mediaType", question.getMediaType() == null ? "" : question.getMediaType());
                row.put("options", parseSafe(question.getOptionsJson()));
                row.put("correctAnswer", parseSafe(question.getCorrectAnswerJson()));
                row.put("points", question.getPoints());
                row.put("topic", question.getTopic() == null ? "" : question.getTopic());
                row.put("difficultyLevel", question.getDifficultyLevel() == null ? DifficultyLevel.MEDIUM.name() : question.getDifficultyLevel().name());
                return row;
            })
            .toList();

        Map<String, Object> quizInfo = new LinkedHashMap<>();
        quizInfo.put("quizId", quiz.getId());
        quizInfo.put("title", quiz.getTitle());
        quizInfo.put("description", quiz.getDescription());
        quizInfo.put("courseId", quiz.getCourse().getId());
        quizInfo.put("courseTitle", quiz.getCourse().getTitle());
        quizInfo.put("timeLimitMinutes", quiz.getTimeLimitMinutes());
        quizInfo.put("maxAttempts", quiz.getMaxAttempts());
        quizInfo.put("passingMark", quiz.getPassingMark());
        quizInfo.put("openAt", quiz.getOpenAt());
        quizInfo.put("closeAt", quiz.getCloseAt());
        quizInfo.put("resultReleaseAt", effectiveResultReleaseAt(quiz));
        quizInfo.put("reviewTiming", quiz.getReviewTiming().name());
        quizInfo.put("manualReleaseStatus", quiz.isManualReleaseStatus());
        quizInfo.put("shuffleQuestions", quiz.isShuffleQuestions());
        quizInfo.put("shuffleAnswers", quiz.isShuffleAnswers());
        quizInfo.put("questionDisplayMode", displayModeOrDefault(quiz).name());
        quizInfo.put("showResultImmediately", quiz.isShowResultImmediately());
        quizInfo.put("feedbackSettings", feedbackSettings(quiz));
        quizInfo.put("published", quiz.isPublished());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("quiz", quizInfo);
        response.put("questions", questions);
        return response;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getResetRequests(UserAccount lecturer) {
        return quizResetRequestRepository.findByCourseLecturerIdOrderByRequestedAtDesc(lecturer.getId())
            .stream()
            .map(this::toResetRequestRow)
            .toList();
    }

    @Transactional
    public Map<String, Object> approveResetRequest(UserAccount lecturer, Long requestId) {
        QuizResetRequest resetRequest = getOwnedResetRequest(lecturer, requestId);
        if (resetRequest.getStatus() != ResetRequestStatus.PENDING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only pending reset requests can be approved");
        }

        List<QuizAttempt> attempts = quizAttemptRepository.findByQuizCourseIdAndStudentId(
            resetRequest.getCourse().getId(),
            resetRequest.getStudent().getId()
        );
        List<Long> attemptIds = attempts.stream().map(QuizAttempt::getId).toList();
        if (!attemptIds.isEmpty()) {
            markAdjustmentAuditRepository.deleteByAttemptAnswerAttemptIdIn(attemptIds);
            feedbackViewLogRepository.deleteByAttemptIdIn(attemptIds);
            quizAttemptAnswerRepository.deleteByAttemptIdIn(attemptIds);
            quizAttemptRepository.deleteAll(attempts);
        }

        resetRequest.setStatus(ResetRequestStatus.APPROVED);
        resetRequest.setResolvedAt(LocalDateTime.now());
        quizResetRequestRepository.save(resetRequest);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Reset request approved");
        response.put("deletedAttempts", attemptIds.size());
        response.put("request", toResetRequestRow(resetRequest));
        return response;
    }

    @Transactional
    public Map<String, Object> rejectResetRequest(UserAccount lecturer, Long requestId) {
        QuizResetRequest resetRequest = getOwnedResetRequest(lecturer, requestId);
        if (resetRequest.getStatus() != ResetRequestStatus.PENDING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only pending reset requests can be rejected");
        }
        resetRequest.setStatus(ResetRequestStatus.REJECTED);
        resetRequest.setResolvedAt(LocalDateTime.now());
        quizResetRequestRepository.save(resetRequest);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Reset request rejected");
        response.put("request", toResetRequestRow(resetRequest));
        return response;
    }

    @Transactional
    public Map<String, Object> deleteResetRequest(UserAccount lecturer, Long requestId) {
        QuizResetRequest resetRequest = getOwnedResetRequest(lecturer, requestId);
        quizResetRequestRepository.delete(resetRequest);
        return Map.of("message", "Reset request deleted");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getResults(UserAccount lecturer, Long quizId, Long courseId) {
        List<QuizAttempt> attempts = quizId == null
            ? quizAttemptRepository.findByQuizCourseLecturerIdOrderBySubmittedAtDesc(lecturer.getId())
            : quizAttemptRepository.findByQuizIdAndQuizCourseLecturerIdOrderBySubmittedAtDesc(quizId, lecturer.getId());

        if (courseId != null) {
            getOwnedCourse(courseId, lecturer);
        }

        return attempts.stream()
            .filter(attempt -> attempt.getSubmittedAt() != null)
            .filter(attempt -> courseId == null || Objects.equals(attempt.getQuiz().getCourse().getId(), courseId))
            .map(attempt -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("attemptId", attempt.getId());
                row.put("studentId", attempt.getStudent().getId());
                row.put("studentName", attempt.getStudent().getFullName());
                row.put("courseId", attempt.getQuiz().getCourse().getId());
                row.put("courseTitle", attempt.getQuiz().getCourse().getTitle());
                row.put("quizId", attempt.getQuiz().getId());
                row.put("quizTitle", attempt.getQuiz().getTitle());
                row.put("attemptNumber", attempt.getAttemptNumber());
                row.put("score", attempt.getScore());
                row.put("passed", attempt.getPassed());
                row.put("startedAt", attempt.getStartedAt());
                row.put("submittedAt", attempt.getSubmittedAt());
                row.put("durationSeconds", durationSeconds(attempt));
                row.put("feedback", attempt.getFeedback());
                row.put("resultReleaseAt", effectiveResultReleaseAt(attempt.getQuiz()));
                row.put("resultReleased", isResultReleased(attempt.getQuiz(), LocalDateTime.now()));
                return row;
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getResultDetail(UserAccount lecturer, Long attemptId) {
        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Attempt not found"));

        if (!Objects.equals(attempt.getQuiz().getCourse().getLecturer().getId(), lecturer.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this attempt");
        }

        List<Map<String, Object>> answers = quizAttemptAnswerRepository.findByAttemptId(attemptId)
            .stream()
            .sorted(Comparator.comparing(answer -> answer.getQuestion().getSortOrder()))
            .map(this::toAttemptAnswerForLecturer)
            .toList();

        List<Map<String, Object>> auditLog = markAdjustmentAuditRepository
            .findByAttemptAnswerAttemptIdOrderByChangedAtDesc(attemptId)
            .stream()
            .map(log -> Map.<String, Object>of(
                "auditId", log.getId(),
                "answerId", log.getAttemptAnswer().getId(),
                "lecturerName", log.getLecturer().getFullName(),
                "previousPoints", log.getPreviousPoints(),
                "newPoints", log.getNewPoints(),
                "reason", log.getReason() == null ? "" : log.getReason(),
                "changedAt", log.getChangedAt()
            ))
            .toList();

        Map<String, Object> attemptSummary = new LinkedHashMap<>();
        attemptSummary.put("attemptId", attempt.getId());
        attemptSummary.put("quizId", attempt.getQuiz().getId());
        attemptSummary.put("quizTitle", attempt.getQuiz().getTitle());
        attemptSummary.put("courseId", attempt.getQuiz().getCourse().getId());
        attemptSummary.put("courseTitle", attempt.getQuiz().getCourse().getTitle());
        attemptSummary.put("studentId", attempt.getStudent().getId());
        attemptSummary.put("studentName", attempt.getStudent().getFullName());
        attemptSummary.put("attemptNumber", attempt.getAttemptNumber());
        attemptSummary.put("startedAt", attempt.getStartedAt());
        attemptSummary.put("submittedAt", attempt.getSubmittedAt());
        attemptSummary.put("durationSeconds", durationSeconds(attempt));
        attemptSummary.put("score", attempt.getScore());
        attemptSummary.put("passed", attempt.getPassed());
        attemptSummary.put("feedback", attempt.getFeedback());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("attempt", attemptSummary);
        response.put("answers", answers);
        response.put("auditLog", auditLog);
        return response;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAssessmentInsights(UserAccount lecturer, Long quizId, Long courseId) {
        List<QuizAttempt> attempts = quizId == null
            ? quizAttemptRepository.findByQuizCourseLecturerIdOrderBySubmittedAtDesc(lecturer.getId())
            : quizAttemptRepository.findByQuizIdAndQuizCourseLecturerIdOrderBySubmittedAtDesc(quizId, lecturer.getId());

        if (courseId != null) {
            getOwnedCourse(courseId, lecturer);
        }

        List<QuizAttempt> submittedAttempts = attempts.stream()
            .filter(attempt -> attempt.getSubmittedAt() != null)
            .filter(attempt -> courseId == null || Objects.equals(attempt.getQuiz().getCourse().getId(), courseId))
            .toList();

        List<Long> attemptIds = submittedAttempts.stream().map(QuizAttempt::getId).toList();
        List<QuizAttemptAnswer> answers = attemptIds.isEmpty()
            ? List.of()
            : quizAttemptAnswerRepository.findByAttemptIdIn(attemptIds);

        Map<String, InsightTopic> topicMap = new LinkedHashMap<>();
        Map<Long, InsightQuestion> questionMap = new LinkedHashMap<>();
        int highConfidenceWrong = 0;
        int fastWrong = 0;
        int slowWrong = 0;
        int totalSeconds = 0;
        int timedAnswers = 0;
        int correctAnswerCount = 0;
        int wrongAnswerCount = 0;

        for (QuizAttemptAnswer answer : answers) {
            double maxPoints = answer.getQuestion().getPoints() == null ? 0.0 : answer.getQuestion().getPoints();
            double awarded = answer.getAwardedPoints() == null ? 0.0 : answer.getAwardedPoints();
            String topic = trimToDefault(answer.getTopicTag(), answer.getQuestion().getQuiz().getCourse().getTitle());
            topicMap.computeIfAbsent(topic, InsightTopic::new).add(maxPoints, awarded, answer.isCorrect());
            questionMap.computeIfAbsent(answer.getQuestion().getId(), id -> new InsightQuestion(answer)).add(answer.isCorrect());
            if (answer.isCorrect()) {
                correctAnswerCount++;
            } else {
                wrongAnswerCount++;
            }

            if ("HIGH".equalsIgnoreCase(answer.getConfidenceLevel()) && !answer.isCorrect()) {
                highConfidenceWrong++;
            }
            if ("FAST_WRONG".equalsIgnoreCase(answer.getTimeSignal())) {
                fastWrong++;
            }
            if ("SLOW_WRONG".equalsIgnoreCase(answer.getTimeSignal())) {
                slowWrong++;
            }
            if (answer.getTimeSpentSeconds() != null && answer.getTimeSpentSeconds() > 0) {
                timedAnswers++;
                totalSeconds += answer.getTimeSpentSeconds();
            }
        }

        double averageScore = submittedAttempts.isEmpty()
            ? 0.0
            : round2(submittedAttempts.stream().mapToDouble(attempt -> attempt.getScore() == null ? 0.0 : attempt.getScore()).average().orElse(0.0));
        double topScore = submittedAttempts.isEmpty()
            ? 0.0
            : round2(submittedAttempts.stream().mapToDouble(attempt -> attempt.getScore() == null ? 0.0 : attempt.getScore()).max().orElse(0.0));
        long passCount = submittedAttempts.stream().filter(attempt -> Boolean.TRUE.equals(attempt.getPassed())).count();

        List<Map<String, Object>> weakTopics = topicMap.values().stream()
            .map(InsightTopic::toMap)
            .sorted((left, right) -> Double.compare(toDouble(left.get("score"), 0.0), toDouble(right.get("score"), 0.0)))
            .limit(6)
            .toList();

        List<Map<String, Object>> hardestQuestions = questionMap.values().stream()
            .map(InsightQuestion::toMap)
            .sorted((left, right) -> Integer.compare(toInt(right.get("wrongCount"), 0), toInt(left.get("wrongCount"), 0)))
            .limit(6)
            .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("attemptCount", submittedAttempts.size());
        response.put("averageScore", averageScore);
        response.put("topScore", topScore);
        response.put("passRate", submittedAttempts.isEmpty() ? 0 : Math.round(passCount * 100.0 / submittedAttempts.size()));
        response.put("answerCount", answers.size());
        response.put("correctAnswerCount", correctAnswerCount);
        response.put("wrongAnswerCount", wrongAnswerCount);
        response.put("weakTopics", weakTopics);
        response.put("hardestQuestions", hardestQuestions);
        response.put(
            "confidenceRisk",
            Map.of(
                "highConfidenceWrong", highConfidenceWrong,
                "message", highConfidenceWrong > 0
                    ? "Some students answered wrongly with high confidence."
                    : "No high-confidence wrong answers detected."
            )
        );
        response.put(
            "timeRisk",
            Map.of(
                "averageSeconds", timedAnswers == 0 ? 0 : Math.round(totalSeconds / (float) timedAnswers),
                "fastWrong", fastWrong,
                "slowWrong", slowWrong,
                "message", fastWrong > 0
                    ? "Fast wrong answers suggest students may be rushing."
                    : slowWrong > 0 ? "Some students spent long time but still missed key concepts." : "Timing pattern is stable."
            )
        );
        return response;
    }

    @Transactional
    public Map<String, Object> adjustAnswerScore(UserAccount lecturer, Long answerId, MarkAdjustmentRequest request) {
        QuizAttemptAnswer answer = quizAttemptAnswerRepository.findByIdAndAttemptQuizCourseLecturerId(answerId, lecturer.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Answer not found"));

        double maxPoints = answer.getQuestion().getPoints();
        double adjusted = round2(request.awardedPoints());
        if (adjusted < 0 || adjusted > maxPoints) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Awarded points must be between 0 and " + maxPoints);
        }

        double previousPoints = answer.getAwardedPoints() == null ? 0.0 : answer.getAwardedPoints();
        answer.setAwardedPoints(adjusted);
        answer.setCorrect(adjusted >= maxPoints);
        quizAttemptAnswerRepository.save(answer);

        MarkAdjustmentAudit audit = new MarkAdjustmentAudit();
        audit.setAttemptAnswer(answer);
        audit.setLecturer(lecturer);
        audit.setPreviousPoints(round2(previousPoints));
        audit.setNewPoints(adjusted);
        audit.setReason(trimToNull(request.reason()));
        markAdjustmentAuditRepository.save(audit);

        QuizAttempt attempt = answer.getAttempt();
        recalculateAttemptSummary(attempt);

        return Map.of(
            "message", "Score adjusted and attempt recalculated",
            "attemptId", attempt.getId(),
            "answerId", answer.getId(),
            "previousPoints", round2(previousPoints),
            "newPoints", adjusted,
            "updatedScore", attempt.getScore(),
            "passed", attempt.getPassed()
        );
    }

    private void validateQuizSchedule(
        LocalDateTime openAt,
        LocalDateTime closeAt,
        LocalDateTime resultReleaseAt,
        ReviewTiming reviewTiming
    ) {
        if (openAt != null && closeAt != null && !openAt.isBefore(closeAt)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Open date/time must be before close date/time");
        }
        if (reviewTiming == ReviewTiming.AFTER_DUE_DATE && closeAt == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Close date/time is required when feedback is released after the due date.");
        }
        if (resultReleaseAt != null && openAt != null && resultReleaseAt.isBefore(openAt)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Result release date/time cannot be earlier than quiz open time.");
        }
        if (resultReleaseAt != null && closeAt != null && resultReleaseAt.isBefore(closeAt)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Result release date/time must be on or after quiz due date/time.");
        }
    }

    private ReviewTiming resolveReviewTiming(ReviewTiming requested, Boolean showResultImmediately) {
        if (requested != null) {
            return requested;
        }
        return Boolean.FALSE.equals(showResultImmediately)
            ? ReviewTiming.AFTER_DUE_DATE
            : ReviewTiming.IMMEDIATE_AFTER_SUBMISSION;
    }

    private ReviewTiming parseReviewTiming(String value, boolean showResultImmediately) {
        String normalized = normalize(value).replace("-", "_").replace(" ", "_").toUpperCase();
        if (!normalized.isBlank()) {
            try {
                return ReviewTiming.valueOf(normalized);
            } catch (IllegalArgumentException ignored) {
                // Fall through to legacy immediate/scheduled field.
            }
        }
        return showResultImmediately ? ReviewTiming.IMMEDIATE_AFTER_SUBMISSION : ReviewTiming.AFTER_DUE_DATE;
    }

    private LocalDateTime resolveResultReleaseAt(ReviewTiming reviewTiming, LocalDateTime closeAt, LocalDateTime requestedReleaseAt) {
        if (reviewTiming == ReviewTiming.AFTER_DUE_DATE) {
            return requestedReleaseAt == null ? closeAt : requestedReleaseAt;
        }
        return null;
    }

    private void applyFeedbackSettings(Quiz quiz, ReviewTiming reviewTiming, LocalDateTime releaseAt, QuizRequest request) {
        boolean showScoreBreakdown = request.showScoreBreakdown() == null
            ? enabled(request.showScoreAfterSubmission())
            : Boolean.TRUE.equals(request.showScoreBreakdown());
        boolean showSelectedAnswer = request.showSelectedAnswer() == null
            ? enabled(request.showStudentAnswerReview())
            : Boolean.TRUE.equals(request.showSelectedAnswer());

        quiz.setReviewTiming(reviewTiming);
        quiz.setManualReleaseStatus(Boolean.TRUE.equals(request.manualReleaseStatus()));
        quiz.setShowResultImmediately(reviewTiming == ReviewTiming.IMMEDIATE_AFTER_SUBMISSION);
        quiz.setResultReleaseAt(releaseAt);
        quiz.setShowScoreAfterSubmission(showScoreBreakdown);
        quiz.setShowScoreBreakdown(showScoreBreakdown);
        quiz.setShowSelectedAnswer(showSelectedAnswer);
        quiz.setShowConfidenceReflection(enabled(request.showConfidence()));
        quiz.setShowStudentAnswerReview(
            showSelectedAnswer
                || enabled(request.showCorrectAnswer())
                || enabled(request.showExplanation())
                || enabled(request.showConfidence())
                || showScoreBreakdown
        );
    }

    private byte[] toCsvBytes(List<List<String>> rows) {
        StringBuilder builder = new StringBuilder();
        for (List<String> row : rows) {
            for (int i = 0; i < row.size(); i++) {
                if (i > 0) {
                    builder.append(',');
                }
                builder.append(csvCell(row.get(i)));
            }
            builder.append('\n');
        }
        return builder.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String csvCell(String value) {
        String safe = value == null ? "" : value;
        boolean quote = safe.contains(",") || safe.contains("\"") || safe.contains("\n") || safe.contains("\r");
        if (!quote) {
            return safe;
        }
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }

    private List<Map<String, String>> readQuizImportRows(MultipartFile file) {
        String fileName = trimToDefault(file.getOriginalFilename(), "quiz-import.csv").toLowerCase();
        try {
            List<List<String>> table = fileName.endsWith(".xlsx")
                ? readXlsxTable(file)
                : readCsvTable(new String(file.getBytes(), StandardCharsets.UTF_8));
            if (table.isEmpty()) {
                return List.of();
            }

            List<String> headers = table.get(0).stream()
                .map(header -> normalize(header).replace(" ", "_"))
                .toList();
            List<Map<String, String>> rows = new ArrayList<>();
            for (int rowIndex = 1; rowIndex < table.size(); rowIndex++) {
                List<String> row = table.get(rowIndex);
                Map<String, String> mapped = new LinkedHashMap<>();
                boolean hasContent = false;
                for (int col = 0; col < headers.size(); col++) {
                    String value = col < row.size() ? row.get(col).trim() : "";
                    mapped.put(headers.get(col), value);
                    if (!value.isBlank()) {
                        hasContent = true;
                    }
                }
                if (hasContent) {
                    rows.add(mapped);
                }
            }
            return rows;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to read quiz import file.");
        }
    }

    private List<List<String>> readCsvTable(String csv) {
        String clean = csv == null ? "" : csv.replace("\uFEFF", "");
        List<List<String>> rows = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < clean.length(); i++) {
            char ch = clean.charAt(i);
            if (quoted) {
                if (ch == '"' && i + 1 < clean.length() && clean.charAt(i + 1) == '"') {
                    cell.append('"');
                    i++;
                } else if (ch == '"') {
                    quoted = false;
                } else {
                    cell.append(ch);
                }
                continue;
            }

            if (ch == '"') {
                quoted = true;
            } else if (ch == ',') {
                row.add(cell.toString());
                cell.setLength(0);
            } else if (ch == '\n') {
                row.add(cell.toString());
                rows.add(row);
                row = new ArrayList<>();
                cell.setLength(0);
            } else if (ch != '\r') {
                cell.append(ch);
            }
        }
        row.add(cell.toString());
        if (row.stream().anyMatch(value -> !value.isBlank())) {
            rows.add(row);
        }
        return rows;
    }

    private List<List<String>> readXlsxTable(MultipartFile file) throws IOException {
        Map<String, String> entries = new LinkedHashMap<>();
        try (ZipInputStream zip = new ZipInputStream(file.getInputStream())) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (!entry.isDirectory()
                    && (entry.getName().equals("xl/sharedStrings.xml") || entry.getName().startsWith("xl/worksheets/sheet"))) {
                    entries.put(entry.getName(), new String(zip.readAllBytes(), StandardCharsets.UTF_8));
                }
            }
        }

        String sheet = entries.entrySet().stream()
            .filter(entry -> entry.getKey().startsWith("xl/worksheets/sheet"))
            .map(Map.Entry::getValue)
            .findFirst()
            .orElse("");
        if (sheet.isBlank()) {
            return List.of();
        }

        List<String> sharedStrings = parseSharedStrings(entries.getOrDefault("xl/sharedStrings.xml", ""));
        Map<Integer, Map<Integer, String>> table = new LinkedHashMap<>();
        Matcher cellMatcher = Pattern.compile("<c\\s+([^>]*)>(.*?)</c>", Pattern.DOTALL).matcher(sheet);
        int maxRow = 0;
        int maxCol = 0;
        while (cellMatcher.find()) {
            String attrs = cellMatcher.group(1);
            String body = cellMatcher.group(2);
            Matcher refMatcher = Pattern.compile("r=\"([A-Z]+)(\\d+)\"").matcher(attrs);
            if (!refMatcher.find()) {
                continue;
            }
            int col = excelColumnIndex(refMatcher.group(1));
            int row = Integer.parseInt(refMatcher.group(2));
            String value = xlsxCellValue(attrs, body, sharedStrings);
            table.computeIfAbsent(row, ignored -> new LinkedHashMap<>()).put(col, value);
            maxRow = Math.max(maxRow, row);
            maxCol = Math.max(maxCol, col);
        }

        List<List<String>> rows = new ArrayList<>();
        for (int rowIndex = 1; rowIndex <= maxRow; rowIndex++) {
            Map<Integer, String> values = table.getOrDefault(rowIndex, Map.of());
            List<String> row = new ArrayList<>();
            for (int colIndex = 1; colIndex <= maxCol; colIndex++) {
                row.add(values.getOrDefault(colIndex, ""));
            }
            if (row.stream().anyMatch(value -> !value.isBlank())) {
                rows.add(row);
            }
        }
        return rows;
    }

    private List<String> parseSharedStrings(String xml) {
        List<String> values = new ArrayList<>();
        Matcher itemMatcher = Pattern.compile("<si[^>]*>(.*?)</si>", Pattern.DOTALL).matcher(xml);
        while (itemMatcher.find()) {
            String item = itemMatcher.group(1);
            StringBuilder text = new StringBuilder();
            Matcher textMatcher = Pattern.compile("<t[^>]*>(.*?)</t>", Pattern.DOTALL).matcher(item);
            while (textMatcher.find()) {
                text.append(xmlUnescape(textMatcher.group(1)));
            }
            values.add(text.toString());
        }
        return values;
    }

    private String xlsxCellValue(String attrs, String body, List<String> sharedStrings) {
        Matcher inlineMatcher = Pattern.compile("<t[^>]*>(.*?)</t>", Pattern.DOTALL).matcher(body);
        if (attrs.contains("t=\"inlineStr\"") && inlineMatcher.find()) {
            return xmlUnescape(inlineMatcher.group(1));
        }

        Matcher valueMatcher = Pattern.compile("<v[^>]*>(.*?)</v>", Pattern.DOTALL).matcher(body);
        if (!valueMatcher.find()) {
            return "";
        }

        String raw = xmlUnescape(valueMatcher.group(1)).trim();
        if (attrs.contains("t=\"s\"")) {
            int index = parseInt(raw, -1);
            return index >= 0 && index < sharedStrings.size() ? sharedStrings.get(index) : "";
        }
        if (attrs.contains("t=\"b\"")) {
            return "1".equals(raw) ? "true" : "false";
        }
        return raw;
    }

    private int excelColumnIndex(String column) {
        int value = 0;
        for (int i = 0; i < column.length(); i++) {
            value = value * 26 + (column.charAt(i) - 'A' + 1);
        }
        return value;
    }

    private String xmlUnescape(String value) {
        return value
            .replace("&quot;", "\"")
            .replace("&apos;", "'")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&amp;", "&");
    }

    private boolean quizTitleExists(Long courseId, String title) {
        return quizRepository.findByCourseId(courseId)
            .stream()
            .anyMatch(quiz -> title.equalsIgnoreCase(quiz.getTitle()));
    }

    private void clearQuizRuntimeData(Long quizId) {
        tryDeleteOptional(() -> markAdjustmentAuditRepository.deleteByAttemptAnswerAttemptQuizId(quizId));
        tryDeleteOptional(() -> feedbackViewLogRepository.deleteByAttemptQuizId(quizId));
        quizAttemptAnswerRepository.deleteByAttemptQuizId(quizId);
        quizAttemptRepository.deleteByQuizId(quizId);
    }

    private String jsonOrDefault(String value, Object fallback) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            return writeSafe(fallback);
        }
        try {
            return objectMapper.writeValueAsString(objectMapper.readTree(trimmed));
        } catch (JsonProcessingException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Question options and correct answers must use valid JSON.");
        }
    }

    private Object defaultOptionsFor(QuestionType type) {
        if (type == QuestionType.TRUE_FALSE) {
            return List.of("True", "False");
        }
        if (type == QuestionType.SHORT_ANSWER) {
            return Map.of("keywords", List.of("answer"));
        }
        if (type == QuestionType.MATCHING) {
            return Map.of("left", List.of("Prompt 1", "Prompt 2"), "right", List.of("Answer 1", "Answer 2"));
        }
        return List.of("Answer A", "Answer B", "Answer C", "Answer D");
    }

    private Object defaultCorrectAnswerFor(QuestionType type) {
        if (type == QuestionType.TRUE_FALSE) {
            return "True";
        }
        if (type == QuestionType.SHORT_ANSWER) {
            return "answer";
        }
        if (type == QuestionType.MATCHING) {
            return Map.of("Prompt 1", "Answer 1", "Prompt 2", "Answer 2");
        }
        if (type == QuestionType.MULTI_SELECT) {
            return List.of("Answer A");
        }
        return "Answer A";
    }

    private QuestionType parseQuestionType(String value) {
        try {
            return value == null || value.isBlank()
                ? QuestionType.MCQ
                : QuestionType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid question type: " + value);
        }
    }

    private DifficultyLevel parseDifficultyLevel(String value) {
        try {
            return value == null || value.isBlank()
                ? DifficultyLevel.MEDIUM
                : DifficultyLevel.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return DifficultyLevel.MEDIUM;
        }
    }

    private QuizDisplayMode parseDisplayMode(String value) {
        try {
            return value == null || value.isBlank()
                ? QuizDisplayMode.ONE_BY_ONE
                : QuizDisplayMode.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return QuizDisplayMode.ONE_BY_ONE;
        }
    }

    private LocalDateTime parseDateTime(String value, LocalDateTime fallback) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            return fallback;
        }
        try {
            return LocalDateTime.parse(trimmed);
        } catch (RuntimeException ex) {
            return fallback;
        }
    }

    private boolean parseBoolean(String value, boolean fallback) {
        String normalized = normalize(value);
        if (normalized.isBlank()) {
            return fallback;
        }
        return List.of("true", "1", "yes", "y", "on").contains(normalized);
    }

    private int parseInt(String value, int fallback) {
        try {
            return value == null || value.isBlank() ? fallback : Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private double parseDouble(String value, double fallback) {
        try {
            return value == null || value.isBlank() ? fallback : Double.parseDouble(value.trim());
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private String valueOrBlank(String value) {
        return value == null ? "" : value;
    }

    private String dateTimeOrBlank(LocalDateTime value) {
        return value == null ? "" : value.toString();
    }

    private boolean isResultReleased(Quiz quiz, LocalDateTime now) {
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

    private QuizDisplayMode displayModeOrDefault(Quiz quiz) {
        return quiz.getQuestionDisplayMode() == null
            ? QuizDisplayMode.ONE_BY_ONE
            : quiz.getQuestionDisplayMode();
    }

    private List<QuestionBankItem> autoSelectBankItems(
        Course course,
        UserAccount lecturer,
        QuizAutoSelectRequest criteria
    ) {
        List<QuestionBankItem> all = questionBankItemRepository.findByCourseIdAndCourseLecturerId(course.getId(), lecturer.getId());
        String topicFilter = normalizeNullable(criteria.topicTag());
        String keywordFilter = normalizeNullable(criteria.keyword());

        List<QuestionBankItem> candidates = all.stream()
            .filter(item -> criteria.questionType() == null || criteria.questionType().equals(item.getQuestionType()))
            .filter(item -> criteria.difficultyLevel() == null || criteria.difficultyLevel().equals(item.getDifficultyLevel()))
            .filter(item -> topicFilter == null || normalize(item.getTopicTag()).contains(topicFilter))
            .filter(item -> criteria.createdFrom() == null || !item.getCreatedAt().toLocalDate().isBefore(criteria.createdFrom()))
            .filter(item -> criteria.createdTo() == null || !item.getCreatedAt().toLocalDate().isAfter(criteria.createdTo()))
            .filter(item -> keywordFilter == null || matchesSearch(item, keywordFilter))
            .sorted(Comparator.comparing(QuestionBankItem::getCreatedAt).reversed())
            .toList();

        if (criteria.questionType() != null || criteria.questionCount() <= 1) {
            return candidates.stream()
                .limit(criteria.questionCount())
                .toList();
        }

        List<QuestionBankItem> selected = new ArrayList<>();
        Set<Long> selectedIds = new HashSet<>();
        for (QuestionType type : QuestionType.values()) {
            candidates.stream()
                .filter(item -> type.equals(item.getQuestionType()))
                .findFirst()
                .ifPresent(item -> {
                    if (selected.size() < criteria.questionCount()) {
                        selected.add(item);
                        selectedIds.add(item.getId());
                    }
                });
        }

        for (QuestionBankItem item : candidates) {
            if (selected.size() >= criteria.questionCount()) {
                break;
            }
            if (selectedIds.add(item.getId())) {
                selected.add(item);
            }
        }

        return selected;
    }

    private void ensureQuizHasMixedQuestionTypes(Course course, UserAccount lecturer, List<QuestionBankItem> bankItems) {
        if (bankItems.size() <= 1 || countQuestionTypes(bankItems) > 1) {
            return;
        }

        List<QuestionBankItem> available = questionBankItemRepository.findByCourseIdAndCourseLecturerId(course.getId(), lecturer.getId());
        if (countQuestionTypes(available) > 1) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "Please include mixed question types in this quiz, for example MCQ with multi-select, true/false, short answer, or matching."
            );
        }
    }

    private long countQuestionTypes(List<QuestionBankItem> bankItems) {
        return bankItems.stream()
            .map(QuestionBankItem::getQuestionType)
            .filter(Objects::nonNull)
            .distinct()
            .count();
    }

    private boolean matchesSearch(QuestionBankItem item, String searchFilter) {
        return normalize(item.getPrompt()).contains(searchFilter)
            || normalize(item.getCourse().getTitle()).contains(searchFilter)
            || normalize(item.getTopicTag()).contains(searchFilter)
            || normalize(item.getModuleTag()).contains(searchFilter)
            || normalize(item.getQuestionType().name()).contains(searchFilter);
    }

    private Map<String, Object> toQuestionBankMap(QuestionBankItem item) {
        Map<String, Object> row = new LinkedHashMap<>();
        String createdBy = item.getCreator() == null
            ? "Lecturer"
            : trimToDefault(item.getCreator().getFullName(), item.getCreator().getEmail());
        long usageCount = questionRepository.countDistinctQuizUsage(
            item.getCourse().getLecturer().getId(),
            item.getQuestionType(),
            item.getPrompt()
        );
        LocalDateTime lastUsed = quizAttemptAnswerRepository.findLastUsedAt(
            item.getCourse().getLecturer().getId(),
            item.getQuestionType(),
            item.getPrompt()
        );

        row.put("questionBankId", item.getId());
        row.put("questionCode", "Q" + item.getId());
        row.put("courseId", item.getCourse().getId());
        row.put("courseTitle", item.getCourse().getTitle());
        row.put("questionType", item.getQuestionType().name());
        row.put("difficultyLevel", item.getDifficultyLevel() == null ? DifficultyLevel.MEDIUM.name() : item.getDifficultyLevel().name());
        row.put("topicTag", trimToDefault(item.getTopicTag(), "General"));
        row.put("moduleTag", trimToDefault(item.getModuleTag(), item.getCourse().getTitle()));
        row.put("prompt", item.getPrompt());
        row.put("explanation", item.getExplanation() == null ? "" : item.getExplanation());
        row.put("mediaUrl", item.getMediaUrl() == null ? "" : item.getMediaUrl());
        row.put("mediaType", item.getMediaType() == null ? "" : item.getMediaType());
        row.put("options", parseSafe(item.getOptionsJson()));
        row.put("correctAnswer", parseSafe(item.getCorrectAnswerJson()));
        row.put("points", item.getPoints());
        row.put("createdAt", item.getCreatedAt());
        row.put("createdBy", createdBy);
        row.put("modifiedBy", createdBy);
        row.put("modifiedAt", item.getCreatedAt());
        row.put("version", "v1");
        row.put("status", "Ready");
        row.put("comments", 0);
        row.put("usage", usageCount);
        row.put("lastUsed", lastUsed);
        return row;
    }

    private String extractImportText(MultipartFile file, String fileName) {
        String lowerName = fileName.toLowerCase();
        try {
            byte[] bytes = file.getBytes();
            if (lowerName.endsWith(".docx")) {
                return normalizeImportedText(extractDocxText(bytes));
            }
            if (lowerName.endsWith(".pdf")) {
                return normalizeImportedText(extractBasicPdfText(bytes));
            }
            if (lowerName.endsWith(".txt") || lowerName.endsWith(".md")) {
                return normalizeImportedText(new String(bytes, StandardCharsets.UTF_8));
            }
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Could not read uploaded file.");
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported file type. Please upload .docx, .pdf, or .txt.");
    }

    private String extractDocxText(byte[] bytes) throws IOException {
        StringBuilder xml = new StringBuilder();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                String name = entry.getName();
                if (name.equals("word/document.xml") || name.startsWith("word/header") || name.startsWith("word/footer")) {
                    xml.append(new String(zip.readAllBytes(), StandardCharsets.UTF_8)).append(" ");
                }
            }
        }
        if (xml.isEmpty()) {
            return "";
        }
        return xml.toString()
            .replaceAll("</w:p>", ". ")
            .replaceAll("<[^>]+>", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&apos;", "'");
    }

    private String extractBasicPdfText(byte[] bytes) {
        String raw = new String(bytes, StandardCharsets.ISO_8859_1);
        StringBuilder text = new StringBuilder();
        appendPdfOperatorText(raw, text);
        appendCompressedPdfStreamText(raw, text);
        if (text.length() < 80) {
            Matcher fallback = Pattern.compile("\\(([^()]{4,500})\\)").matcher(raw);
            while (fallback.find() && text.length() < 10000) {
                text.append(unescapePdfText(fallback.group(1))).append(" ");
            }
        }
        return text.toString();
    }

    private void appendCompressedPdfStreamText(String raw, StringBuilder text) {
        int cursor = 0;
        while (text.length() < 20000) {
            int streamStart = raw.indexOf("stream", cursor);
            if (streamStart < 0) {
                break;
            }
            int dataStart = streamStart + "stream".length();
            if (dataStart + 1 < raw.length() && raw.charAt(dataStart) == '\r' && raw.charAt(dataStart + 1) == '\n') {
                dataStart += 2;
            } else if (dataStart < raw.length() && raw.charAt(dataStart) == '\n') {
                dataStart += 1;
            }

            int streamEnd = raw.indexOf("endstream", dataStart);
            if (streamEnd < 0) {
                break;
            }

            String dictionary = raw.substring(Math.max(0, streamStart - 300), streamStart);
            if (!dictionary.contains("FlateDecode") && !dictionary.contains("ASCII85Decode")) {
                cursor = streamEnd + "endstream".length();
                continue;
            }

            String streamData = raw.substring(dataStart, streamEnd).stripTrailing();
            byte[] decoded = streamData.getBytes(StandardCharsets.ISO_8859_1);
            try {
                if (dictionary.contains("ASCII85Decode")) {
                    decoded = decodeAscii85(streamData.getBytes(StandardCharsets.ISO_8859_1));
                }
                if (dictionary.contains("FlateDecode")) {
                    decoded = inflate(decoded);
                }
                appendPdfOperatorText(new String(decoded, StandardCharsets.ISO_8859_1), text);
            } catch (IOException | IllegalArgumentException ignored) {
                // Continue with other streams; unsupported PDF streams should not block readable streams.
            }
            cursor = streamEnd + "endstream".length();
        }
    }

    private void appendPdfOperatorText(String source, StringBuilder text) {
        Matcher matcher = Pattern.compile("\\(([^()]{2,800})\\)\\s*T[Jj]").matcher(source);
        while (matcher.find() && text.length() < 20000) {
            text.append(unescapePdfText(matcher.group(1))).append(" ");
        }

        Matcher arrayMatcher = Pattern.compile("\\[(.*?)\\]\\s*TJ", Pattern.DOTALL).matcher(source);
        while (arrayMatcher.find() && text.length() < 20000) {
            Matcher chunkMatcher = Pattern.compile("\\(([^()]{1,800})\\)").matcher(arrayMatcher.group(1));
            while (chunkMatcher.find()) {
                text.append(unescapePdfText(chunkMatcher.group(1))).append(" ");
            }
        }
    }

    private byte[] inflate(byte[] bytes) throws IOException {
        try (InflaterInputStream input = new InflaterInputStream(new ByteArrayInputStream(bytes));
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            input.transferTo(output);
            return output.toByteArray();
        }
    }

    private byte[] decodeAscii85(byte[] bytes) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        long tuple = 0;
        int count = 0;
        for (byte current : bytes) {
            int value = current & 0xFF;
            if (Character.isWhitespace((char) value)) {
                continue;
            }
            if (value == '~') {
                break;
            }
            if (value == 'z' && count == 0) {
                output.write(0);
                output.write(0);
                output.write(0);
                output.write(0);
                continue;
            }
            if (value < '!' || value > 'u') {
                continue;
            }
            tuple = tuple * 85 + (value - '!');
            count++;
            if (count == 5) {
                writeAscii85Tuple(output, tuple, 4);
                tuple = 0;
                count = 0;
            }
        }

        if (count > 1) {
            for (int i = count; i < 5; i++) {
                tuple = tuple * 85 + ('u' - '!');
            }
            writeAscii85Tuple(output, tuple, count - 1);
        }
        return output.toByteArray();
    }

    private void writeAscii85Tuple(ByteArrayOutputStream output, long tuple, int byteCount) {
        byte[] decoded = new byte[] {
            (byte) ((tuple >> 24) & 0xFF),
            (byte) ((tuple >> 16) & 0xFF),
            (byte) ((tuple >> 8) & 0xFF),
            (byte) (tuple & 0xFF)
        };
        output.write(decoded, 0, byteCount);
    }

    private String unescapePdfText(String value) {
        return value
            .replace("\\(", "(")
            .replace("\\)", ")")
            .replace("\\\\", "\\")
            .replace("\\n", " ")
            .replace("\\r", " ")
            .replace("\\t", " ");
    }

    private String normalizeImportedText(String text) {
        return text == null ? "" : text
            .replaceAll("[\\u0000-\\u001F]+", " ")
            .replaceAll("\\s+", " ")
            .trim();
    }

    private List<String> sourceSentences(String text) {
        List<String> sentences = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        appendAnsweredImportQuestions(text, sentences, seen);
        appendArithmeticImportQuestions(text, sentences, seen);
        appendShortImportQuestions(text, sentences, seen);

        for (String raw : text.split("(?<=[.!?])\\s+|\\R+|\\s+-\\s+")) {
            String sentence = raw.trim().replaceAll("^[0-9.)\\-\\s]+", "").trim();
            if (sentence.length() < 35 || sentence.length() > 220) {
                continue;
            }
            if (!sentence.matches(".*[A-Za-z].*")) {
                continue;
            }
            addImportedSourceSentence(sentences, seen, sentence);
            if (sentences.size() >= 40) {
                break;
            }
        }
        return sentences;
    }

    private void appendAnsweredImportQuestions(String text, List<String> sentences, Set<String> seen) {
        Matcher answerMatcher = Pattern
            .compile("(?:^|\\s)(?:\\d+[.)]\\s*)?(.{3,180}?)\\s+(?:Jawapan|Answer|Ans)\\s*:\\s*([^\\s.;,]+)", Pattern.CASE_INSENSITIVE)
            .matcher(text);
        while (answerMatcher.find() && sentences.size() < 40) {
            String question = answerMatcher.group(1).trim();
            String answer = answerMatcher.group(2).trim();
            addImportedSourceSentence(sentences, seen, question + " Jawapan: " + answer + ".");
        }
    }

    private void appendArithmeticImportQuestions(String text, List<String> sentences, Set<String> seen) {
        Matcher mathMatcher = Pattern
            .compile("(?<![A-Za-z0-9])((?:\\d+(?:\\.\\d+)?\\s*[+\\-xX*/÷×]\\s*)+\\d+(?:\\.\\d+)?)(?:\\s*=\\s*(?:_{2,}|\\?|\\d+(?:\\.\\d+)?))?")
            .matcher(text);
        while (mathMatcher.find() && sentences.size() < 40) {
            String expression = mathMatcher.group(1).replaceAll("\\s+", " ").trim();
            Double answer = evaluateSimpleArithmetic(expression);
            if (answer == null) {
                continue;
            }
            addImportedSourceSentence(sentences, seen, "Solve " + expression + " = ? Jawapan: " + formatImportedNumber(answer) + ".");
        }
    }

    private void appendShortImportQuestions(String text, List<String> sentences, Set<String> seen) {
        Matcher questionMatcher = Pattern
            .compile("(?:^|\\s)(?:\\d+[.)]\\s*)?([^.!?]{8,160}\\?)")
            .matcher(text);
        while (questionMatcher.find() && sentences.size() < 40) {
            addImportedSourceSentence(sentences, seen, questionMatcher.group(1).trim());
        }
    }

    private void addImportedSourceSentence(List<String> sentences, Set<String> seen, String value) {
        String sentence = value.trim().replaceAll("^[0-9.)\\-\\s]+", "").trim();
        if (sentence.isBlank()) {
            return;
        }
        if (!sentence.endsWith(".") && !sentence.endsWith("?") && !sentence.endsWith("!")) {
            sentence = sentence + ".";
        }
        String key = normalize(sentence);
        if (seen.add(key)) {
            sentences.add(sentence);
        }
    }

    private List<ImportedQuestionSeed> explicitImportedQuestions(String text) {
        List<ImportedQuestionSeed> questions = new ArrayList<>();
        Set<Integer> seen = new HashSet<>();
        Matcher matcher = Pattern
            .compile(
                "(?is)(?:^|\\s)(?:Q\\s*)?(\\d{1,4})\\s*[:.)]\\s*(.+?)\\s+(?:Answer|Ans|Jawapan)\\s*:\\s*(.+?)(?=(?:\\s+(?:[A-Za-z][A-Za-z\\- ]{0,48}\\s+)?(?:Q\\s*)?\\d{1,4}\\s*[:.)])|$)"
            )
            .matcher(text);
        while (matcher.find() && questions.size() < 50) {
            int number = Integer.parseInt(matcher.group(1));
            if (!seen.add(number)) {
                continue;
            }
            String prompt = cleanImportedQuestionText(matcher.group(2));
            String answer = cleanImportedAnswerText(matcher.group(3));
            if (!prompt.isBlank() && !answer.isBlank()) {
                questions.add(new ImportedQuestionSeed(number, prompt, answer));
            }
        }
        return questions;
    }

    private String cleanImportedQuestionText(String value) {
        return value == null ? "" : value
            .replaceAll("(?i)^(Questions?|Question|MCQ|Multiple Choice|True or False|Matching|Scenario-Based|Short Answer)\\s*[:\\-]?\\s*", "")
            .replaceAll("\\s+", " ")
            .replaceAll("[.;,\\s]+$", "")
            .trim();
    }

    private String cleanImportedAnswerText(String value) {
        return value == null ? "" : value
            .replaceAll("(?is)\\s+(Questions?|Question|MCQ|Multiple Choice|True or False|Matching|Scenario-Based|Short Answer)\\s*$", "")
            .replaceAll("\\s+", " ")
            .replaceAll("[.;\\s]+$", "")
            .trim();
    }

    private Double evaluateSimpleArithmetic(String expression) {
        Matcher matcher = Pattern.compile("(\\d+(?:\\.\\d+)?|[+\\-xX*/÷×])").matcher(expression);
        List<String> tokens = new ArrayList<>();
        while (matcher.find()) {
            tokens.add(matcher.group(1));
        }
        if (tokens.size() < 3) {
            return null;
        }

        try {
            double total = Double.parseDouble(tokens.get(0));
            for (int i = 1; i + 1 < tokens.size(); i += 2) {
                String operator = tokens.get(i);
                double value = Double.parseDouble(tokens.get(i + 1));
                if ("+".equals(operator)) {
                    total += value;
                } else if ("-".equals(operator)) {
                    total -= value;
                } else if ("x".equalsIgnoreCase(operator) || "*".equals(operator) || "×".equals(operator)) {
                    total *= value;
                } else if ("/".equals(operator) || "÷".equals(operator)) {
                    if (value == 0) {
                        return null;
                    }
                    total /= value;
                }
            }
            return total;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String formatImportedNumber(double value) {
        if (Math.rint(value) == value) {
            return String.valueOf((long) value);
        }
        return String.format(java.util.Locale.US, "%.2f", value).replaceAll("0+$", "").replaceAll("\\.$", "");
    }

    private List<QuestionBankItem> generateStructuredImportedQuestions(
        Course course,
        UserAccount lecturer,
        List<ImportedQuestionSeed> seeds,
        String topicTag,
        DifficultyLevel difficultyLevel,
        QuestionType requestedType
    ) {
        List<QuestionBankItem> questions = new ArrayList<>();
        for (ImportedQuestionSeed seed : seeds) {
            QuestionType type = requestedType == null ? inferImportedQuestionType(seed) : requestedType;
            questions.add(structuredImportedQuestion(course, lecturer, type, difficultyLevel, topicTag, seed));
        }
        return questions;
    }

    private QuestionType inferImportedQuestionType(ImportedQuestionSeed seed) {
        String prompt = seed.prompt();
        String normalizedPrompt = normalize(prompt);
        String normalizedAnswer = normalize(seed.answer());
        if (normalizedPrompt.contains("match ") || normalizedPrompt.startsWith("match") || matchingLeftItems(prompt).size() >= 2) {
            return QuestionType.MATCHING;
        }
        if (normalizedPrompt.startsWith("true or false") || Objects.equals(normalizedAnswer, "true") || Objects.equals(normalizedAnswer, "false")) {
            return QuestionType.TRUE_FALSE;
        }
        if (!choiceOptions(prompt).isEmpty()) {
            return QuestionType.MCQ;
        }
        return QuestionType.SHORT_ANSWER;
    }

    private QuestionBankItem structuredImportedQuestion(
        Course course,
        UserAccount lecturer,
        QuestionType type,
        DifficultyLevel difficultyLevel,
        String topicTag,
        ImportedQuestionSeed seed
    ) {
        QuestionBankItem item = baseImportedQuestion(course, lecturer, type, difficultyLevel, topicTag);
        String sourcePrompt = "Q" + seed.sourceNumber() + ": " + seed.prompt();
        if (type == QuestionType.MATCHING) {
            if (applyMatchingImport(item, sourcePrompt, seed)) {
                return item;
            }
            item.setQuestionType(QuestionType.SHORT_ANSWER);
            type = QuestionType.SHORT_ANSWER;
        }
        if (type == QuestionType.TRUE_FALSE) {
            item.setPrompt(sourcePrompt);
            item.setOptionsJson(writeSafe(List.of("True", "False")));
            item.setCorrectAnswerJson(writeSafe(booleanAnswer(seed.answer())));
            return item;
        }
        if (type == QuestionType.MCQ || type == QuestionType.MULTI_SELECT) {
            applyChoiceImport(item, sourcePrompt, seed, type == QuestionType.MULTI_SELECT);
            return item;
        }
        item.setPrompt(sourcePrompt);
        item.setOptionsJson(writeSafe(Map.of("keywords", shortAnswerKeywords(seed.answer()))));
        item.setCorrectAnswerJson(writeSafe(seed.answer().toLowerCase()));
        return item;
    }

    private QuestionBankItem baseImportedQuestion(
        Course course,
        UserAccount lecturer,
        QuestionType type,
        DifficultyLevel difficultyLevel,
        String topicTag
    ) {
        QuestionBankItem item = new QuestionBankItem();
        item.setCourse(course);
        item.setCreator(lecturer);
        item.setQuestionType(type);
        item.setDifficultyLevel(difficultyLevel);
        item.setTopicTag(topicTag);
        item.setModuleTag(course.getTitle());
        item.setPoints(1);
        item.setExplanation("Generated from imported document and saved in the database question bank.");
        item.setMediaUrl(null);
        item.setMediaType(null);
        return item;
    }

    private boolean applyMatchingImport(QuestionBankItem item, String sourcePrompt, ImportedQuestionSeed seed) {
        List<String> left = matchingLeftItems(seed.prompt());
        List<String> right = splitImportedList(seed.answer());
        if (left.size() < 2 || right.size() < 2) {
            return false;
        }
        int pairCount = Math.min(left.size(), right.size());
        left = new ArrayList<>(left.subList(0, pairCount));
        right = new ArrayList<>(right.subList(0, pairCount));
        Map<String, String> correctMap = new LinkedHashMap<>();
        for (int i = 0; i < pairCount; i++) {
            correctMap.put(left.get(i), right.get(i));
        }
        item.setPrompt(sourcePrompt);
        item.setOptionsJson(writeSafe(Map.of(
            "left", left,
            "right", right,
            "allowDuplicateResponse", false,
            "scoringType", "PARTIAL"
        )));
        item.setCorrectAnswerJson(writeSafe(correctMap));
        return true;
    }

    private void applyChoiceImport(QuestionBankItem item, String sourcePrompt, ImportedQuestionSeed seed, boolean multiSelect) {
        Map<String, String> choices = choiceOptions(seed.prompt());
        String prompt = choices.isEmpty() ? sourcePrompt : "Q" + seed.sourceNumber() + ": " + choicePrompt(seed.prompt());
        List<String> options = choices.isEmpty()
            ? answerOptions(seed.answer())
            : new ArrayList<>(choices.values());
        String correct = correctChoiceAnswer(seed.answer(), choices, options);
        item.setPrompt(prompt);
        item.setOptionsJson(writeSafe(options));
        item.setCorrectAnswerJson(writeSafe(multiSelect ? List.of(correct) : correct));
    }

    private String booleanAnswer(String value) {
        return normalize(value).equals("false") ? "False" : "True";
    }

    private List<String> shortAnswerKeywords(String answer) {
        List<String> keywords = splitImportedList(answer).stream()
            .map(String::toLowerCase)
            .filter(value -> value.length() >= 3)
            .limit(6)
            .toList();
        return keywords.isEmpty() ? List.of(answer.toLowerCase()) : keywords;
    }

    private List<String> matchingLeftItems(String prompt) {
        String candidate = prompt;
        int colon = prompt.lastIndexOf(':');
        if (colon >= 0 && colon + 1 < prompt.length()) {
            candidate = prompt.substring(colon + 1);
        }
        List<String> items = splitImportedList(candidate);
        return items.stream()
            .filter(item -> item.length() <= 80)
            .toList();
    }

    private List<String> splitImportedList(String value) {
        if (value == null) {
            return List.of();
        }
        return Pattern.compile("\\s*(?:,|;|\\||/|\\band\\b)\\s*", Pattern.CASE_INSENSITIVE)
            .splitAsStream(value)
            .map(String::trim)
            .map(item -> item.replaceAll("^[A-Da-d][.)]\\s*", "").trim())
            .filter(item -> !item.isBlank())
            .distinct()
            .toList();
    }

    private Map<String, String> choiceOptions(String prompt) {
        Map<String, String> choices = new LinkedHashMap<>();
        Matcher matcher = Pattern.compile("(?is)\\b([A-D])\\s*[.)]\\s*(.*?)(?=\\s+\\b[A-D]\\s*[.)]|$)").matcher(prompt);
        while (matcher.find()) {
            String key = matcher.group(1).toUpperCase();
            String value = matcher.group(2).replaceAll("[.;,\\s]+$", "").trim();
            if (!value.isBlank()) {
                choices.put(key, value);
            }
        }
        return choices.size() >= 2 ? choices : Map.of();
    }

    private String choicePrompt(String prompt) {
        return prompt.replaceFirst("(?is)\\s+A\\s*[.)]\\s*.+$", "").trim();
    }

    private String correctChoiceAnswer(String answer, Map<String, String> choices, List<String> options) {
        String trimmed = answer.trim();
        String key = trimmed.replaceAll("[^A-Za-z]", "").toUpperCase();
        if (choices.containsKey(key)) {
            return choices.get(key);
        }
        for (String option : options) {
            if (normalize(option).equals(normalize(trimmed))) {
                return option;
            }
        }
        options.add(0, trimmed);
        return trimmed;
    }

    private List<QuestionBankItem> generateImportedQuestions(
        Course course,
        UserAccount lecturer,
        List<String> sentences,
        String topicTag,
        DifficultyLevel difficultyLevel,
        QuestionType requestedType,
        int targetCount
    ) {
        List<QuestionBankItem> questions = new ArrayList<>();
        int sourceCount = Math.max(1, sentences.size());
        int maxAttempts = Math.max(targetCount * 3, sourceCount * 3);
        for (int i = 0; questions.size() < targetCount && i < maxAttempts; i++) {
            String sentence = sentences.get(i % sourceCount);
            QuestionType type = importedQuestionType(requestedType, questions.size());
            questions.add(importedQuestion(course, lecturer, type, difficultyLevel, topicTag, sentence, sentences, i));
        }
        return questions;
    }

    private QuestionType importedQuestionType(QuestionType requestedType, int index) {
        if (requestedType == QuestionType.MCQ || requestedType == QuestionType.TRUE_FALSE || requestedType == QuestionType.SHORT_ANSWER) {
            return requestedType;
        }
        return index % 3 == 1 ? QuestionType.TRUE_FALSE : index % 3 == 2 ? QuestionType.SHORT_ANSWER : QuestionType.MCQ;
    }

    private QuestionBankItem importedQuestion(
        Course course,
        UserAccount lecturer,
        QuestionType type,
        DifficultyLevel difficultyLevel,
        String topicTag,
        String sentence,
        List<String> allSentences,
        int index
    ) {
        QuestionBankItem item = new QuestionBankItem();
        item.setCourse(course);
        item.setCreator(lecturer);
        item.setQuestionType(type);
        item.setDifficultyLevel(difficultyLevel);
        item.setTopicTag(topicTag);
        item.setModuleTag(course.getTitle());
        item.setPoints(1);
        item.setExplanation("Generated from imported document. Lecturer should review before publishing.");
        item.setMediaUrl(null);
        item.setMediaType(null);

        String[] answeredQuestion = parseImportedAnswer(sentence);
        if (answeredQuestion != null) {
            String prompt = answeredQuestion[0];
            String answer = answeredQuestion[1];
            if (type == QuestionType.TRUE_FALSE) {
                item.setPrompt("True or False: " + fillBlankWithAnswer(prompt, answer));
                item.setOptionsJson(writeSafe(List.of("True", "False")));
                item.setCorrectAnswerJson(writeSafe("True"));
                return item;
            }
            if (type == QuestionType.SHORT_ANSWER) {
                item.setPrompt(prompt);
                item.setOptionsJson(writeSafe(Map.of("keywords", List.of(answer.toLowerCase()))));
                item.setCorrectAnswerJson(writeSafe(answer.toLowerCase()));
                return item;
            }
            List<String> options = answerOptions(answer);
            item.setPrompt(prompt);
            item.setOptionsJson(writeSafe(options));
            item.setCorrectAnswerJson(writeSafe(answer));
            return item;
        }

        if (type == QuestionType.TRUE_FALSE) {
            item.setPrompt("True or False: " + sentence);
            item.setOptionsJson(writeSafe(List.of("True", "False")));
            item.setCorrectAnswerJson(writeSafe("True"));
            return item;
        }

        if (type == QuestionType.SHORT_ANSWER) {
            String keyword = bestKeyword(sentence, topicTag);
            item.setPrompt("Which key term is mainly described by this statement: \"" + sentence + "\"");
            item.setOptionsJson(writeSafe(Map.of("keywords", List.of(keyword.toLowerCase()))));
            item.setCorrectAnswerJson(writeSafe(keyword.toLowerCase()));
            return item;
        }

        List<String> options = new ArrayList<>();
        options.add(sentence);
        for (String other : allSentences) {
            if (options.size() >= 4) {
                break;
            }
            if (!normalize(other).equals(normalize(sentence))) {
                options.add(other);
            }
        }
        while (options.size() < 4) {
            options.add("Review another concept from " + topicTag + " (" + options.size() + ")");
        }
        item.setPrompt("Which statement is correct based on the imported material?");
        item.setOptionsJson(writeSafe(rotateOptions(options, index)));
        item.setCorrectAnswerJson(writeSafe(sentence));
        return item;
    }

    private String[] parseImportedAnswer(String sentence) {
        Matcher matcher = Pattern.compile("(.+?)\\s+Jawapan\\s*:\\s*(\\S+)", Pattern.CASE_INSENSITIVE).matcher(sentence);
        if (!matcher.find()) {
            return null;
        }
        String prompt = matcher.group(1).trim();
        String answer = matcher.group(2).replaceAll("[.!?]+$", "").trim();
        if (prompt.isBlank() || answer.isBlank()) {
            return null;
        }
        return new String[] { prompt, answer };
    }

    private String fillBlankWithAnswer(String prompt, String answer) {
        String filled = prompt.replaceAll("_{2,}", answer);
        if (filled.equals(prompt) && !prompt.contains(answer)) {
            filled = prompt + " " + answer;
        }
        return filled;
    }

    private List<String> answerOptions(String answer) {
        List<String> options = new ArrayList<>();
        options.add(answer);
        try {
            int value = Integer.parseInt(answer.replaceAll("[^0-9-]", ""));
            for (int delta : List.of(1, 2, 4, -1, -2)) {
                int candidate = value + delta;
                if (candidate >= 0) {
                    String option = String.valueOf(candidate);
                    if (!options.contains(option)) {
                        options.add(option);
                    }
                }
                if (options.size() >= 4) {
                    break;
                }
            }
        } catch (NumberFormatException ignored) {
            options.add(answer + " A");
            options.add(answer + " B");
            options.add("None of the above");
        }
        while (options.size() < 4) {
            options.add("Option " + (options.size() + 1));
        }
        return options.subList(0, 4);
    }

    private List<String> rotateOptions(List<String> options, int seed) {
        List<String> rotated = new ArrayList<>(options);
        if (!rotated.isEmpty()) {
            java.util.Collections.rotate(rotated, seed % rotated.size());
        }
        return rotated;
    }

    private String bestKeyword(String sentence, String fallback) {
        List<String> stopWords = List.of("the", "and", "that", "this", "with", "from", "into", "data", "system", "process", "using", "between", "which");
        return Pattern.compile("[A-Za-z][A-Za-z-]{3,}")
            .matcher(sentence)
            .results()
            .map(match -> match.group())
            .filter(word -> !stopWords.contains(word.toLowerCase()))
            .findFirst()
            .orElse(trimToDefault(fallback, "concept"));
    }

    private Map<String, Object> toAttemptAnswerForLecturer(QuizAttemptAnswer answer) {
        Question question = answer.getQuestion();
        double maxPoints = question.getPoints() == null ? 0.0 : question.getPoints();
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("answerId", answer.getId());
        row.put("questionId", question.getId());
        row.put("sortOrder", question.getSortOrder());
        row.put("questionType", question.getQuestionType().name());
        row.put("prompt", question.getPrompt());
        row.put("explanation", question.getExplanation() == null ? "" : question.getExplanation());
        row.put("mediaUrl", question.getMediaUrl() == null ? "" : question.getMediaUrl());
        row.put("mediaType", question.getMediaType() == null ? "" : question.getMediaType());
        row.put("studentAnswer", parseSafe(answer.getAnswerJson()));
        row.put("correctAnswer", parseSafe(question.getCorrectAnswerJson()));
        row.put("correct", answer.isCorrect());
        row.put("awardedPoints", answer.getAwardedPoints());
        row.put("maxPoints", maxPoints);
        row.put("topicTag", trimToDefault(answer.getTopicTag(), question.getQuiz().getCourse().getTitle()));
        row.put("confidenceLevel", trimToDefault(answer.getConfidenceLevel(), "UNSET"));
        row.put("timeSpentSeconds", answer.getTimeSpentSeconds() == null ? 0 : answer.getTimeSpentSeconds());
        row.put("timeSignal", trimToDefault(answer.getTimeSignal(), "NOT_TRACKED"));
        row.put("misconception", trimToDefault(answer.getMisconception(), answer.isCorrect() ? "Concept is secure." : "Review this concept."));
        return row;
    }

    private void recalculateAttemptSummary(QuizAttempt attempt) {
        List<QuizAttemptAnswer> answers = quizAttemptAnswerRepository.findByAttemptId(attempt.getId());
        double totalPoints = answers.stream().mapToDouble(answer -> answer.getQuestion().getPoints()).sum();
        double awarded = answers.stream().mapToDouble(answer -> answer.getAwardedPoints() == null ? 0.0 : answer.getAwardedPoints()).sum();
        double score = totalPoints == 0 ? 0.0 : (awarded * 100.0 / totalPoints);
        boolean passed = score >= attempt.getQuiz().getPassingMark();

        attempt.setScore(round2(score));
        attempt.setPassed(passed);
        attempt.setFeedback(buildFeedback(score));
        quizAttemptRepository.save(attempt);
    }

    private long durationSeconds(QuizAttempt attempt) {
        if (attempt.getStartedAt() == null || attempt.getSubmittedAt() == null) {
            return 0L;
        }
        return java.time.Duration.between(attempt.getStartedAt(), attempt.getSubmittedAt()).toSeconds();
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

    private int toInt(Object value, int fallback) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return value == null ? fallback : Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return fallback;
        }
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String trimToDefault(String value, String fallback) {
        String trimmed = trimToNull(value);
        return trimmed == null ? fallback : trimmed;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private String normalizeNullable(String value) {
        String normalized = normalize(value);
        return normalized.isBlank() ? null : normalized;
    }

    private void tryDeleteOptional(Runnable action) {
        try {
            action.run();
        } catch (DataAccessException ignored) {
            // Optional table may not exist in older DB snapshots.
        }
    }

    private boolean enabled(Boolean value) {
        return value == null || value;
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

    private final class InsightTopic {
        private final String topicTag;
        private double totalPoints;
        private double awardedPoints;
        private int answerCount;
        private int wrongCount;

        private InsightTopic(String topicTag) {
            this.topicTag = topicTag;
        }

        private void add(double maxPoints, double awarded, boolean correct) {
            totalPoints += maxPoints;
            awardedPoints += awarded;
            answerCount++;
            if (!correct) {
                wrongCount++;
            }
        }

        private Map<String, Object> toMap() {
            double score = totalPoints == 0 ? 0.0 : round2(awardedPoints * 100.0 / totalPoints);
            return Map.of(
                "topicTag", topicTag,
                "score", score,
                "answerCount", answerCount,
                "wrongCount", wrongCount,
                "riskLabel", score < 60 ? "High risk" : score < 75 ? "Needs reinforcement" : "Stable"
            );
        }
    }

    private final class InsightQuestion {
        private final Long questionId;
        private final String prompt;
        private final String topicTag;
        private final Object correctAnswer;
        private int answerCount;
        private int wrongCount;

        private InsightQuestion(QuizAttemptAnswer answer) {
            this.questionId = answer.getQuestion().getId();
            this.prompt = answer.getQuestion().getPrompt();
            this.topicTag = trimToDefault(answer.getTopicTag(), answer.getQuestion().getQuiz().getCourse().getTitle());
            this.correctAnswer = parseSafe(answer.getQuestion().getCorrectAnswerJson());
        }

        private void add(boolean correct) {
            answerCount++;
            if (!correct) {
                wrongCount++;
            }
        }

        private Map<String, Object> toMap() {
            int wrongRate = answerCount == 0 ? 0 : (int) Math.round(wrongCount * 100.0 / answerCount);
            return Map.of(
                "questionId", questionId,
                "prompt", prompt,
                "topicTag", topicTag,
                "answerCount", answerCount,
                "wrongCount", wrongCount,
                "correctCount", answerCount - wrongCount,
                "wrongRate", wrongRate,
                "correctAnswer", correctAnswer
            );
        }
    }

    private record ImportedQuestionSeed(int sourceNumber, String prompt, String answer) {
    }

    private QuizResetRequest getOwnedResetRequest(UserAccount lecturer, Long requestId) {
        QuizResetRequest resetRequest = quizResetRequestRepository.findById(requestId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Reset request not found"));
        if (!Objects.equals(resetRequest.getCourse().getLecturer().getId(), lecturer.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this reset request");
        }
        return resetRequest;
    }

    private Map<String, Object> toResetRequestRow(QuizResetRequest resetRequest) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("requestId", resetRequest.getId());
        row.put("studentId", resetRequest.getStudent().getId());
        row.put("userName", resetRequest.getStudent().getFullName());
        row.put("userEmail", resetRequest.getStudent().getEmail());
        row.put("courseId", resetRequest.getCourse().getId());
        row.put("course", resetRequest.getCourse().getTitle());
        row.put("requestDate", resetRequest.getRequestedAt());
        row.put("status", resetRequest.getStatus().name());
        row.put("resolvedAt", resetRequest.getResolvedAt());
        return row;
    }

    private Course getOwnedCourse(Long courseId, UserAccount lecturer) {
        return courseRepository.findByIdAndLecturerId(courseId, lecturer.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Course not found"));
    }

    private QuestionBankItem getOwnedQuestionBankItem(Long questionBankId, UserAccount lecturer) {
        return questionBankItemRepository.findByIdAndCourseLecturerId(questionBankId, lecturer.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Question not found"));
    }

    private Quiz getOwnedQuiz(Long quizId, UserAccount lecturer) {
        return quizRepository.findByIdAndCourseLecturerId(quizId, lecturer.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Quiz not found"));
    }

    private LessonVideo getOwnedVideo(Long videoId, UserAccount lecturer) {
        return lessonVideoRepository.findByIdAndCourseLecturerId(videoId, lecturer.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Video not found"));
    }

    private CourseMaterial getOwnedMaterial(Long materialId, UserAccount lecturer) {
        return courseMaterialRepository.findByIdAndCourseLecturerId(materialId, lecturer.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Material not found"));
    }

    private Map<String, Object> toCourseStudentRow(Enrollment enrollment) {
        UserAccount student = enrollment.getStudent();
        return Map.of(
            "enrollmentId", enrollment.getId(),
            "studentId", student.getId(),
            "fullName", student.getFullName(),
            "email", student.getEmail(),
            "enrolledAt", enrollment.getEnrolledAt()
        );
    }

    private Map<String, Object> toVideoContentMap(LessonVideo video) {
        return Map.of(
            "itemType", "VIDEO",
            "id", video.getId(),
            "title", video.getTitle(),
            "description", video.getDescription(),
            "videoUrl", video.getVideoUrl(),
            "durationMinutes", video.getDurationMinutes(),
            "sortOrder", video.getSortOrder(),
            "mandatory", video.isMandatory()
        );
    }

    private Map<String, Object> toMaterialContentMap(CourseMaterial material) {
        return Map.of(
            "itemType", "MATERIAL",
            "id", material.getId(),
            "title", material.getTitle(),
            "materialType", material.getMaterialType(),
            "resourceUrl", material.getResourceUrl()
        );
    }

    private String writeSafe(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid JSON payload");
        }
    }

    private Object parseSafe(String value) {
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException ex) {
            return value;
        }
    }
}
