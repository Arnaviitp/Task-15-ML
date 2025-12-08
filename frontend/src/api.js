import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  const response = await api.get('/automation/status'); // Using automation status as "current analytics"
  return response.data;
};

export const getAnalyticsHistory = async (days = 7) => {
  const response = await api.get('/analytics/history', { params: { days } });
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

export const getAutomationStatus = async () => {
  const response = await api.get('/automation/status');
  return response.data;
};

// ==================== BATCH OPERATIONS ====================

export const batchApproveAll = async () => {
  const response = await api.post('/batch/approve-all');
  return response.data;
};

export const batchRejectAll = async () => {
  const response = await api.post('/batch/reject-all');
  return response.data;
};

export const batchGenerateAll = async (tone = 'casual', length = 'medium', limit = 10) => {
  const response = await api.post('/batch/generate-all', null, {
    params: { tone, length, limit }
  });
  return response.data;
};

export const batchPostApproved = async () => {
  const response = await api.post('/batch/post-approved');
  return response.data;
};

// ==================== ACCOUNTS ====================

export const getConnectedAccounts = async () => {
  const response = await api.get('/accounts');
  return response.data;
};

export const connectAccount = async (platform, username, accessToken = null) => {
  const payload = { platform, username };
  if (accessToken) payload.access_token = accessToken;
  const response = await api.post('/accounts/connect', payload);
  return response.data;
};

export const disconnectAccount = async (accountId) => {
  const response = await api.delete(`/accounts/${accountId}`);
  return response.data;
};

// ==================== OAUTH ====================

export const getOAuthStatus = async () => {
  const response = await api.get('/oauth/status');
  return response.data;
};

export const initiateOAuth = async (platform) => {
  const response = await api.get(`/oauth/${platform}/authorize`);
  return response.data;
};

export const refreshOAuthToken = async (platform, accountId) => {
  const response = await api.post(`/oauth/${platform}/refresh`, null, {
    params: { account_id: accountId }
  });
  return response.data;
};

// ==================== AI FEATURES ====================

export const predictEngagement = async (comment, postContent, platform = 'default') => {
  const response = await api.post('/ai/predict-engagement', null, {
    params: { comment, post_content: postContent, platform }
  });
  return response.data;
};

export const suggestEmojis = async (content, platform = 'default', count = 5) => {
  const response = await api.post('/ai/suggest-emojis', null, {
    params: { content, platform, count }
  });
  return response.data;
};

export const generateHashtags = async (content, platform = 'default', count = 5) => {
  const response = await api.post('/ai/generate-hashtags', null, {
    params: { content, platform, count }
  });
  return response.data;
};

export const getOptimalPostingTimes = async (platform = 'default') => {
  const response = await api.get(`/ai/optimal-posting-times/${platform}`);
  return response.data;
};

export const enhanceComment = async (comment, platform = 'default', addEmojis = true, addHashtags = false, engagementBoost = true) => {
  const response = await api.post('/ai/enhance-comment', null, {
    params: {
      comment,
      platform,
      add_emojis: addEmojis,
      add_hashtags: addHashtags,
      engagement_boost: engagementBoost
    }
  });
  return response.data;
};

// ==================== PERSONAS ====================

export const getPersonas = async () => {
  const response = await api.get('/personas');
  return response.data;
};

export const createPersona = async (personaData) => {
  const response = await api.post('/personas', personaData);
  return response.data;
};

export const updatePersona = async (personaId, personaData) => {
  const response = await api.put(`/personas/${personaId}`, personaData);
  return response.data;
};

export const deletePersona = async (personaId) => {
  const response = await api.delete(`/personas/${personaId}`);
  return response.data;
};

export const setDefaultPersona = async (personaId) => {
  const response = await api.post(`/personas/${personaId}/set-default`);
  return response.data;
};

export const generateCommentWithPersona = async (postId, personaId, length = 'medium', includeQuestion = false) => {
  const response = await api.post(`/comments/generate-with-persona/${postId}`, null, {
    params: { persona_id: personaId, length, include_question: includeQuestion }
  });
  return response.data;
};

// ==================== TEMPLATES ====================

export const getTemplates = async () => {
  const response = await api.get('/templates');
  return response.data;
};

export const saveTemplate = async (templateData) => {
  const response = await api.post('/templates', templateData);
  return response.data;
};

export const deleteTemplate = async (templateId) => {
  const response = await api.delete(`/templates/${templateId}`);
  return response.data;
};

// ==================== ADVANCED ANALYTICS ====================

export const getSentimentTrends = async (days = 7) => {
  const response = await api.get('/analytics/sentiment-trends', { params: { days } });
  return response.data;
};

export const getToneDistribution = async () => {
  const response = await api.get('/analytics/tone-distribution');
  return response.data;
};

export const getPlatformPerformance = async () => {
  const response = await api.get('/analytics/platform-performance');
  return response.data;
};

// ==================== HEALTH ====================

export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};
