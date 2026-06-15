package com.edusim.config;

import com.edusim.model.Course;
import com.edusim.model.CourseMaterial;
import com.edusim.model.DifficultyLevel;
import com.edusim.model.Enrollment;
import com.edusim.model.LessonVideo;
import com.edusim.model.Question;
import com.edusim.model.QuestionBankItem;
import com.edusim.model.QuestionType;
import com.edusim.model.Quiz;
import com.edusim.model.QuizDisplayMode;
import com.edusim.model.Role;
import com.edusim.model.UserAccount;
import com.edusim.repo.CourseMaterialRepository;
import com.edusim.repo.CourseRepository;
import com.edusim.repo.EnrollmentRepository;
import com.edusim.repo.LessonVideoRepository;
import com.edusim.repo.QuestionBankItemRepository;
import com.edusim.repo.QuestionRepository;
import com.edusim.repo.QuizRepository;
import com.edusim.repo.UserAccountRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final String DATA_INTEGRATION_COURSE_TITLE = "Data Management and Integration";
    private static final String DATA_INTEGRATION_VIDEO_URL = "https://youtu.be/zj0ZxjxHOAs?si=iVWJKeP1y6cUDFA-";
    private static final String DATA_SLIDE_TITLE = "Slide Week 1";
    private static final String DATA_SLIDE_TYPE = "SLIDE";
    private static final String DATA_SLIDE_URL = "https://www.ibm.com/topics/data-integration";
    private static final String DATA_READING_TITLE = "Reading: Data Integration";
    private static final String DATA_READING_TYPE = "PDF";
    private static final String DATA_READING_URL = "https://aws.amazon.com/what-is/etl/";

    private final UserAccountRepository userAccountRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonVideoRepository lessonVideoRepository;
    private final CourseMaterialRepository courseMaterialRepository;
    private final QuestionBankItemRepository questionBankItemRepository;
    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    public DataSeeder(
        UserAccountRepository userAccountRepository,
        CourseRepository courseRepository,
        EnrollmentRepository enrollmentRepository,
        LessonVideoRepository lessonVideoRepository,
        CourseMaterialRepository courseMaterialRepository,
        QuestionBankItemRepository questionBankItemRepository,
        QuizRepository quizRepository,
        QuestionRepository questionRepository,
        PasswordEncoder passwordEncoder,
        ObjectMapper objectMapper
    ) {
        this.userAccountRepository = userAccountRepository;
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.lessonVideoRepository = lessonVideoRepository;
        this.courseMaterialRepository = courseMaterialRepository;
        this.questionBankItemRepository = questionBankItemRepository;
        this.quizRepository = quizRepository;
        this.questionRepository = questionRepository;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(String... args) throws Exception {
        UserAccount lecturer = ensureUser("Dr. Nadia Rahman", "lecturer@edusim.com", Role.LECTURER, "password123");
        UserAccount student = ensureUser("Aiman Hakim", "student@edusim.com", Role.STUDENT, "password123");
        UserAccount alia = ensureUser("Alia", "alia141@gmail.com", Role.STUDENT, "141@Edusim");

        if (courseRepository.findByLecturerId(lecturer.getId()).isEmpty()) {
            seedAcademicData(lecturer, student);
        }

        ensureDefaultCourseCatalog(lecturer, student);
        ensureDataIntegrationVideoLink();
        ensureDataIntegrationMaterials();
        enrollStudentInLecturerCourses(alia, lecturer);
    }

    private UserAccount ensureUser(String fullName, String email, Role role, String password) {
        return userAccountRepository.findByEmail(email)
            .map(user -> {
                boolean changed = false;
                if (!fullName.equals(user.getFullName())) {
                    user.setFullName(fullName);
                    changed = true;
                }
                if (user.getRole() != role) {
                    user.setRole(role);
                    changed = true;
                }
                if (!passwordEncoder.matches(password, user.getPasswordHash())) {
                    user.setPasswordHash(passwordEncoder.encode(password));
                    changed = true;
                }
                return changed ? userAccountRepository.save(user) : user;
            })
            .orElseGet(() -> createUser(fullName, email, role, password));
    }

    private UserAccount createUser(String fullName, String email, Role role, String password) {
        UserAccount user = new UserAccount();
        user.setFullName(fullName);
        user.setEmail(email);
        user.setRole(role);
        user.setPasswordHash(passwordEncoder.encode(password));
        return userAccountRepository.save(user);
    }

    private void enrollStudentInLecturerCourses(UserAccount student, UserAccount lecturer) {
        courseRepository.findByLecturerId(lecturer.getId()).forEach(course -> enroll(student, course));
    }

    private void seedAcademicData(UserAccount lecturer, UserAccount student) throws JsonProcessingException {
        Course dataCourse = createCourse(
            lecturer,
            DATA_INTEGRATION_COURSE_TITLE,
            "Concept, process, and tools for data integration architecture."
        );
        Course webCourse = createCourse(
            lecturer,
            "Web Application Development",
            "Frontend and backend integration for real-world web systems."
        );
        Course dbCourse = createCourse(
            lecturer,
            "Database Management",
            "Relational modeling, optimization, and transaction fundamentals."
        );

        enroll(student, dataCourse);
        enroll(student, webCourse);
        enroll(student, dbCourse);

        LessonVideo video1 = createVideo(
            dataCourse,
            "Lesson 1: Integration Concepts",
            "Understand ETL, ELT, and integration patterns.",
            DATA_INTEGRATION_VIDEO_URL,
            4,
            1,
            true
        );
        LessonVideo video2 = createVideo(
            dataCourse,
            "Lesson 2: Data Pipelines",
            "Build reliable pipelines and orchestration flow.",
            "https://www.youtube.com/watch?v=UZ7TVRjxa10",
            22,
            2,
            true
        );
        createVideo(
            dataCourse,
            "Lesson 3: Practical Demo",
            "Applying integration logic in a case study.",
            "https://www.youtube.com/watch?v=ZrV6Lr6E3iY",
            18,
            3,
            false
        );

        createMaterial(dataCourse, DATA_SLIDE_TITLE, DATA_SLIDE_TYPE, DATA_SLIDE_URL);
        createMaterial(dataCourse, DATA_READING_TITLE, DATA_READING_TYPE, DATA_READING_URL);

        QuestionBankItem q1 = createQuestion(
            lecturer,
            dataCourse,
            QuestionType.MCQ,
            "What is the main goal of ETL?",
            List.of("To move and transform data", "To design UI", "To secure network", "To compile code"),
            "To move and transform data",
            1
        );
        QuestionBankItem q2 = createQuestion(
            lecturer,
            dataCourse,
            QuestionType.TRUE_FALSE,
            "Data warehouse is commonly used for analytics.",
            List.of("True", "False"),
            "True",
            1
        );
        QuestionBankItem q3 = createQuestion(
            lecturer,
            dataCourse,
            QuestionType.MULTI_SELECT,
            "Select valid integration styles.",
            List.of("Batch", "Streaming", "Drawing", "File Transfer"),
            List.of("Batch", "Streaming"),
            2
        );
        QuestionBankItem q4 = createQuestion(
            lecturer,
            dataCourse,
            QuestionType.SHORT_ANSWER,
            "What does API stand for?",
            List.of(),
            "application programming interface",
            1
        );
        QuestionBankItem q5 = createQuestion(
            lecturer,
            dataCourse,
            QuestionType.MATCHING,
            "Match tool to function.",
            Map.of(
                "left", List.of("Kafka", "MySQL"),
                "right", List.of("Streaming", "Relational Database")
            ),
            Map.of(
                "Kafka", "Streaming",
                "MySQL", "Relational Database"
            ),
            2
        );

        Quiz quiz = new Quiz();
        quiz.setCourse(dataCourse);
        quiz.setTitle("Quiz 1: Data Integration Concepts");
        quiz.setDescription("This quiz covers key concepts from lesson videos and materials.");
        quiz.setTimeLimitMinutes(10);
        quiz.setMaxAttempts(2);
        quiz.setPassingMark(50.0);
        quiz.setPublished(true);
        quiz.setUnlockAfterVideos(true);
        quiz.setShuffleQuestions(false);
        quiz.setShuffleAnswers(false);
        quiz.setQuestionDisplayMode(QuizDisplayMode.ONE_BY_ONE);
        quiz.setShowResultImmediately(true);
        quizRepository.save(quiz);

        saveQuizQuestion(quiz, q1, 1);
        saveQuizQuestion(quiz, q2, 2);
        saveQuizQuestion(quiz, q3, 3);
        saveQuizQuestion(quiz, q4, 4);
        saveQuizQuestion(quiz, q5, 5);
    }

    private void ensureDataIntegrationVideoLink() {
        courseRepository.findAll().stream()
            .filter(course -> DATA_INTEGRATION_COURSE_TITLE.equalsIgnoreCase(course.getTitle()))
            .findFirst()
            .ifPresent(course -> {
                List<LessonVideo> videos = lessonVideoRepository.findByCourseIdOrderBySortOrder(course.getId());
                if (videos.isEmpty()) {
                    createVideo(
                        course,
                        "Lesson 1: Integration Concepts",
                        "Understand ETL, ELT, and integration patterns.",
                        DATA_INTEGRATION_VIDEO_URL,
                        4,
                        1,
                        true
                    );
                    return;
                }

                LessonVideo firstVideo = videos.get(0);
                if (!DATA_INTEGRATION_VIDEO_URL.equals(firstVideo.getVideoUrl()) || firstVideo.getDurationMinutes() != 4) {
                    firstVideo.setVideoUrl(DATA_INTEGRATION_VIDEO_URL);
                    firstVideo.setDurationMinutes(4);
                    lessonVideoRepository.save(firstVideo);
                }
            });
    }

    private void ensureDataIntegrationMaterials() {
        courseRepository.findAll().stream()
            .filter(course -> DATA_INTEGRATION_COURSE_TITLE.equalsIgnoreCase(course.getTitle()))
            .findFirst()
            .ifPresent(course -> {
                List<CourseMaterial> materials = courseMaterialRepository.findByCourseId(course.getId());
                upsertMaterial(course, materials, DATA_SLIDE_TITLE, DATA_SLIDE_TYPE, DATA_SLIDE_URL);
                upsertMaterial(course, materials, DATA_READING_TITLE, DATA_READING_TYPE, DATA_READING_URL);
            });
    }

    private void ensureDefaultCourseCatalog(UserAccount lecturer, UserAccount student) throws JsonProcessingException {
        Course dataCourse = ensureCourse(
            lecturer,
            DATA_INTEGRATION_COURSE_TITLE,
            "Concept, process, and tools for data integration architecture."
        );
        Course webCourse = ensureCourse(
            lecturer,
            "Web Application Development",
            "Frontend and backend integration for real-world web systems."
        );
        Course dbCourse = ensureCourse(
            lecturer,
            "Database Management",
            "Relational modeling, optimization, and transaction fundamentals."
        );

        enroll(student, dataCourse);
        enroll(student, webCourse);
        enroll(student, dbCourse);

        ensureCourseBundle(
            lecturer,
            dataCourse,
            List.of(
                new VideoSeed(
                    "Lesson 1: Integration Concepts",
                    "Understand ETL, ELT, and integration patterns.",
                    DATA_INTEGRATION_VIDEO_URL,
                    4,
                    1,
                    true
                ),
                new VideoSeed(
                    "Lesson 2: Data Pipelines",
                    "Build reliable pipelines and orchestration flow.",
                    "https://www.youtube.com/watch?v=UZ7TVRjxa10",
                    22,
                    2,
                    true
                ),
                new VideoSeed(
                    "Lesson 3: Practical Demo",
                    "Applying integration logic in a case study.",
                    "https://www.youtube.com/watch?v=ZrV6Lr6E3iY",
                    18,
                    3,
                    false
                )
            ),
            List.of(
                new MaterialSeed(DATA_SLIDE_TITLE, DATA_SLIDE_TYPE, DATA_SLIDE_URL),
                new MaterialSeed(DATA_READING_TITLE, DATA_READING_TYPE, DATA_READING_URL)
            ),
            "Quiz 1: Data Integration Concepts",
            "This quiz covers key concepts from lesson videos and materials.",
            List.of(
                new QuestionSeed(
                    QuestionType.MCQ,
                    "What is the main goal of ETL?",
                    List.of("To move and transform data", "To design UI", "To secure network", "To compile code"),
                    "To move and transform data",
                    1
                ),
                new QuestionSeed(
                    QuestionType.TRUE_FALSE,
                    "Data warehouse is commonly used for analytics.",
                    List.of("True", "False"),
                    "True",
                    1
                ),
                new QuestionSeed(
                    QuestionType.MULTI_SELECT,
                    "Select valid integration styles.",
                    List.of("Batch", "Streaming", "Drawing", "File Transfer"),
                    List.of("Batch", "Streaming"),
                    2
                ),
                new QuestionSeed(
                    QuestionType.SHORT_ANSWER,
                    "What does API stand for?",
                    List.of(),
                    "application programming interface",
                    1
                ),
                new QuestionSeed(
                    QuestionType.MATCHING,
                    "Match tool to function.",
                    Map.of(
                        "left", List.of("Kafka", "MySQL"),
                        "right", List.of("Streaming", "Relational Database")
                    ),
                    Map.of(
                        "Kafka", "Streaming",
                        "MySQL", "Relational Database"
                    ),
                    2
                )
            )
        );

        ensureCourseBundle(
            lecturer,
            webCourse,
            List.of(
                new VideoSeed(
                    "Lesson 1: Web Architecture",
                    "Explore client, server, API, and deployment responsibilities.",
                    "https://www.youtube.com/watch?v=nu_pCVPKzTk",
                    12,
                    1,
                    true
                ),
                new VideoSeed(
                    "Lesson 2: REST API Flow",
                    "Connect Angular screens to backend endpoints safely.",
                    "https://www.youtube.com/watch?v=-MTSQjw5DrM",
                    16,
                    2,
                    true
                ),
                new VideoSeed(
                    "Lesson 3: Frontend Integration Demo",
                    "Review form handling, HTTP calls, and response states.",
                    "https://www.youtube.com/watch?v=3dHNOWTI7H8",
                    18,
                    3,
                    false
                )
            ),
            List.of(
                new MaterialSeed("Slide Week 1: Web Architecture", "SLIDE", "https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/How_does_the_Internet_work"),
                new MaterialSeed("Reading: REST API Design", "PDF", "https://restfulapi.net/")
            ),
            "Quiz 1: Web Application Basics",
            "This quiz checks core concepts in web architecture and API integration.",
            List.of(
                new QuestionSeed(
                    QuestionType.MCQ,
                    "Which layer usually renders the user interface in a web app?",
                    List.of("Frontend", "Database", "DNS", "Firewall"),
                    "Frontend",
                    1
                ),
                new QuestionSeed(
                    QuestionType.TRUE_FALSE,
                    "A REST API can return JSON data to a frontend application.",
                    List.of("True", "False"),
                    "True",
                    1
                ),
                new QuestionSeed(
                    QuestionType.MULTI_SELECT,
                    "Select common HTTP methods used by APIs.",
                    List.of("GET", "POST", "MERGE", "DELETE"),
                    List.of("GET", "POST", "DELETE"),
                    2
                ),
                new QuestionSeed(
                    QuestionType.SHORT_ANSWER,
                    "What does URL stand for?",
                    List.of(),
                    "uniform resource locator",
                    1
                ),
                new QuestionSeed(
                    QuestionType.MATCHING,
                    "Match web component to its role.",
                    Map.of(
                        "left", List.of("Frontend", "Backend"),
                        "right", List.of("Business logic", "User interface")
                    ),
                    Map.of(
                        "Frontend", "User interface",
                        "Backend", "Business logic"
                    ),
                    2
                )
            )
        );

        ensureCourseBundle(
            lecturer,
            dbCourse,
            List.of(
                new VideoSeed(
                    "Lesson 1: Relational Model",
                    "Understand tables, rows, primary keys, and relationships.",
                    "https://www.youtube.com/watch?v=HXV3zeQKqGY",
                    18,
                    1,
                    true
                ),
                new VideoSeed(
                    "Lesson 2: SQL Queries",
                    "Practice selection, filtering, joins, and grouping.",
                    "https://www.youtube.com/watch?v=7S_tz1z_5bA",
                    20,
                    2,
                    true
                ),
                new VideoSeed(
                    "Lesson 3: Transactions and Indexes",
                    "Review reliability and performance foundations.",
                    "https://www.youtube.com/watch?v=HubezKbFL7E",
                    15,
                    3,
                    false
                )
            ),
            List.of(
                new MaterialSeed("Slide Week 1: Database Fundamentals", "SLIDE", "https://www.oracle.com/database/what-is-database/"),
                new MaterialSeed("Reading: SQL Introduction", "PDF", "https://www.w3schools.com/sql/sql_intro.asp")
            ),
            "Quiz 1: Database Fundamentals",
            "This quiz checks relational database concepts and SQL basics.",
            List.of(
                new QuestionSeed(
                    QuestionType.MCQ,
                    "What identifies each row uniquely in a relational table?",
                    List.of("Primary key", "Paragraph", "Browser cache", "Style sheet"),
                    "Primary key",
                    1
                ),
                new QuestionSeed(
                    QuestionType.TRUE_FALSE,
                    "A foreign key can link records between two tables.",
                    List.of("True", "False"),
                    "True",
                    1
                ),
                new QuestionSeed(
                    QuestionType.MULTI_SELECT,
                    "Select common SQL clauses.",
                    List.of("SELECT", "WHERE", "ROUTE", "JOIN"),
                    List.of("SELECT", "WHERE", "JOIN"),
                    2
                ),
                new QuestionSeed(
                    QuestionType.SHORT_ANSWER,
                    "What does SQL stand for?",
                    List.of(),
                    "structured query language",
                    1
                ),
                new QuestionSeed(
                    QuestionType.MATCHING,
                    "Match database term to meaning.",
                    Map.of(
                        "left", List.of("Table", "Index"),
                        "right", List.of("Speeds lookup", "Stores rows")
                    ),
                    Map.of(
                        "Table", "Stores rows",
                        "Index", "Speeds lookup"
                    ),
                    2
                )
            )
        );
    }

    private Course ensureCourse(UserAccount lecturer, String title, String description) {
        return courseRepository.findByLecturerId(lecturer.getId()).stream()
            .filter(course -> title.equalsIgnoreCase(course.getTitle()))
            .findFirst()
            .orElseGet(() -> createCourse(lecturer, title, description));
    }

    private void ensureCourseBundle(
        UserAccount lecturer,
        Course course,
        List<VideoSeed> videos,
        List<MaterialSeed> materials,
        String quizTitle,
        String quizDescription,
        List<QuestionSeed> questions
    ) throws JsonProcessingException {
        List<LessonVideo> existingVideos = lessonVideoRepository.findByCourseIdOrderBySortOrder(course.getId());
        for (VideoSeed video : videos) {
            upsertVideo(course, existingVideos, video);
        }

        List<CourseMaterial> existingMaterials = courseMaterialRepository.findByCourseId(course.getId());
        for (MaterialSeed material : materials) {
            upsertMaterial(course, existingMaterials, material.title(), material.materialType(), material.url());
        }

        Quiz quiz = quizRepository.findByCourseId(course.getId()).stream()
            .filter(item -> quizTitle.equalsIgnoreCase(item.getTitle()))
            .findFirst()
            .orElseGet(() -> createQuiz(course, quizTitle, quizDescription));

        if (questionRepository.findByQuizIdOrderBySortOrder(quiz.getId()).isEmpty()) {
            int sortOrder = 1;
            for (QuestionSeed question : questions) {
                QuestionBankItem bankItem = createQuestion(
                    lecturer,
                    course,
                    question.type(),
                    question.prompt(),
                    question.options(),
                    question.answer(),
                    question.points()
                );
                saveQuizQuestion(quiz, bankItem, sortOrder++);
            }
        }
    }

    private void upsertVideo(Course course, List<LessonVideo> videos, VideoSeed seed) {
        LessonVideo existing = videos.stream()
            .filter(video -> seed.title().equalsIgnoreCase(video.getTitle()))
            .findFirst()
            .orElse(null);

        if (existing == null) {
            createVideo(
                course,
                seed.title(),
                seed.description(),
                seed.url(),
                seed.durationMinutes(),
                seed.sortOrder(),
                seed.mandatory()
            );
            return;
        }

        boolean changed = false;
        if (!seed.description().equals(existing.getDescription())) {
            existing.setDescription(seed.description());
            changed = true;
        }
        if (!seed.url().equals(existing.getVideoUrl())) {
            existing.setVideoUrl(seed.url());
            changed = true;
        }
        if (existing.getDurationMinutes() != seed.durationMinutes()) {
            existing.setDurationMinutes(seed.durationMinutes());
            changed = true;
        }
        if (existing.getSortOrder() != seed.sortOrder()) {
            existing.setSortOrder(seed.sortOrder());
            changed = true;
        }
        if (existing.isMandatory() != seed.mandatory()) {
            existing.setMandatory(seed.mandatory());
            changed = true;
        }
        if (changed) {
            lessonVideoRepository.save(existing);
        }
    }

    private Quiz createQuiz(Course course, String title, String description) {
        Quiz quiz = new Quiz();
        quiz.setCourse(course);
        quiz.setTitle(title);
        quiz.setDescription(description);
        quiz.setTimeLimitMinutes(10);
        quiz.setMaxAttempts(2);
        quiz.setPassingMark(50.0);
        quiz.setPublished(true);
        quiz.setUnlockAfterVideos(true);
        quiz.setShuffleQuestions(false);
        quiz.setShuffleAnswers(false);
        quiz.setQuestionDisplayMode(QuizDisplayMode.ONE_BY_ONE);
        quiz.setShowResultImmediately(true);
        return quizRepository.save(quiz);
    }

    private void upsertMaterial(
        Course course,
        List<CourseMaterial> materials,
        String title,
        String materialType,
        String url
    ) {
        CourseMaterial existing = materials.stream()
            .filter(material -> title.equalsIgnoreCase(material.getTitle()))
            .findFirst()
            .orElse(null);

        if (existing == null) {
            createMaterial(course, title, materialType, url);
            return;
        }

        if (!materialType.equals(existing.getMaterialType()) || !url.equals(existing.getResourceUrl())) {
            existing.setMaterialType(materialType);
            existing.setResourceUrl(url);
            courseMaterialRepository.save(existing);
        }
    }

    private Course createCourse(UserAccount lecturer, String title, String description) {
        Course course = new Course();
        course.setLecturer(lecturer);
        course.setTitle(title);
        course.setDescription(description);
        return courseRepository.save(course);
    }

    private void enroll(UserAccount student, Course course) {
        if (!enrollmentRepository.existsByStudentIdAndCourseId(student.getId(), course.getId())) {
            Enrollment enrollment = new Enrollment();
            enrollment.setStudent(student);
            enrollment.setCourse(course);
            enrollmentRepository.save(enrollment);
        }
    }

    private LessonVideo createVideo(
        Course course,
        String title,
        String description,
        String url,
        int duration,
        int order,
        boolean mandatory
    ) {
        LessonVideo video = new LessonVideo();
        video.setCourse(course);
        video.setTitle(title);
        video.setDescription(description);
        video.setVideoUrl(url);
        video.setDurationMinutes(duration);
        video.setSortOrder(order);
        video.setMandatory(mandatory);
        return lessonVideoRepository.save(video);
    }

    private void createMaterial(Course course, String title, String type, String url) {
        CourseMaterial material = new CourseMaterial();
        material.setCourse(course);
        material.setTitle(title);
        material.setMaterialType(type);
        material.setResourceUrl(url);
        courseMaterialRepository.save(material);
    }

    private QuestionBankItem createQuestion(
        UserAccount lecturer,
        Course course,
        QuestionType type,
        String prompt,
        Object options,
        Object answer,
        int points
    ) throws JsonProcessingException {
        QuestionBankItem item = new QuestionBankItem();
        item.setCreator(lecturer);
        item.setCourse(course);
        item.setQuestionType(type);
        item.setDifficultyLevel(DifficultyLevel.MEDIUM);
        item.setTopicTag(course.getTitle());
        item.setModuleTag(course.getTitle());
        item.setPrompt(prompt);
        item.setExplanation("Review core concept from lesson.");
        item.setOptionsJson(objectMapper.writeValueAsString(options));
        item.setCorrectAnswerJson(objectMapper.writeValueAsString(answer));
        item.setPoints(points);
        return questionBankItemRepository.save(item);
    }

    private void saveQuizQuestion(Quiz quiz, QuestionBankItem source, int sortOrder) {
        Question question = new Question();
        question.setQuiz(quiz);
        question.setQuestionType(source.getQuestionType());
        question.setPrompt(source.getPrompt());
        question.setExplanation(source.getExplanation());
        question.setOptionsJson(source.getOptionsJson());
        question.setCorrectAnswerJson(source.getCorrectAnswerJson());
        question.setPoints(source.getPoints());
        question.setSortOrder(sortOrder);
        questionRepository.save(question);
    }

    private record VideoSeed(
        String title,
        String description,
        String url,
        int durationMinutes,
        int sortOrder,
        boolean mandatory
    ) {}

    private record MaterialSeed(String title, String materialType, String url) {}

    private record QuestionSeed(
        QuestionType type,
        String prompt,
        Object options,
        Object answer,
        int points
    ) {}
}
