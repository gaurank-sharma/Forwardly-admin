import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("fl_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !location.pathname.startsWith("/login")) {
      localStorage.removeItem("fl_token");
      location.href = "/login";
    }
    return Promise.reject(err);
  }
);

/** Direct link to a lead's live-generated PDF report (token in query for tab open). */
export const reportUrl = (id) =>
  `/api/leads/${id}/report.pdf?token=${localStorage.getItem("fl_token") || ""}`;

export default api;
