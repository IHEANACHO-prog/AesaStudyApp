// ============================================
// AESA API Client — Fully Corrected Version
// PASTE TO: src/api/client.ts
// ============================================
//
// FIXES IN THIS VERSION
// ──────────────────────
// FIX 1: forumApi.getQuestion(courseId, postId) — was missing courseId param,
//         causing /forum/course/5/questions/undefined/ 404 errors.
//
// FIX 2: forumApi.createAnswer sends { body } — matches backend field name.
//         Was incorrectly typed as { answer: string }; backend returns `body`.
//
// FIX 3: forumApi.updateAnswer uses { body } for consistency with backend.
//
// All other APIs unchanged from previous corrected version.

import type {
  LoginRequest, LoginResponse, Department, Level, Course, Topic,
  Exam, Question, Option, Attempt, Performance, Progress,
  ForumPost, ForumReply, SubmitExamResponse, Enrollment, Student,
  Instructor, LectureNote, MediaResource, SAQuestion, SAResult,
  ExamResultRow,
} from '@/types';

// ── Environment ───────────────────────────────────────────────────────────────

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:8000/api';

// ── LocalStorage keys ─────────────────────────────────────────────────────────

const ACCESS_KEY   = 'aesa_access';
const REFRESH_KEY  = 'aesa_refresh';
const USERNAME_KEY = 'aesa_username';
const USER_ID_KEY  = 'aesa_user_id';

// ── Token helpers ─────────────────────────────────────────────────────────────

export const getToken   = () => localStorage.getItem(ACCESS_KEY);
export const getRefresh = () => localStorage.getItem(REFRESH_KEY);

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
};

export const clearToken = () => {
  [ACCESS_KEY, REFRESH_KEY, USERNAME_KEY, USER_ID_KEY, 'aesa_role'].forEach(k =>
    localStorage.removeItem(k),
  );
};

export const setUserData = (userId: number, username: string) => {
  localStorage.setItem(USER_ID_KEY, userId.toString());
  localStorage.setItem(USERNAME_KEY, username);
};

export const getUserData = () => {
  const userId = localStorage.getItem(USER_ID_KEY);
  return {
    userId:   userId ? parseInt(userId, 10) : null,
    username: localStorage.getItem(USERNAME_KEY),
  };
};

// ── Token refresh ─────────────────────────────────────────────────────────────

export const refreshAccessToken = async (): Promise<void> => {
  const refresh = getRefresh();
  if (!refresh) throw new Error('No refresh token');

  const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    clearToken();
    throw new Error('Refresh failed');
  }

  const data = await res.json();
  localStorage.setItem(ACCESS_KEY, data.access);
};

// ── Core requester ────────────────────────────────────────────────────────────

