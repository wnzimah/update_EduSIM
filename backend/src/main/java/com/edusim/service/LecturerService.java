package com.edusim.service;

import com.edusim.dto.LecturerDtos.CourseRequest;
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
import com.edusim.model.UserAccount;
import com.edusim.repo.CourseRepository;
import com.edusim.repo.CourseMaterialRepository;
import com.edusim.repo.EnrollmentRepository;
import com.edusim.repo.FeedbackViewLogRepository;
import com.edusim.repo.LessonVideoRepository;
import com.edusim.repo.MarkAdjustmentAuditRepository;
import com.edusim.repo.QuestionBankItemRepository;
import com.edusim.repo.QuestionRepository;
import com.edusim.repo.QuizAttemptRepository;
import com.edusim.repo.QuizAttemptAnswerRepository;
import com.edusim.repo.QuizRepository;
import com.edusim.repo.VideoProgressRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.LinkedHashMap;
import java.util.Set;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LecturerService {

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
    private final MarkAdjustmentAuditRepository markAdjustmentAuditRepository;
    private final VideoProgressRepository videoProgressRepository;
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
        MarkAdjustmentAuditRepository markAdjustmentAuditRepository,
        VideoProgressRepository videoProgressRepository,
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
        this.markAdjustmentAuditRepository = markAdjustmentAuditRepository;
        this.videoProgressRepository = videoProgressRepository;
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
            .map(course -> Map.<String, Object>of(
                "courseId", course.getId(),
                "title", course.getTitle(),
                "description", course.getDescription(),
                "videoCount", lessonVideoRepository.countByCourseId(course.getId()),
                "quizCount", quizRepository.countByCourseId(course.getId())
            ))
            .toList();
    }

    @Transactional
    public Map<String, Object> createCourse(CourseRequest request, UserAccount lecturer) {
        Course course = new Course();
        course.setTitle(request.title());
        course.setDescription(request.description());
        course.setLecturer(lecturer);
        courseRepository.save(course);
        return Map.of("message", "Course created", "courseId", course.getId());
    }

    @Transactional
    public Map<String, Object> updateCourse(Long courseId, CourseRequest request, UserAccount lecturer) {
        Course course = getOwnedCourse(courseId, lecturer);
        course.setTitle(request.title());
        course.setDescription(request.description());
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
        videoProgressRepository.deleteByVideoCourseId(courseId);
        lessonVideoRepository.deleteByCourseId(courseId);
        courseMaterialRepository.deleteByCourseId(courseId);
        enrollmentRepository.deleteByCourseId(courseId);
        courseRepository.delete(course);
        return Map.of("message", "Course deleted", "courseId", courseId);
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
            row.put("shuffleQuestions", quiz.isShuffleQuestions());
            row.put("shuffleAnswers", quiz.isShuffleAnswers());
            row.put("questionDisplayMode", displayModeOrDefault(quiz).name());
            row.put("showResultImmediately", quiz.isShowResultImmediately());
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
        LocalDateTime releaseAt = request.showResultImmediately()
            ? null
            : (request.resultReleaseAt() == null ? request.closeAt() : request.resultReleaseAt());
        validateQuizSchedule(request.openAt(), request.closeAt(), releaseAt, request.showResultImmediately());

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
        quiz.setShowResultImmediately(request.showResultImmediately());
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

    @Transactional
    public Map<String, Object> publishQuiz(Long quizId, PublishRequest request, UserAccount lecturer) {
        Quiz quiz = quizRepository.findByIdAndCourseLecturerId(quizId, lecturer.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Quiz not found"));
        quiz.setPublished(request.published());
        quizRepository.save(quiz);
        return Map.of("message", "Quiz publication updated", "published", quiz.isPublished());
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
        quizInfo.put("shuffleQuestions", quiz.isShuffleQuestions());
        quizInfo.put("shuffleAnswers", quiz.isShuffleAnswers());
        quizInfo.put("questionDisplayMode", displayModeOrDefault(quiz).name());
        quizInfo.put("showResultImmediately", quiz.isShowResultImmediately());
        quizInfo.put("published", quiz.isPublished());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("quiz", quizInfo);
        response.put("questions", questions);
        return response;
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
        boolean showResultImmediately
    ) {
        if (openAt != null && closeAt != null && !openAt.isBefore(closeAt)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Open date/time must be before close date/time");
        }
        if (!showResultImmediately && resultReleaseAt == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Result release date/time is required when immediate release is disabled.");
        }
        if (resultReleaseAt != null && openAt != null && resultReleaseAt.isBefore(openAt)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Result release date/time cannot be earlier than quiz open time.");
        }
        if (resultReleaseAt != null && closeAt != null && resultReleaseAt.isBefore(closeAt)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Result release date/time must be on or after quiz due date/time.");
        }
    }

    private boolean isResultReleased(Quiz quiz, LocalDateTime now) {
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

        return all.stream()
            .filter(item -> criteria.questionType() == null || criteria.questionType().equals(item.getQuestionType()))
            .filter(item -> criteria.difficultyLevel() == null || criteria.difficultyLevel().equals(item.getDifficultyLevel()))
            .filter(item -> topicFilter == null || normalize(item.getTopicTag()).contains(topicFilter))
            .filter(item -> criteria.createdFrom() == null || !item.getCreatedAt().toLocalDate().isBefore(criteria.createdFrom()))
            .filter(item -> criteria.createdTo() == null || !item.getCreatedAt().toLocalDate().isAfter(criteria.createdTo()))
            .filter(item -> keywordFilter == null || matchesSearch(item, keywordFilter))
            .sorted(Comparator.comparing(QuestionBankItem::getCreatedAt).reversed())
            .limit(criteria.questionCount())
            .toList();
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
