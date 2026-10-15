import axios from 'axios';

const getBaseUrl = () => {
  const host = import.meta.env.VITE_API_URL || '/api';
  return `${host.replace(/\/+$/, '')}/v1/support-tickets`;
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

export const getSupportTickets = async (params = {}) => {
  const response = await axios.get(getBaseUrl(), {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};

export const getSupportTicketStats = async () => {
  const response = await axios.get(`${getBaseUrl()}/stats`, getAuthHeaders());
  return response.data;
};

export const getSupportTicketById = async (id) => {
  const response = await axios.get(`${getBaseUrl()}/${id}`, getAuthHeaders());
  return response.data;
};

export const createSupportTicket = async (ticketData) => {
  const response = await axios.post(getBaseUrl(), ticketData, getAuthHeaders());
  return response.data;
};

export const updateSupportTicket = async (id, ticketData) => {
  const response = await axios.put(`${getBaseUrl()}/${id}`, ticketData, getAuthHeaders());
  return response.data;
};

export const addTicketComment = async (id, commentData) => {
  const response = await axios.post(`${getBaseUrl()}/${id}/comments`, commentData, getAuthHeaders());
  return response.data;
};

export const deleteSupportTicket = async (id) => {
  const response = await axios.delete(`${getBaseUrl()}/${id}`, getAuthHeaders());
  return response.data;
};
