// API client with CSRF header X-KT: 1 and Standalone/GitHub Pages fallback
import { clientDb } from './client-db.js';

export class ApiError extends Error {
  constructor(status, code, extra = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const isStandalone = typeof window !== 'undefined' && (
  window.location.hostname.endsWith('github.io') ||
  window.location.hostname === '' ||
  window.location.protocol === 'file:' ||
  window.__STANDALONE_MODE__ === true
);

async function request(url, options = {}) {
  let parsedBody = options.body;
  if (parsedBody && typeof parsedBody === 'string') {
    try { parsedBody = JSON.parse(parsedBody); } catch {}
  }

  if (isStandalone) {
    return clientDb.handle(options.method || 'GET', url, parsedBody);
  }

  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
    headers['X-KT'] = '1';
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
  }

  try {
    const res = await fetch(url, { ...options, headers });
    if (res.status === 204) return null;

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 404 && typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
        return clientDb.handle(options.method || 'GET', url, parsedBody);
      }
      throw new ApiError(res.status, data.error || 'unknown_error', data);
    }
    return data;
  } catch (err) {
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
      return clientDb.handle(options.method || 'GET', url, parsedBody);
    }
    throw err;
  }
}

export const api = {
  get: (url) => request(url, { method: 'GET' }),
  post: (url, body) => request(url, { method: 'POST', body }),
  put: (url, body) => request(url, { method: 'PUT', body }),
  patch: (url, body) => request(url, { method: 'PATCH', body }),
  delete: (url) => request(url, { method: 'DELETE' }),

  // Auth
  me: () => api.get('/api/me'),
  loginDemo: (role) => api.post('/api/auth/demo', { role }),
  studentRegister: (data) => api.post('/api/auth/student/register', data),
  studentLogin: (data) => api.post('/api/auth/student/login', data),
  teacherRegister: (data) => api.post('/api/auth/teacher/register', data),
  teacherLogin: (data) => api.post('/api/auth/login', data),
  logout: () => api.post('/api/auth/logout'),
  updateProfile: (data) => api.patch('/api/me', data),
  setTipsSeen: () => api.post('/api/me/tips-seen'),
  submitOnboarding: (data) => api.post('/api/me/onboarding', data),
  updateGoal: (data) => api.patch('/api/goal', data),

  // Student Views
  getWorld: () => api.get('/api/world'),
  getShelf: () => api.get('/api/shelf'),
  getBooks: (q = {}) => {
    const cleanParams = {};
    for (const [k, v] of Object.entries(q)) {
      if (v !== undefined && v !== null && v !== '' && v !== 'undefined') {
        cleanParams[k] = v;
      }
    }
    const sp = new URLSearchParams(cleanParams).toString();
    return api.get('/api/books' + (sp ? '?' + sp : ''));
  },
  getBook: (id) => api.get(`/api/books/${id}`),
  getChapter: (bookId, idx) => api.get(`/api/books/${bookId}/chapters/${idx}`),
  addBookManual: (data) => api.post('/api/books', data),
  updateShelfBook: (bookId, data) => api.put(`/api/shelf/${bookId}`, data),
  removeShelfBook: (bookId) => api.delete(`/api/shelf/${bookId}`),
  addLog: (bookId, data) => api.post(`/api/books/${bookId}/logs`, data),
  updateLog: (logId, data) => api.patch(`/api/logs/${logId}`, data),
  deleteLog: (logId) => api.delete(`/api/logs/${logId}`),

  // Games & Responses
  getPlayDashboard: () => api.get('/api/play'),
  getTask: (id) => api.get(`/api/tasks/${id}`),
  attemptTask: (id, answer) => api.post(`/api/tasks/${id}/attempt`, { answer }),
  respondTask: (id, data) => api.post(`/api/tasks/${id}/response`, data),
  sendReflection: (bookId, text) => api.post(`/api/books/${bookId}/reflection`, { text }),
  getMyResponses: () => api.get('/api/responses'),
  markFeedbackSeen: () => api.post('/api/responses/seen'),

  // Class Missions & Achievements & Diary & Quizzes
  getDiary: () => api.get('/api/diary'),
  addDiaryEntry: (data) => api.post('/api/diary', data),
  getMission: () => api.get('/api/mission'),
  getLeaderboard: () => api.get('/api/leaderboard'),
  getAchievements: () => api.get('/api/achievements'),
  getQuiz: (bookId) => api.get(`/api/books/${bookId}/quiz`),
  submitQuiz: (bookId, answers) => api.post(`/api/books/${bookId}/quiz/submit`, { answers }),

  // Teacher Endpoints
  teacherClasses: () => api.get('/api/teacher/classes'),
  teacherCreateClass: (data) => api.post('/api/teacher/classes', data),
  teacherUpdateClass: (id, data) => api.patch(`/api/teacher/classes/${id}`, data),
  teacherNewCode: (id) => api.post(`/api/teacher/classes/${id}/new-code`),
  teacherOverview: (classId) => api.get(`/api/teacher/classes/${classId}/overview`),
  teacherResetPin: (studentId) => api.post(`/api/teacher/students/${studentId}/reset-pin`),
  teacherAssignBook: (classId, data) => api.post(`/api/teacher/classes/${classId}/assign`, data),
  teacherTasks: (bookId) => api.get('/api/teacher/tasks' + (bookId ? `?bookId=${bookId}` : '')),
  teacherTaskDetail: (id) => api.get(`/api/teacher/tasks/${id}`),
  teacherCreateTask: (data) => api.post('/api/teacher/tasks', data),
  teacherUpdateTask: (id, data) => api.patch(`/api/teacher/tasks/${id}`, data),
  teacherPublishTask: (id, publish) => api.post(`/api/teacher/tasks/${id}/publish`, { publish }),
  teacherCheckTask: (id, data) => api.post(`/api/teacher/tasks/${id}/check`, data),
  teacherDraft: (data) => api.post('/api/teacher/draft', data),
  teacherReviews: (status = 'pending', classId = null) => {
    let url = `/api/teacher/reviews?status=${status}`;
    if (classId) url += `&classId=${classId}`;
    return api.get(url);
  },
  teacherReviewDecision: (id, decision, feedback) => api.post(`/api/teacher/reviews/${id}`, { decision, feedback }),
  teacherMissions: (classId) => api.get(`/api/teacher/classes/${classId}/missions`),
  teacherCreateMission: (classId, data) => api.post(`/api/teacher/classes/${classId}/missions`, data),
};
