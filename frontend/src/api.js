import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== POSTS ====================

export const fetchPosts = async () => {
  const response = await api.post('/posts/fetch');
  return response.data;
};

export const getPosts = async (platform = null, limit = 50) => {
  const params = { limit };
  if (platform) params.platform = platform;
  const response = await api.get('/posts', { params });
  return response.data;
};

export const createPost = async (postData) => {
  const response = await api.post('/posts/create', postData);
  return response.data;
};

export const getPost = async (postId) => {
  const response = await api.get(`/posts/${postId}`);
  return response.data;
};

export const deletePost = async (postId) => {
  const response = await api.delete(`/posts/${postId}`);
  return response.data;
};

// ==================== COMMENTS ====================

export const generateComment = async (postId, tone = 'casual', length = 'medium', includeQuestion = false) => {
  const response = await api.post(`/comments/generate/${postId}`, null, {
    params: { tone, length, include_question: includeQuestion },
  });
  return response.data;
};

export const generateVariations = async (postId, count = 3, tone = 'casual') => {
  const response = await api.post(`/comments/generate-variations/${postId}`, null, {
    params: { count, tone },
  });
  return response.data;
};

export const getComments = async (status = null, postId = null, limit = 50) => {
  const params = { limit };
  if (status) params.status = status;
  if (postId) params.post_id = postId;
  const response = await api.get('/comments', { params });
  return response.data;
};

export const updateCommentStatus = async (commentId, status) => {
  const response = await api.put(`/comments/${commentId}/status`, null, {
    params: { status },
  });
  return response.data;
};

export const updateCommentContent = async (commentId, content) => {
  const response = await api.put(`/comments/${commentId}/content`, null, {
    params: { content },
  });
  return response.data;
};

export const scheduleComment = async (commentId, scheduledTime) => {
  const response = await api.put(`/comments/${commentId}/schedule`, null, {
    params: { scheduled_time: scheduledTime },
  });
  return response.data;
};

export const deleteComment = async (commentId) => {
  const response = await api.delete(`/comments/${commentId}`);
  return response.data;
};

export const validateComment = async (content) => {
  const response = await api.post('/comments/validate', null, {
    params: { content },
  });
  return response.data;
};

// ==================== ANALYTICS ====================

export const getAnalytics = async () => {
  const response = await api.get('/analytics');
  return response.data;
};

export const getActivityLogs = async (limit = 50) => {
  const response = await api.get('/activity-logs', { params: { limit } });
  return response.data;
};

export const exportAnalytics = () => {
  window.open(`${API_URL}/analytics/export`, '_blank');
};

// ==================== SETTINGS ====================

export const getSettings = async () => {
  const response = await api.get('/settings');
  return response.data;
};

export const updateSetting = async (key, value) => {
  const response = await api.put(`/settings/${key}`, null, {
    params: { value },
  });
  return response.data;
};

export const resetSettings = async () => {
  const response = await api.post('/settings/reset');
  return response.data;
};

// ==================== AUTOMATION ====================

export const simulatePostComment = async (commentId) => {
  const response = await api.post(`/automation/simulate-post/${commentId}`);
  return response.data;
};

export const getScheduledComments = async () => {
  const response = await api.get('/automation/scheduled');
  return response.data;
};

export const processScheduledComments = async () => {
  const response = await api.post('/automation/process-scheduled');
  return response.data;
};

// ==================== HEALTH ====================

export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};
