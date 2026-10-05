import React, { useEffect, useState } from "react";
import "./Interview.css";

import {
  generateInterviewQuestions,
  getResumeSessions,
  getSessionQuestions,
} from "../services/api";

function Interview() {
  const [interviewType, setInterviewType] = useState("technical");
  const [numQuestions, setNumQuestions] = useState(5);

  const [questions, setQuestions] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);

  // ✅ Declared (was missing — viewSession was calling setAnswers)
  const [answers, setAnswers] = useState({});

  const params = new URLSearchParams(window.location.search);
  const resumeId = params.get("resume_id");

  useEffect(() => {
    if (resumeId) {
      fetchSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  const fetchSessions = async () => {
    try {
      setHistoryLoading(true);
      const data = await getResumeSessions(resumeId);
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const viewSession = async (sessionId) => {
    try {
      setLoading(true);
      setError("");

      const data = await getSessionQuestions(sessionId);

      setQuestions(data.questions || []);
      setSessionId(data.session_id);
      setInterviewType(data.interview_type);
      setCurrentQuestion(0);
      setAnswers({});
      setInterviewStarted(true);
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to load interview session."
      );
    } finally {
      setLoading(false);
    }
  };

  const startInterview = async () => {
    if (!resumeId) {
      setError("Resume ID is missing.");
      return;
    }

    setLoading(true);
    setError("");
    setQuestions([]);
    setCurrentQuestion(0);
    setInterviewCompleted(false);

    try {
      const data = await generateInterviewQuestions(
        resumeId,
        interviewType,
        numQuestions
      );

      setQuestions(data.questions || []);
      setSessionId(data.session_id);
      setInterviewStarted(true);

      fetchSessions();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to generate questions"
      );
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setInterviewCompleted(true);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const resetInterview = () => {
    setInterviewStarted(false);
    setInterviewCompleted(false);
    setQuestions([]);
    setSessionId(null);
    setCurrentQuestion(0);
    setError("");
  };

  // --------------------------------------------------
  // Question screen
  // --------------------------------------------------

  if (interviewStarted && questions.length > 0) {
    const question = questions[currentQuestion];

    return (
      <div className="interview-page">
        <div className="interview-header">
          <div>
            <span className="page-label">INTERVIEW SESSION</span>

            <h1>
              {interviewType === "technical"
                ? "Technical Interview"
                : interviewType === "hr"
                ? "HR Interview"
                : "Mock Interview"}
            </h1>

            <p>
              Session #{sessionId} · Question {currentQuestion + 1} of{" "}
              {questions.length}
            </p>
          </div>

          <button className="exit-btn" onClick={resetInterview}>
            Exit
          </button>
        </div>

        <div className="progress-container">
          <div
            className="progress-bar"
            style={{
              width: `${
                ((currentQuestion + 1) / questions.length) * 100
              }%`,
            }}
          />
        </div>

        {!interviewCompleted ? (
          <div className="question-layout">
            <div className="question-card">
              <div className="question-top">
                <span className="question-number">
                  Question {currentQuestion + 1}
                </span>

                <span className={`difficulty ${question.difficulty}`}>
                  {question.difficulty}
                </span>
              </div>

              <h2>{question.question}</h2>

              <div className="category">{question.category}</div>

              <div className="answer-area">
                <textarea
                  placeholder="Type your answer here..."
                  rows="7"
                  value={answers[currentQuestion] || ""}
                  onChange={(e) =>
                    setAnswers({
                      ...answers,
                      [currentQuestion]: e.target.value,
                    })
                  }
                />
              </div>

              <div className="question-actions">
                <button
                  className="secondary-btn"
                  onClick={previousQuestion}
                  disabled={currentQuestion === 0}
                >
                  ← Previous
                </button>

                <button className="primary-btn" onClick={nextQuestion}>
                  {currentQuestion === questions.length - 1
                    ? "Finish Interview"
                    : "Next Question →"}
                </button>
              </div>
            </div>

            <div className="question-sidebar">
              <h3>Interview Progress</h3>

              <div className="question-list">
                {questions.map((item, index) => (
                  <button
                    key={index}
                    className={
                      index === currentQuestion
                        ? "question-dot active"
                        : "question-dot"
                    }
                    onClick={() => setCurrentQuestion(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <div className="session-info">
                <span>Interview Type</span>
                <strong>{interviewType}</strong>

                <span>Questions</span>
                <strong>{questions.length}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="completion-card">
            <div className="completion-icon">✓</div>

            <h2>Interview Completed</h2>

            <p>
              You completed all {questions.length} questions in this
              interview session.
            </p>

            <div className="completion-stats">
              <div>
                <strong>{questions.length}</strong>
                <span>Questions</span>
              </div>

              <div>
                <strong>{interviewType}</strong>
                <span>Interview Type</span>
              </div>

              <div>
                <strong>#{sessionId}</strong>
                <span>Session</span>
              </div>
            </div>

            <button className="primary-btn" onClick={resetInterview}>
              Start New Interview
            </button>
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------
  // Interview setup screen
  // --------------------------------------------------

  return (
    <div className="interview-page">
      <div className="interview-header">
        <div>
          <span className="page-label">AI INTERVIEWER</span>

          <h1>Prepare for your interview.</h1>

          <p>
            Practice with questions generated specifically from your
            resume.
          </p>
        </div>
      </div>

      <div className="setup-grid">
        <div className="setup-card">
          <div className="setup-heading">
            <span className="step-number">01</span>

            <div>
              <h2>Choose Interview Type</h2>
              <p>Select the type of interview you want to practice.</p>
            </div>
          </div>

          <div className="interview-types">
            <button
              className={
                interviewType === "technical"
                  ? "type-card selected"
                  : "type-card"
              }
              onClick={() => setInterviewType("technical")}
            >
              <div className="type-icon">⌘</div>

              <div>
                <h3>Technical</h3>
                <p>
                  Questions based on your skills, technologies,
                  projects and experience.
                </p>
              </div>

              <span className="selection-indicator">
                {interviewType === "technical" ? "✓" : ""}
              </span>
            </button>

            <button
              className={
                interviewType === "hr" ? "type-card selected" : "type-card"
              }
              onClick={() => setInterviewType("hr")}
            >
              <div className="type-icon">◎</div>

              <div>
                <h3>HR</h3>
                <p>
                  Practice behavioral, background, motivation and
                  career questions.
                </p>
              </div>

              <span className="selection-indicator">
                {interviewType === "hr" ? "✓" : ""}
              </span>
            </button>

            <button
              className={
                interviewType === "mock"
                  ? "type-card selected"
                  : "type-card"
              }
              onClick={() => setInterviewType("mock")}
            >
              <div className="type-icon">✦</div>

              <div>
                <h3>Mock Interview</h3>
                <p>
                  A realistic mixture of technical and HR
                  interview questions.
                </p>
              </div>

              <span className="selection-indicator">
                {interviewType === "mock" ? "✓" : ""}
              </span>
            </button>
          </div>

          <div className="setup-heading second">
            <span className="step-number">02</span>

            <div>
              <h2>Number of Questions</h2>
              <p>Choose how long you want your interview to be.</p>
            </div>
          </div>

          <div className="question-options">
            {[5, 10, 15, 20].map((number) => (
              <button
                key={number}
                className={
                  numQuestions === number
                    ? "count-option selected"
                    : "count-option"
                }
                onClick={() => setNumQuestions(number)}
              >
                {number}
              </button>
            ))}
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            className="start-btn"
            onClick={startInterview}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Generating Questions...
              </>
            ) : (
              <>
                Start Interview
                <span>→</span>
              </>
            )}
          </button>
        </div>

        <div className="history-card">
          <div className="history-header">
            <div>
              <span className="page-label">HISTORY</span>
              <h2>Previous Interviews</h2>
            </div>
          </div>

          {historyLoading ? (
            <div className="history-empty">
              <div className="empty-icon">◌</div>
              <p>Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="history-empty">
              <div className="empty-icon">◌</div>

              <h3>No interviews yet</h3>

              <p>
                Your previous interview sessions will appear here.
              </p>
            </div>
          ) : (
            <div className="session-list">
              {sessions.map((session) => (
                <div className="session-item" key={session.id}>
                  <div className="session-icon">
                    {session.interview_type === "technical"
                      ? "⌘"
                      : session.interview_type === "hr"
                      ? "◎"
                      : "✦"}
                  </div>

                  <div className="session-details">
                    <h3>
                      {session.interview_type === "technical"
                        ? "Technical Interview"
                        : session.interview_type === "hr"
                        ? "HR Interview"
                        : "Mock Interview"}
                    </h3>

                    <p>
                      {session.num_questions} questions ·{" "}
                      {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    className="history-view-btn"
                    onClick={() => viewSession(session.id)}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Interview;