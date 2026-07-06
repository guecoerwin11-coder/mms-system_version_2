import axios from 'axios';

const API_BASE_URL = `http://localhost:5005/api` || '/api'
  

// 'https://mms-system-production-1e15.up.railway.app/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('mms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mms_token');
      localStorage.removeItem('mms_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:          data => api.post('/auth/login', data),
  forgotPassword: data => api.post('/auth/forgot-password', data),
  resetPassword:  data => api.post('/auth/reset-password', data),
  changePassword: data => api.put('/auth/change-password', data),
  getMe:          ()   => api.get('/auth/me'),
};

// ── USERS ─────────────────────────────────────────────────────────────────────
export const userAPI = {
  getStudents:       params => api.get('/users', { params }),
  updateProfile:     data   => api.put('/users/profile', data),
  uploadAvatar:      formData => api.put('/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateScore:       (id, data) => api.put(`/users/${id}/score`, data),
  importStudents:    formData => api.post('/users/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteStudent: (id) => api.delete(`/users/${id}`),
};

// ── CHAPTERS ──────────────────────────────────────────────────────────────────
export const chapterAPI = {
  getAll:        ()     => api.get('/chapters'),
  getOne:        id     => api.get(`/chapters/${id}`),
  update:        (id,d) => api.put(`/chapters/${id}`, d),
  uploadVideo:   fd     => api.post('/chapters/video', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteVideo:   id     => api.delete(`/chapters/video/${id}`),
  uploadSlide:   fd     => api.post('/chapters/slide', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteSlide: (id) => api.delete(`/chapters/slide/${id}`),
  markProgress:  data   => api.post('/chapters/progress', data),
  getProgress:   id     => api.get(`/chapters/progress/${id}`),
  getAssessmentVideos: () => api.get('/chapters/assessment-videos'),
};

// ── QUIZ ──────────────────────────────────────────────────────────────────────
export const quizAPI = {
  getQuestions:  ()   => api.get('/quiz'),
  create:        data => api.post('/quiz', data),
  update:        (id,d) => api.put(`/quiz/${id}`, d),
  remove:        id   => api.delete(`/quiz/${id}`),
  startAttempt:  ()   => api.post('/quiz/attempt/start'),
  submitAttempt: data => api.post('/quiz/attempt/submit', data),
  getAttempts:   id   => api.get(`/quiz/attempts/${id}`),
};

// ── ACTIVITIES ────────────────────────────────────────────────────────────────
export const activityAPI = {
  getAll:         params => api.get('/activities', { params }),
  upload:         fd     => api.post('/activities/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove:         id     => api.delete(`/activities/${id}`),
  getSubmissions: ()     => api.get('/activities/submissions'),
  submit:         fd     => api.post('/activities/submit', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  grade:          (id,d) => api.put(`/activities/submissions/${id}/grade`, d),
};

// ── PEER EVALUATION ───────────────────────────────────────────────────────────
export const peerAPI = {
  getGroups:    ()     => api.get('/peer'),
  getMyGroup:   ()     => api.get('/peer/my-group'),
  createGroup:  data   => api.post('/peer', data),
  updateGroup:  (id,d) => api.put(`/peer/${id}`, d),
  deleteGroup:  id     => api.delete(`/peer/${id}`),
  evaluate:     data   => api.post('/peer/evaluate', data),
  getResults:   ()     => api.get('/peer/results'),
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiAPI = {
  chat:              data => api.post('/ai/chat', data),
  getHistory:        ()   => api.get('/ai/history'),
  generateVideoQ:    data => api.post('/ai/video-question', data),
  clearHistory:      ()   => api.delete('/ai/history'),
};

export default api;
