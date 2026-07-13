import { api } from "./client.js";

function qs(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null);
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries).toString();
}

export const reportsApi = {
  summary: (params) => api.get(`/reports/summary${qs(params)}`),
  client: (id, params) => api.get(`/reports/client/${id}${qs(params)}`),
};
