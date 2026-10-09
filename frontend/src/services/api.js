import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
  withCredentials: true,
});

export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/resume/upload/", formData);
  return response.data;
};

export const getResumes = async () => {
  const response = await api.get("/resume/list/");
  return response.data;
};

export const getResume = async (resumeId) => {
  const response = await api.get(`/resume/${resumeId}/`);
  return response.data;
};

export const deleteResume = async (resumeId) => {
  const response = await api.delete(`/resume/delete/${resumeId}/`);
  return response.data;
};

export const generateInterviewQuestions = async (
  resumeId,
  interviewType,
  numQuestions
) => {
  const response = await api.post(
    `/resume/${resumeId}/generate-questions/`,
    {
      interview_type: interviewType,
      num_questions: numQuestions,
    }
  );

  return response.data;
};

export const getResumeSessions = async (resumeId) => {
  const response = await api.get(`/resume/${resumeId}/sessions/`);
  return response.data;
};

export const getSessionQuestions = async (sessionId) => {
  const response = await api.get(`/session/${sessionId}/questions/`);
  return response.data;
};

export const saveInterviewAnswer = async (questionId, answer) => {
  const response = await api.post(`/question/${questionId}/answer/`, {
    answer,
  });

  return response.data;
};

export const evaluateInterviewAnswer = async (questionId, answer) => {
  const response = await api.post(`/question/${questionId}/evaluate/`, {
    answer,
  });

  return response.data;
};

export const getInterviewReport = async (sessionId) => {
  const response = await api.get(`/session/${sessionId}/report/`);
  return response.data;
};

export const getMediaUrl = (fileUrl) => {
  if (!fileUrl) return "";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;

  const apiUrl = new URL(api.defaults.baseURL, window.location.origin);
  return new URL(fileUrl, apiUrl.origin).toString();
};

export default api;
