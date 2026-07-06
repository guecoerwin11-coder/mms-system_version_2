-- MMS: A Web-Based Guide in Learning Video Editing
-- MySQL Database Schema
CREATE DATABASE IF NOT EXISTS multi_media_system_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE multi_media_system_db;
-- USERS
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  -- bcrypt hashed
  role ENUM('instructor', 'student') NOT NULL DEFAULT 'student',
  year VARCHAR(20),
  -- student only
  section VARCHAR(10),
  -- student only
  department VARCHAR(100),
  -- instructor only
  profile_pic VARCHAR(500),
  -- Cloudinary URL
  gmail VARCHAR(150),
  -- for password reset
  reset_token VARCHAR(255),
  reset_expiry DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--  CHAPTERS
CREATE TABLE chapters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  content LONGTEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT INTO chapters (number, title)
VALUES (1, 'Introduction to Multimedia'),
  (2, 'Stages of Multimedia project'),
  (3, 'Welcome to OBS'),
  (4, 'Documentary Film Production'),
  (5, 'Da Vinci Resolve'),
  (6, 'Music Video Production');
--  CHAPTER SLIDES
CREATE TABLE chapter_slides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id INT NOT NULL,
  slide_order INT NOT NULL DEFAULT 1,
  title VARCHAR(200),
  content TEXT,
  image_url VARCHAR(500),
  -- Cloudinary URL
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);
--  CHAPTER VIDEOS
CREATE TABLE chapter_videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  cloudinary_url VARCHAR(500) NOT NULL,
  cloudinary_id VARCHAR(200),
  duration_sec INT,
  file_size_mb DECIMAL(8, 2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);
-- QUIZ QUESTIONS
CREATE TABLE quiz_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question TEXT NOT NULL,
  option_a VARCHAR(300) NOT NULL,
  option_b VARCHAR(300) NOT NULL,
  option_c VARCHAR(300) NOT NULL,
  correct_option ENUM('A', 'B', 'C') NOT NULL,
  timer_seconds INT NOT NULL DEFAULT 30,
  is_randomized TINYINT(1) DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
INSERT INTO quiz_questions (
    question,
    option_a,
    option_b,
    option_c,
    correct_option,
    timer_seconds
  )
VALUES (
    'What is the purpose of a timeline in video editing?',
    'Store raw footage files',
    'Sequence and arrange clips in order',
    'Export the final video',
    'B',
    30
  ),
  (
    'Which codec is most commonly used for YouTube uploads?',
    'MPEG-1',
    'H.264',
    'JPEG 2000',
    'B',
    30
  ),
  (
    'What does OBS stand for?',
    'Open Broadcast Software',
    'Output Broadcast System',
    'Online Broadcast Service',
    'A',
    45
  ),
  (
    'In DaVinci Resolve, which page is used for color grading?',
    'Edit',
    'Fusion',
    'Color',
    'C',
    60
  ),
  (
    'What is a "cut" in video editing?',
    'Adding a visual effect',
    'An instant transition between clips',
    'Trimming the end of a video',
    'B',
    30
  );
-- QUIZ ATTEMPTS
CREATE TABLE quiz_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME,
  score INT DEFAULT 0,
  total INT DEFAULT 0,
  percentage DECIMAL(5, 2),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE quiz_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT NOT NULL,
  question_id INT NOT NULL,
  answer_given ENUM('A', 'B', 'C'),
  is_correct TINYINT(1),
  time_taken INT,
  -- seconds taken to answer
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id)
);
-- ACTIVITY FILES 
CREATE TABLE activity_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id INT,
  title VARCHAR(200) NOT NULL,
  file_type ENUM('pdf', 'ppt', 'docx', 'doc', 'mp4', 'png', 'jpeg') NOT NULL,
  cloudinary_url VARCHAR(500) NOT NULL,
  cloudinary_id VARCHAR(200),
  file_size_mb DECIMAL(8, 2),
  uploaded_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE
  SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
--  STUDENT SUBMISSIONS
CREATE TABLE submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  chapter_id INT,
  activity_id INT,
  title VARCHAR(200),
  cloudinary_url VARCHAR(500) NOT NULL,
  cloudinary_id VARCHAR(200),
  file_type VARCHAR(20),
  notes TEXT,
  score INT,
  feedback TEXT,
  graded_by INT,
  graded_at DATETIME,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE
  SET NULL,
    FOREIGN KEY (activity_id) REFERENCES activity_files(id) ON DELETE
  SET NULL,
    FOREIGN KEY (graded_by) REFERENCES users(id)
);
-- GROUPS & PEER EVALUATION 
-- Use backticks around `groups` because it is a reserved word in MySQL
CREATE TABLE `groups` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  section VARCHAR(10),
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE TABLE group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  student_id INT NOT NULL,
  UNIQUE KEY unique_member (group_id, student_id),
  -- FIX: Add backticks here too!
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE peer_evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evaluator_id INT NOT NULL,
  -- who is rating
  evaluatee_id INT NOT NULL,
  -- who is being rated
  group_id INT NOT NULL,
  rating INT NOT NULL CHECK (
    rating BETWEEN 1 AND 5
  ),
  comment TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_eval (evaluator_id, evaluatee_id, group_id),
  FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (evaluatee_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE
);
--  VIDEO-BASED AI QUESTIONS 
CREATE TABLE video_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  video_id INT NOT NULL,
  question TEXT NOT NULL,
  option_a VARCHAR(300),
  option_b VARCHAR(300),
  option_c VARCHAR(300),
  correct_opt ENUM('A', 'B', 'C'),
  generated_by ENUM('ai', 'manual') DEFAULT 'ai',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES chapter_videos(id) ON DELETE CASCADE
);
-- AI CHAT HISTORY 
CREATE TABLE ai_chat_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
--  CHAPTER PROGRESS 
CREATE TABLE chapter_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  chapter_id INT NOT NULL,
  completed TINYINT(1) DEFAULT 0,
  last_viewed DATETIME,
  UNIQUE KEY unique_progress (student_id, chapter_id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);