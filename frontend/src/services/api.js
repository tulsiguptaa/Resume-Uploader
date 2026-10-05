import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/resume",
  withCredentials: true,
});

export const generateInterviewQuestions = async (
  resumeId,
  interviewType,
  numQuestions
) => {
  const response = await api.post(
    `/${resumeId}/generate-questions/`,
    {
      interview_type: interviewType,
      num_questions: numQuestions,
    }
  );

  return response.data;
};

export const getResumeSessions = async (resumeId) => {
  const response = await api.get(
    `/${resumeId}/sessions/`
  );

  return response.data;
};

export const getSessionQuestions = async (sessionId) => {
  const response = await api.get(
    `/session/${sessionId}/questions/`
  );

  return response.data;
};

export default api;