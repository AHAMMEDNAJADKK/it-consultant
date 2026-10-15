import axios from 'axios';

const getBaseUrl = () => {
  const host = import.meta.env.VITE_API_URL || '/api';
  return `${host.replace(/\/+$/, '')}/v1/git`;
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

export const getGitIntegrations = async (params = {}) => {
  const response = await axios.get(`${getBaseUrl()}/integrations`, {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};

export const createGitIntegration = async (integrationData) => {
  const response = await axios.post(`${getBaseUrl()}/integrations`, integrationData, getAuthHeaders());
  return response.data;
};

export const updateGitIntegration = async (id, data) => {
  const response = await axios.put(`${getBaseUrl()}/integrations/${id}`, data, getAuthHeaders());
  return response.data;
};

export const deleteGitIntegration = async (id) => {
  const response = await axios.delete(`${getBaseUrl()}/integrations/${id}`, getAuthHeaders());
  return response.data;
};

export const getGitEvents = async (params = {}) => {
  const response = await axios.get(`${getBaseUrl()}/events`, {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};

export const simulateGitEvent = async (integrationId, payload) => {
  const response = await axios.post(
    `${getBaseUrl()}/integrations/${integrationId}/test-event`,
    payload,
    getAuthHeaders()
  );
  return response.data;
};
