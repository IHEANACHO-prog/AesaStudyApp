// ============================================
// AESA Study Platform - TypeScript Types
// ============================================

// User Roles
export type UserRole = 'student' | 'instructor' | 'admin';

// Base User Interface
export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  date_joined?: string;
  // FIX: added profile_picture field — backend returns a relative /media/... path or null
  profile_picture?: string | null;
  // FIX: added is_staff so ForumThreadPage can badge instructor replies
  is_staff?: boolean;
}

// Student Profile
export interface Student {
  id: number;
  user: User;
  department: Department;
  level: Level;
  matric_number: string;
}

// Teacher Profile (backend exposes M2M as `level`)
export interface Instructor {
  id: number;
  user: User;
  department: Department;
  staff_id: string;
  level: Level[];
}

// Department
export interface Department {
  id: number;
  name: string;
  faculty: string;
}

// Academic Level
export interface Level {
  id: number;
  name: string;
}

// Course
export interface Course {
  id: number;
  code: string;
  title: string;
  semester: 'FIRST' | 'SECOND';
  level: Level;
  department: Department;
  instructor: Instructor | null;
}

// Topic (backend TopicSerializer uses `course_details`)
export interface Topic {
  id: number;
  name: string;
  course_details?: Course;
}

// --- PHASE 3: CONTENT DELIVERY TYPES ---

export interface LectureNote {
  id:          number;
  topic:       number;
  content:     string;
  pdf_file:    string | null;
  created_by:  number | null;
  updated_by:  number | null;
  created_at:  string;
  updated_at:  string;
}

export interface MediaResource {
  id:          number;
  topic:       number;
  media_type:  'image' | 'pdf' | 'video_link';
  title:       string;
  file:        string | null;
  url:         string | null;
  uploaded_by: number | null;
  created_at:  string;
}

// --- PHASE 3: SELF-ASSESSMENT TYPES ---

export interface SAOption {
  id:          number;
  option_text: string;
  is_correct?: boolean;  // only visible after submission
}

export interface SAQuestion {
  id:            number;
  course:        number;
  question_text: string;
  question_type: 'mcq' | 'true_false';
  order:         number;
  options:       SAOption[];
}

export interface SAResult {
  score:      number;
  total:      number;
  percentage: number;
}

// ---------------------------------------

// Material (legacy / generic uploads)
export interface Material {
  id: number;
  title: string;
  file: string;
  topic_details?: Topic;
  is_downloadable: boolean;
  uploaded_at?: string;
}

// Enrollment
export interface Enrollment {
  id: number;
  student: number;
  course: Course;
  enrolled_at: string;
}

// Exam Types
export type ExamType = 'practice' | 'test' | 'exam';

// Question Types (note: typo 'questin_type' is in the backend)
export type QuestionType = 'mcq' | 'true_false';

// Exam
export interface Exam {
  id: number;
  title: string;
  exam_type: ExamType;
  course?: number;
  duration_mins: number;
  total_marks: number;
  created_at?: string;
}

// Question
export interface Question {
  id: number;
  exam: number;
  question_text: string;
  questin_type: QuestionType; // Note: backend typo preserved
  mark: number;
  options?: Option[];
}

// Option
export interface Option {
  id: number;
  question: number;
  option_value: string;
  is_answer: boolean;
}

// Attempt
export interface Attempt {
  id: number;
  student: number;
  exam: number;
  score: number;
  start_time: string;
  end_time: string | null;
  is_submitted: boolean;
}

// Answer
export interface Answer {
  id: number;
  attempt: number;
  question: number;
  selected_option: number;
  is_correct: boolean;
}

// Performance
export interface Performance {
  id: number;
  student: Student | number;
  course: Course;
  average_score: number;
  best_score: number;
  total_attempts: number;
  last_attempt_date: string | null;
}

// Progress
export interface Progress {
  id: number;
  course: Course;
  completed_topics: number | Topic | null;
  total_topics: number;
  progress_percentage: number;
}

// Forum Post (Q&A question)
export interface ForumPost {
  id: number;
  title: string;
  body: string;
  user: User;
  course: Course;
  created_at: string;
}

// Forum Reply (answer_forum — field name `answer` on backend)
export interface ForumReply {
  id: number;
  answer: string;
  user: User;
  created_at: string;
}

// ============================================
// API Request/Response Types
// ============================================

// Auth
export interface LoginRequest {
  username: string;
  password: string;
}

/** Simple JWT token pair from `/api/token/` */
export interface LoginResponse {
  access: string;
  refresh: string;
}

/** Matches `StudentSerializer` write fields (flat, not nested `user`). */
export interface RegisterStudentRequest {
  username: string;
  password: string;
  email: string;
  first_name: string;
  last_name: string;
  matric_number: string;
  department_name: string;
  level_name: string;
}

/** Matches `TeacherSerializer` write fields. */
export interface RegisterInstructorRequest {
  username: string;
  password: string;
  email: string;
  first_name: string;
  last_name: string;
  staff_id: string;
  department_name: string;
  level_name: string[];
}

// Exam Submission
export interface ExamAnswer {
  question: number;
  option: number;
}

export interface SubmitExamRequest {
  answers: ExamAnswer[];
}

export interface SubmitExamResponse {
  message: string;
  score: number;
  average_score: number;
}

/** Shape returned by `/start_stop/results/` (plain strings, not nested models). */
export interface ExamResultRow {
  question: string;
  selected_option: string;
  is_correct: boolean;
  correct_answer: string;
}

// Legacy rich shape (optional UI helpers)
export interface QuestionResult {
  question: Question;
  selected_option: Option;
  correct_option: Option;
  is_correct: boolean;
}

export interface ExamResults {
  attempt: Attempt;
  answers: QuestionResult[];
  total_questions: number;
  correct_answers: number;
}

// ============================================
// UI State Types
// ============================================

export interface DashboardStats {
  enrolledCourses: number;
  pendingExams: number;
  averageScore: number;
  progressPercentage: number;
}

export interface ActivityItem {
  id: number;
  type: 'exam_completed' | 'topic_completed' | 'material_downloaded' | 'enrolled';
  description: string;
  timestamp: string;
  courseName?: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: UserRole[];
}

// ============================================
// Form Types
// ============================================

export interface CourseFormData {
  code: string;
  title: string;
  semester: 'FIRST' | 'SECOND';
  level: number;
  department: number;
}

export interface TopicFormData {
  name: string;
}

export interface MaterialFormData {
  title: string;
  file: File | null;
  is_downloadable: boolean;
}

export interface ExamFormData {
  title: string;
  exam_type: ExamType;
  duration_mins: number;
  total_marks: number;
}

export interface QuestionFormData {
  question_text: string;
  questin_type: QuestionType;
  mark: number;
}

export interface OptionFormData {
  option_value: string;
  is_answer: boolean;
}

export interface DepartmentFormData {
  name: string;
  faculty: string;
}

export interface LevelFormData {
  name: string;
}

export interface ForumPostFormData {
  title: string;
  body: string;
  course: number;
}

export interface ProfileUpdateData {
  first_name: string;
  last_name: string;
  email: string;
}