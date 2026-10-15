import axios from 'axios';

const getBaseUrl = () => {
  const host = import.meta.env.VITE_API_URL || '/api';
  return `${host.replace(/\/+$/, '')}/v1/sprints`;
};

const getAuthHeaders = () => {
  let token = localStorage.getItem('token') || '';
  token = token.replace(/^"(.*)"$/, '$1').trim();
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
};

export const getSprints = async (params = {}) => {
  const response = await axios.get(getBaseUrl(), {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};

export const getSprintById = async (id) => {
  const response = await axios.get(`${getBaseUrl()}/${id}`, getAuthHeaders());
  return response.data;
};

export const createSprint = async (sprintData) => {
  const response = await axios.post(getBaseUrl(), sprintData, getAuthHeaders());
  return response.data;
};

export const updateSprint = async (id, sprintData) => {
  const response = await axios.put(`${getBaseUrl()}/${id}`, sprintData, getAuthHeaders());
  return response.data;
};

export const deleteSprint = async (id) => {
  const response = await axios.delete(`${getBaseUrl()}/${id}`, getAuthHeaders());
  return response.data;
};

export const addTaskToSprint = async (sprintId, taskData) => {
  const response = await axios.post(`${getBaseUrl()}/${sprintId}/tasks`, taskData, getAuthHeaders());
  return response.data;
};

export const updateTaskSprintStatus = async (sprintId, taskId, statusData) => {
  const response = await axios.patch(
    `${getBaseUrl()}/${sprintId}/tasks/${taskId}/status`,
    statusData,
    getAuthHeaders()
  );
  return response.data;
};
