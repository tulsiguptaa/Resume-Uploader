import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
  withCredentials: true,
});

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
  const response = await api.get(
    `/resume/${resumeId}/sessions/`
  );

  return response.data;
};

export const getSessionQuestions = async (sessionId) => {
  const response = await api.get(
    `/session/${sessionId}/questions/`
  );

  return response.data;
};

export const saveInterviewAnswer = async (
  questionId,
  answer
) => {
  const response = await api.post(
    `/question/${questionId}/answer/`,
    {
      answer: answer,
    }
  );

  return response.data;
};

export default api;