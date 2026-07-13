import { api } from "./client.js";

function qs(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null);
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries).toString();
}

export const clientsApi = {
  list: (params) => api.get(`/clients${qs(params)}`),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post("/clients", data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  remove: (id) => api.del(`/clients/${id}`),
  restore: (id) => api.post(`/clients/${id}/restore`),
};
