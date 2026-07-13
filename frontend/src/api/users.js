import { api } from "./client.js";

export const usersApi = {
  list: (params) => api.get(`/users${params ? "?" + new URLSearchParams(params).toString() : ""}`),
  create: (data) => api.post("/users", data),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.del(`/users/${id}`),
};
