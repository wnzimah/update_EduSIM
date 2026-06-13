CREATE DATABASE IF NOT EXISTS edusim;

CREATE TABLE IF NOT EXISTS quiz_feedback_settings (
  quiz_id BIGINT NOT NULL PRIMARY KEY,
  review_timing VARCHAR(40) NOT NULL DEFAULT 'IMMEDIATE_AFTER_SUBMISSION',
  show_selected_answer BOOLEAN NOT NULL DEFAULT TRUE,
cd  show_correct_answer BOOLEAN NOT NULL DEFAULT TRUE,
  show_explanation BOOLEAN NOT NULL DEFAULT TRUE,
  show_recommendation BOOLEAN NOT NULL DEFAULT TRUE,
  show_confidence BOOLEAN NOT NULL DEFAULT TRUE,
  show_score_breakdown BOOLEAN NOT NULL DEFAULT TRUE,
  manual_release_status BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  lesson_id BIGINT NOT NULL,
  video_progress INT NOT NULL DEFAULT 0,
  notes_opened BOOLEAN NOT NULL DEFAULT FALSE,
  notes_completion INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  last_accessed DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_lesson_progress_student_lesson (student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS topic_learning_resources (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT NOT NULL,
  topic VARCHAR(120) NOT NULL,
  video_id BIGINT NULL,
  notes_id BIGINT NULL,
  practice_quiz_id BIGINT NULL,
  KEY idx_topic_learning_resources_course_topic (course_id, topic)
);

ALTER TABLE quiz_questions
  ADD COLUMN IF NOT EXISTS topic VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(10) NULL DEFAULT 'MEDIUM';

ALTER TABLE question_bank
  MODIFY COLUMN options_json LONGTEXT NOT NULL,
  MODIFY COLUMN correct_answer_json LONGTEXT NOT NULL;

ALTER TABLE quiz_questions
  MODIFY COLUMN options_json LONGTEXT NOT NULL,
  MODIFY COLUMN correct_answer_json LONGTEXT NOT NULL;

ALTER TABLE quiz_attempt_answers
  ADD COLUMN IF NOT EXISTS correct_answer_json LONGTEXT NULL;

-- Optional dedicated user for EduSIM:
-- CREATE USER IF NOT EXISTS 'edusim_user'@'localhost' IDENTIFIED BY 'edusim_pass';
-- GRANT ALL PRIVILEGES ON edusim.* TO 'edusim_user'@'localhost';
-- FLUSH PRIVILEGES;
