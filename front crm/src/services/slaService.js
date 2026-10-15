import axios from 'axios';

const getBaseUrl = () => {
  const host = import.meta.env.VITE_API_URL || '/api';
  return `${host.replace(/\/+$/, '')}/v1/sla-contracts`;
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

export const getSLAContracts = async (params = {}) => {
  const response = await axios.get(getBaseUrl(), {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};

export const getSLAMetrics = async () => {
  const response = await axios.get(`${getBaseUrl()}/metrics`, getAuthHeaders());
  return response.data;
};

export const getSLAContractById = async (id) => {
  const response = await axios.get(`${getBaseUrl()}/${id}`, getAuthHeaders());
  return response.data;
};

export const createSLAContract = async (contractData) => {
  const response = await axios.post(getBaseUrl(), contractData, getAuthHeaders());
  return response.data;
};

export const updateSLAContract = async (id, contractData) => {
  const response = await axios.put(`${getBaseUrl()}/${id}`, contractData, getAuthHeaders());
  return response.data;
};

export const renewSLAContract = async (id, renewData) => {
  const response = await axios.post(`${getBaseUrl()}/${id}/renew`, renewData, getAuthHeaders());
  return response.data;
};

export const deleteSLAContract = async (id) => {
  const response = await axios.delete(`${getBaseUrl()}/${id}`, getAuthHeaders());
  return response.data;
};
