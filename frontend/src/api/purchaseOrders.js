import { api } from "./client.js";

function qs(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null);
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries).toString();
}

export const purchaseOrdersApi = {
  list: (params) => api.get(`/purchase-orders${qs(params)}`),
  get: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post("/purchase-orders", data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  remove: (id) => api.del(`/purchase-orders/${id}`),
  restore: (id) => api.post(`/purchase-orders/${id}/restore`),
};