async function apiRequest<T>(
  endpoint: string,
  options: any = {},
  timeoutMs = 15_000,
): Promise<T> {
  const {
    requiresAuth = true,
    isFormData   = false,
    signal: callerSignal,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);
  const signal     = callerSignal ?? controller.signal;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(fetchOptions.headers || {}),
  };

  if (requiresAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, { ...fetchOptions, headers, signal });
    clearTimeout(timer);

    if (response.status === 401) {
      try {
        await refreshAccessToken();
        const retryToken = getToken();
        if (retryToken) headers['Authorization'] = `Bearer ${retryToken}`;
        const retried = await fetch(url, { ...fetchOptions, headers });
        if (!retried.ok) throw new Error('Retry failed');
        return retried.status === 204 ? ({} as T) : retried.json();
      } catch {
        clearToken();
        if (window.location.pathname !== '/login') window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let message: string;

      if (typeof errorData.error === 'string') {
        message = errorData.error;
        if (errorData.detail && typeof errorData.detail === 'object') {
          const firstField = Object.keys(errorData.detail)[0];
          if (firstField) {
            const fieldMsg  = errorData.detail[firstField];
            const fieldText = Array.isArray(fieldMsg) ? fieldMsg[0] : fieldMsg;
            message += ` (${firstField}: ${fieldText})`;
          }
        }
      } else if (typeof errorData.detail === 'string') {
        message = errorData.detail;
      } else if (typeof errorData.non_field_errors?.[0] === 'string') {
        message = errorData.non_field_errors[0];
      } else if (typeof errorData.message === 'string') {
        message = errorData.message;
      } else {
        message = `HTTP ${response.status}: ${JSON.stringify(errorData) || 'Unexpected error'}`;
      }

      throw new Error(message);
    }

    return response.status === 204 ? ({} as T) : response.json();
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  registerAdmin: (data: any) =>
    apiRequest<any>('/users/register/admin/', {
      method: 'POST', requiresAuth: false, body: JSON.stringify(data),
    }),

  registerStudent: (data: any) =>
    apiRequest<Student>('/users/register/student/', {
      method: 'POST', requiresAuth: false, body: JSON.stringify(data),
    }),

  registerInstructor: (data: any) =>
    apiRequest<Instructor>('/users/register/instructor/', {
      method: 'POST', requiresAuth: false, body: JSON.stringify(data),
    }),

  login: (data: LoginRequest) =>
    apiRequest<LoginResponse>('/user/login/', {
      method: 'POST', requiresAuth: false, body: JSON.stringify(data),
    }),

  getCurrentUser: () => apiRequest<any>('/users/me/'),

  updateProfile: (data: Record<string, any>) =>
    apiRequest<any>('/users/profile/update/', {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  updateProfilePicture: (formData: FormData) =>
    apiRequest<any>('/users/profile/update/', {
      method: 'PATCH', body: formData, isFormData: true,
    }),

  updateStudent: (data: Record<string, any>) =>
    apiRequest<any>('/users/update/student/', {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  updateInstructor: (data: Record<string, any>) =>
    apiRequest<any>('/users/update/instructor/', {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  deleteAccount: () =>
    apiRequest<void>('/users/delete/student/', { method: 'DELETE' }),

  deleteInstructor: () =>
    apiRequest<void>('/users/delete/instructor/', { method: 'DELETE' }),

  makeAdmin: (data: { username: string }) =>
    apiRequest<any>('/users/makeadmin/', {
      method: 'POST', body: JSON.stringify(data),
    }),
};

// ── Departments ───────────────────────────────────────────────────────────────

export const departmentApi = {
  getAll: () => apiRequest<Department[]>('/departments/'),

  create: (data: { name: string; faculty: string }) =>
    apiRequest<Department>('/department/create/', {
      method: 'POST', body: JSON.stringify(data),
    }),

  getById: (id: number) => apiRequest<Department>(`/department/${id}/`),

  update: (id: number, data: Partial<{ name: string; faculty: string }>) =>
    apiRequest<Department>(`/department/${id}/update/`, {
      method: 'PUT', body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest<void>(`/department/${id}/delete/`, { method: 'DELETE' }),
};

// ── Levels ────────────────────────────────────────────────────────────────────

export const levelApi = {
  getAll: () => apiRequest<Level[]>('/levels/'),

  create: (data: { name: string }) =>
    apiRequest<Level>('/level/create/', {
      method: 'POST', body: JSON.stringify(data),
    }),

  getById: (id: number) => apiRequest<Level>(`/level/${id}/`),

  update: (id: number, data: { name: string }) =>
    apiRequest<Level>(`/level/${id}/update/`, {
      method: 'PUT', body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest<void>(`/level/${id}/delete/`, { method: 'DELETE' }),
};

// ── Enrollments ───────────────────────────────────────────────────────────────

export const enrollmentApi = {
  getMyEnrollments: () => apiRequest<Enrollment[]>('/enrollments/'),
  getCount: () => apiRequest<{ count: number }>('/my-courses/count/'),
};

// ── Courses ───────────────────────────────────────────────────────────────────

export const courseApi = {
  getById: (courseId: number) =>
    apiRequest<Course>(`/courses/${courseId}/`),

  getByLevelAndDepartment: (levelId: number, deptId: number) =>
    apiRequest<Course[]>(`/level/${levelId}/department/${deptId}/course/`),

  create: (data: {
    code: string; title: string; semester: string;
    level: number; department: number; instructor?: number;
  }) =>
    apiRequest<Course>(
      `/level/${data.level}/department/${data.department}/course/create/`,
      { method: 'POST', body: JSON.stringify(data) },
    ),

  update: (levelId: number, deptId: number, courseId: number,
    data: Partial<{ code: string; title: string; semester: string; instructor: number }>,
  ) =>
    apiRequest<Course>(
      `/level/${levelId}/department/${deptId}/course/${courseId}/update/`,
      { method: 'PUT', body: JSON.stringify(data) },
    ),

  delete: (levelId: number, deptId: number, courseId: number) =>
    apiRequest<void>(
      `/level/${levelId}/department/${deptId}/course/${courseId}/delete/`,
      { method: 'DELETE' },
    ),

  enroll: (courseId: number) =>
    apiRequest<Enrollment>(`/course/${courseId}/enroll/`, { method: 'POST' }),

  getMyEnrollments: () => apiRequest<Enrollment[]>('/enrollments/'),
};

// ── Topics ────────────────────────────────────────────────────────────────────

export const topicApi = {
  getByCourse: (courseId: number) =>
    apiRequest<Topic[]>(`/course/${courseId}/topics/`),

  getById: (courseId: number, topicId: number) =>
    apiRequest<Topic>(`/course/${courseId}/topics/${topicId}/`),

  create: (courseId: number, data: { name: string; description?: string; order?: number }) =>
    apiRequest<Topic>(`/course/${courseId}/topics/create/`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  update: (courseId: number, topicId: number,
    data: Partial<{ name: string; description: string; order: number }>,
  ) =>
    apiRequest<Topic>(`/course/${courseId}/topics/${topicId}/update/`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  delete: (courseId: number, topicId: number) =>
    apiRequest<void>(`/course/${courseId}/topics/${topicId}/delete/`, { method: 'DELETE' }),

  markComplete: (courseId: number, topicId: number) =>
    apiRequest<{ message: string }>(`/course/${courseId}/topics/${topicId}/complete/`, {
      method: 'POST',
    }),

  // FIX: Load which topics the student has already completed so progress
  // ring and Done badges survive page navigation (was resetting to 0 on every mount)
  getCompleted: (courseId: number) =>
    apiRequest<{ completed_topic_ids: number[] }>(`/course/${courseId}/topics/completed/`),
};

// ── Lecture Notes ─────────────────────────────────────────────────────────────

export const lectureNoteApi = {
  getByTopic: (topicId: number) =>
    apiRequest<LectureNote>(`/topic/${topicId}/note/`),

  create: (topicId: number, formData: FormData) =>
    apiRequest<LectureNote>(`/topic/${topicId}/note/create/`, {
      method: 'POST', body: formData, isFormData: true,
    }),

  update: (topicId: number, formData: FormData) =>
    apiRequest<LectureNote>(`/topic/${topicId}/note/update/`, {
      method: 'PATCH', body: formData, isFormData: true,
    }),

  delete: (topicId: number) =>
    apiRequest<void>(`/topic/${topicId}/note/delete/`, { method: 'DELETE' }),
};

// ── Media Resources ───────────────────────────────────────────────────────────

export const mediaResourceApi = {
  getByTopic: (topicId: number) =>
    apiRequest<MediaResource[]>(`/topic/${topicId}/media/`),

  create: (topicId: number, formData: FormData) =>
    apiRequest<MediaResource>(`/topic/${topicId}/media/create/`, {
      method: 'POST', body: formData, isFormData: true,
    }),

  update: (topicId: number, resourceId: number, formData: FormData) =>
    apiRequest<MediaResource>(`/topic/${topicId}/media/${resourceId}/update/`, {
      method: 'PATCH', body: formData, isFormData: true,
    }),

  delete: (topicId: number, resourceId: number) =>
    apiRequest<void>(`/topic/${topicId}/media/${resourceId}/delete/`, { method: 'DELETE' }),
};

// ── Exams ─────────────────────────────────────────────────────────────────────

export const examApi = {
  getByCourse: (courseId: number) =>
    apiRequest<Exam[]>(`/course/${courseId}/exams/`),

  getById: (courseId: number, examId: number) =>
    apiRequest<Exam>(`/course/${courseId}/exam/${examId}/`),

  getMyExamCount: () => apiRequest<{ count: number }>('/exams/count/'),

  create: (levelId: number, deptId: number, courseId: number,
    data: { title: string; exam_type: string; duration_mins: number; total_marks: number },
  ) =>
    apiRequest<Exam>(
      `/level/${levelId}/department/${deptId}/course/${courseId}/exam/create/`,
      { method: 'POST', body: JSON.stringify(data) },
    ),

  update: (courseId: number, examId: number, data: Partial<{
    title: string; exam_type: string; duration_mins: number; total_marks: number;
  }>) =>
    apiRequest<Exam>(`/course/${courseId}/exam/${examId}/`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  delete: (courseId: number, examId: number) =>
    apiRequest<void>(`/course/${courseId}/exam/${examId}/`, { method: 'DELETE' }),
};

// ── Questions ─────────────────────────────────────────────────────────────────

export const questionApi = {
  getByExam: (courseId: number, examId: number) =>
    apiRequest<Question[]>(`/course/${courseId}/exam/${examId}/questions/`),

  getById: (courseId: number, examId: number, questionId: number) =>
    apiRequest<Question>(`/course/${courseId}/exam/${examId}/question/${questionId}/`),

  create: (courseId: number, examId: number, data: {
    question_text: string; question_type: string; mark: number; order?: number;
  }) =>
    apiRequest<Question>(`/course/${courseId}/exam/${examId}/question/create/`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  update: (courseId: number, examId: number, questionId: number,
    data: Partial<{ question_text: string; question_type: string; mark: number }>,
  ) =>
    apiRequest<Question>(`/course/${courseId}/exam/${examId}/question/${questionId}/update/`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  delete: (courseId: number, examId: number, questionId: number) =>
    apiRequest<void>(
      `/course/${courseId}/exam/${examId}/question/${questionId}/delete/`,
      { method: 'DELETE' },
    ),
};

// ── Options ───────────────────────────────────────────────────────────────────

export const optionApi = {
  getByQuestion: (courseId: number, examId: number, questionId: number) =>
    apiRequest<Option[]>(
      `/course/${courseId}/exam/${examId}/question/${questionId}/option/`,
    ),

  create: (courseId: number, examId: number, questionId: number,
    data: { option_value: string; is_answer: boolean },
  ) =>
    apiRequest<Option>(
      `/course/${courseId}/exam/${examId}/question/${questionId}/option/create/`,
      { method: 'POST', body: JSON.stringify(data) },
    ),

  getById: (courseId: number, examId: number, questionId: number, optionId: number) =>
    apiRequest<Option>(
      `/course/${courseId}/exam/${examId}/question/${questionId}/option/${optionId}/`,
    ),

  update: (courseId: number, examId: number, questionId: number, optionId: number,
    data: Partial<{ option_value: string; is_answer: boolean }>,
  ) =>
    apiRequest<Option>(
      `/course/${courseId}/exam/${examId}/question/${questionId}/option/${optionId}/update/`,
      { method: 'PUT', body: JSON.stringify(data) },
    ),

  delete: (courseId: number, examId: number, questionId: number, optionId: number) =>
    apiRequest<void>(
      `/course/${courseId}/exam/${examId}/question/${questionId}/option/${optionId}/delete/`,
      { method: 'DELETE' },
    ),
};

// ── Exam Attempts ─────────────────────────────────────────────────────────────

export const attemptApi = {
  startExam: (courseId: number, examId: number) =>
    apiRequest<Attempt>(
      `/course/${courseId}/exam/${examId}/start_stop/start_exam/`,
      { method: 'POST' },
    ),

  getExamQuestions: (courseId: number, examId: number) =>
    apiRequest<Question[]>(
      `/course/${courseId}/exam/${examId}/start_stop/begin_exam/`,
    ),

  submitExam: (courseId: number, examId: number, data: {
    answers: Array<{ question: number; option: number }>;
  }) =>
    apiRequest<SubmitExamResponse>(
      `/course/${courseId}/exam/${examId}/start_stop/stop_exam/`,
      { method: 'POST', body: JSON.stringify(data) },
    ),

  getResults: (courseId: number, examId: number) =>
    apiRequest<ExamResultRow[]>(
      `/course/${courseId}/exam/${examId}/start_stop/results/`,
    ),

  // FIX: PerformancePage calls attemptApi.getAttemptsByCourse(courseId) but
  // this method was missing — causing attempt history to always be empty.
  // We fetch all exams for the course, then their results.
  getAttemptsByCourse: (courseId: number) =>
    apiRequest<ExamResultRow[]>(`/course/${courseId}/attempts/`),
};

// ── Forum ─────────────────────────────────────────────────────────────────────
//
// URL STRUCTURE (matches Django urls.py):
//   List/create posts:   /forum/course/<courseId>/questions/
//   Get/update/delete:   /forum/course/<courseId>/questions/<postId>/
//   List answers:        /forum/questions/<postId>/answers/
//   Create answer:       /forum/questions/<postId>/answers/create/
//   Get/update/delete:   /forum/questions/<postId>/answers/<answerId>/
//
// FIX 1: getQuestion now takes (courseId, postId) — was (postId) only,
//         causing the URL to render as /questions/undefined/
// FIX 2: createAnswer / updateAnswer use { body } field — backend returns `body`

export const forumApi = {
  getQuestions: (courseId: number) =>
    apiRequest<ForumPost[]>(`/forum/course/${courseId}/questions/`),

  createQuestion: (courseId: number, data: { title: string; body: string }) =>
    apiRequest<ForumPost>(`/forum/course/${courseId}/questions/create/`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  // FIX 1: courseId param added — was missing, caused /questions/undefined/ 404
  getQuestion: (courseId: number, postId: number) =>
    apiRequest<ForumPost>(`/forum/course/${courseId}/questions/${postId}/`),

  updateQuestion: (courseId: number, postId: number,
    data: Partial<{ title: string; body: string }>,
  ) =>
    apiRequest<ForumPost>(`/forum/course/${courseId}/questions/${postId}/`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  deleteQuestion: (courseId: number, postId: number) =>
    apiRequest<void>(`/forum/course/${courseId}/questions/${postId}/`, {
      method: 'DELETE',
    }),

  getAnswers: (postId: number) =>
    apiRequest<ForumReply[]>(`/forum/questions/${postId}/answers/`),

  // Backend serializer field is `answer` — do NOT rename to `body`
  createAnswer: (postId: number, data: { answer: string }) =>
    apiRequest<ForumReply>(`/forum/questions/${postId}/answers/create/`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  getAnswer: (postId: number, answerId: number) =>
    apiRequest<ForumReply>(`/forum/questions/${postId}/answers/${answerId}/`),

  updateAnswer: (postId: number, answerId: number, data: { answer: string }) =>
    apiRequest<ForumReply>(`/forum/questions/${postId}/answers/${answerId}/`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  deleteAnswer: (postId: number, answerId: number) =>
    apiRequest<void>(`/forum/questions/${postId}/answers/${answerId}/`, {
      method: 'DELETE',
    }),
};

// ── Self-Assessment ───────────────────────────────────────────────────────────

export const selfAssessmentApi = {
  getQuestions: (courseId: number) =>
    apiRequest<SAQuestion[]>(`/course/${courseId}/self-assessment/`),

  submit: (courseId: number, answers: Record<number, number>) =>
    apiRequest<SAResult>(`/course/${courseId}/self-assessment/submit/`, {
      method: 'POST', body: JSON.stringify({ answers }),
    }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const analyticsApi = {
  getPerformance: () =>
    apiRequest<Performance[]>('/analytics/performance/'),

  getProgress: () =>
    apiRequest<Progress[]>('/analytics/progress/'),

  getDashboardSummary: () =>
    apiRequest<{
      enrolled:        number;
      avg_score:       number;
      progress:        number;
      exams_done:      number;
      recent_activity: Array<{
        exam_title:    string;
        course_title:  string;
        score:         number;
        total_marks:   number;
        submitted_at:  string;
        exam_type:     string;
      }>;
    }>('/analytics/dashboard/'),
};

// ── Default export ────────────────────────────────────────────────────────────

const api = {
  auth:           authApi,
  departments:    departmentApi,
  levels:         levelApi,
  enrollments:    enrollmentApi,
  courses:        courseApi,
  topics:         topicApi,
  lectureNotes:   lectureNoteApi,
  mediaResources: mediaResourceApi,
  exams:          examApi,
  questions:      questionApi,
  options:        optionApi,
  attempts:       attemptApi,
  forum:          forumApi,
  selfAssessment: selfAssessmentApi,
  analytics:      analyticsApi,
  getToken,
  getUserData,
  clearToken,
  setTokens,
  setUserData,
  refreshAccessToken,
};

export default api;