import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchPosts = async () => {
  const response = await api.post('/posts/fetch');
  return response.data;
};

export const getPosts = async () => {
  const response = await api.get('/posts');
  return response.data;
};

export const createPost = async (postData) => {
  const response = await api.post('/posts/create', postData);
  return response.data;
};

export const generateComment = async (postId, tone, length, includeQuestion) => {
  const response = await api.post(`/comments/generate/${postId}`, null, {
    params: { tone, length, include_question: includeQuestion },
  });
  return response.data;
};

export const getComments = async () => {
  const response = await api.get('/comments');
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

export const getAnalytics = async () => {
  const response = await api.get('/analytics');
  return response.data;
};
