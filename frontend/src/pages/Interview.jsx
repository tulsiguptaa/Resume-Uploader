import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  generateInterviewQuestions,
  getResumeSessions,
  getSessionQuestions,
    saveInterviewAnswer,
} from "../services/api";
import "./Interview.css";

const Interview = () => {
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get("resume_id");

  const [interviewType, setInterviewType] = useState("technical");
  const [numQuestions, setNumQuestions] = useState(5);

  const [questions, setQuestions] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [sessionId, setSessionId] = useState(null);

  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewFinished, setInterviewFinished] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [timeLeft, setTimeLeft] = useState(30 * 60);

  /* --------------------------------
     FETCH INTERVIEW HISTORY
  -------------------------------- */

  const fetchSessions = async () => {
    if (!resumeId) return;

    try {
      const data = await getResumeSessions(resumeId);
      setSessions(data || []);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [resumeId]);

  /* --------------------------------
     TIMER
  -------------------------------- */

  useEffect(() => {
    if (!interviewStarted || interviewFinished) return;

    if (timeLeft <= 0) {
      finishInterview();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [interviewStarted, interviewFinished, timeLeft]);

  /* --------------------------------
     FORMAT TIMER
  -------------------------------- */

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  };

  /* --------------------------------
     START INTERVIEW
  -------------------------------- */

  const startInterview = async () => {
    if (!resumeId) {
      setError("Resume ID is missing.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await generateInterviewQuestions(
        resumeId,
        interviewType,
        numQuestions
      );

      setQuestions(data.questions || []);
      setSessionId(data.session_id);

      setCurrentQuestion(0);
      setAnswers({});

      setInterviewStarted(true);
      setInterviewFinished(false);

      setTimeLeft(30 * 60);

      fetchSessions();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to generate interview questions."
      );
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------
     VIEW OLD SESSION
  -------------------------------- */

  const viewSession = async (id) => {
    try {
      setLoading(true);
      setError("");

      const data = await getSessionQuestions(id);

      setQuestions(data.questions || []);
      setSessionId(data.session_id);

      setInterviewType(data.interview_type);

      setCurrentQuestion(0);
      setAnswers({});

      setInterviewStarted(true);
      setInterviewFinished(false);

      setTimeLeft(30 * 60);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to load interview session."
      );
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------
     ANSWER HANDLING
  -------------------------------- */

  const handleAnswerChange = (value) => {
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion]: value,
    }));
  };

  const saveCurrentAnswer = async () => {
  const question = questions[currentQuestion];

  if (!question) return;

  const answer = answers[currentQuestion] || "";

  try {
    await saveInterviewAnswer(
      question.id,
      answer
    );
  } catch (err) {
    console.error(
      "Failed to save answer:",
      err
    );
  }
};
  /* --------------------------------
     NAVIGATION
  -------------------------------- */

 const goToQuestion = async (index) => {
  if (index < 0 || index >= questions.length) return;

  await saveCurrentAnswer();

  setCurrentQuestion(index);
};

  const nextQuestion = async () => {
  await saveCurrentAnswer();

  if (currentQuestion < questions.length - 1) {
    setCurrentQuestion((previous) => previous + 1);
  }
};

 const previousQuestion = async () => {
  await saveCurrentAnswer();

  if (currentQuestion > 0) {
    setCurrentQuestion((previous) => previous - 1);
  }
};

  /* --------------------------------
     FINISH INTERVIEW
  -------------------------------- */

 const finishInterview = async () => {
  await saveCurrentAnswer();

  setInterviewFinished(true);
};

  /* --------------------------------
     RESTART
  -------------------------------- */

  const startNewInterview = () => {
    setQuestions([]);
    setSessionId(null);

    setCurrentQuestion(0);
    setAnswers({});

    setInterviewStarted(false);
    setInterviewFinished(false);

    setTimeLeft(30 * 60);

    setError("");
  };

  /* --------------------------------
     STATISTICS
  -------------------------------- */

  const answeredCount = Object.values(answers).filter(
    (answer) => answer && answer.trim().length > 0
  ).length;

  const progress =
    questions.length > 0
      ? ((currentQuestion + 1) / questions.length) * 100
      : 0;

  /* --------------------------------
     FINISHED SCREEN
  -------------------------------- */

  if (interviewFinished) {
    return (
      <div className="interview-page">
        <div className="completion-card">
          <div className="completion-icon">✓</div>

          <h1>Interview Completed</h1>

          <p>You have completed your interview session.</p>

          <div className="completion-stats">
            <div className="completion-stat">
              <strong>{questions.length}</strong>
              <span>Total Questions</span>
            </div>

            <div className="completion-stat">
              <strong>{answeredCount}</strong>
              <span>Answered</span>
            </div>

            <div className="completion-stat">
              <strong>{questions.length - answeredCount}</strong>
              <span>Unanswered</span>
            </div>
          </div>

          <div className="completion-actions">
            <button className="primary-btn" onClick={startNewInterview}>
              Start New Interview
            </button>

            <button
              className="secondary-btn"
              onClick={() => {
                setInterviewStarted(false);
                setInterviewFinished(false);
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------
     ACTIVE INTERVIEW SCREEN
  -------------------------------- */

  if (interviewStarted && questions.length > 0) {
    const question = questions[currentQuestion];

    return (
      <div className="interview-page">
        <header className="interview-header">
          <div>
            <span className="brand-small">AI INTERVIEWER</span>

            <h1>
              {interviewType.charAt(0).toUpperCase() +
                interviewType.slice(1)}{" "}
              Interview
            </h1>
          </div>

          <div
            className={`timer ${
              timeLeft <= 300 ? "timer-warning" : ""
            }`}
          >
            <span>⏱</span>
            {formatTime()}
          </div>
        </header>

        <div className="progress-section">
          <div className="progress-info">
            <span>
              Question {currentQuestion + 1} of {questions.length}
            </span>

            <span>{Math.round(progress)}%</span>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="interview-layout">
          <aside className="question-sidebar">
            <div className="sidebar-title">
              <h3>Questions</h3>

              <span>
                {answeredCount}/{questions.length}
              </span>
            </div>

            <div className="question-list">
              {questions.map((item, index) => {
                const answered =
                  answers[index] && answers[index].trim().length > 0;

                return (
                  <button
                    key={index}
                    className={`question-number ${
                      currentQuestion === index ? "active" : ""
                    } ${answered ? "answered" : ""}`}
                    onClick={() => goToQuestion(index)}
                  >
                    <span>{index + 1}</span>
                    {answered && <small>✓</small>}
                  </button>
                );
              })}
            </div>

            <div className="sidebar-legend">
              <div>
                <span className="legend-dot current"></span>
                Current
              </div>

              <div>
                <span className="legend-dot completed"></span>
                Answered
              </div>

              <div>
                <span className="legend-dot pending"></span>
                Unanswered
              </div>
            </div>
          </aside>

          <main className="question-area">
            <div className="question-meta">
              <span className="category-badge">
                {question.category}
              </span>

              <span
                className={`difficulty-badge ${question.difficulty}`}
              >
                {question.difficulty}
              </span>
            </div>

            <div className="question-card">
              <div className="question-number-large">
                {String(currentQuestion + 1).padStart(2, "0")}
              </div>

              <h2>{question.question}</h2>

              <p className="answer-label">Your Answer</p>

              <textarea
                className="answer-editor"
                placeholder="Type your answer here..."
                value={answers[currentQuestion] || ""}
                onChange={(e) => handleAnswerChange(e.target.value)}
              />

              <div className="answer-footer">
                <span>
                  {(answers[currentQuestion] || "").length} characters
                </span>

                <span>
                  {answers[currentQuestion]
                    ? "Answer saved locally"
                    : "Not answered yet"}
                </span>
              </div>
            </div>

            <div className="question-navigation">
              <button
                className="secondary-btn"
                disabled={currentQuestion === 0}
                onClick={previousQuestion}
              >
                ← Previous
              </button>

              {currentQuestion === questions.length - 1 ? (
                <button
                  className="finish-btn"
                  onClick={finishInterview}
                >
                  Finish Interview ✓
                </button>
              ) : (
                <button
                  className="primary-btn"
                  onClick={nextQuestion}
                >
                  Next Question →
                </button>
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  /* --------------------------------
     SETUP SCREEN
  -------------------------------- */

  return (
    <div className="interview-page">
      <div className="setup-container">
        <div className="setup-header">
          <span className="brand-small">AI INTERVIEWER</span>

          <h1>Prepare for your interview.</h1>

          <p>
            Choose your interview style and let AI generate
            questions based on your resume.
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <section className="setup-section">
          <h2>Choose Interview Type</h2>

          <div className="interview-types">
            <button
              className={`type-card ${
                interviewType === "technical" ? "selected" : ""
              }`}
              onClick={() => setInterviewType("technical")}
            >
              <div className="type-icon">⌘</div>
              <h3>Technical</h3>
              <p>
                Test your technical knowledge, projects and
                development skills.
              </p>
            </button>

            <button
              className={`type-card ${
                interviewType === "hr" ? "selected" : ""
              }`}
              onClick={() => setInterviewType("hr")}
            >
              <div className="type-icon">◎</div>
              <h3>HR</h3>
              <p>
                Practice behavioral, career and personality-based
                questions.
              </p>
            </button>

            <button
              className={`type-card ${
                interviewType === "mock" ? "selected" : ""
              }`}
              onClick={() => setInterviewType("mock")}
            >
              <div className="type-icon">◆</div>
              <h3>Mock Interview</h3>
              <p>
                Experience a realistic combination of technical
                and HR questions.
              </p>
            </button>
          </div>
        </section>

        <section className="setup-section">
          <h2>Number of Questions</h2>

          <div className="question-count-options">
            {[5, 10, 15, 20].map((count) => (
              <button
                key={count}
                className={
                  numQuestions === count
                    ? "count-option selected"
                    : "count-option"
                }
                onClick={() => setNumQuestions(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </section>

        <button
          className="start-btn"
          onClick={startInterview}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Generating Interview...
            </>
          ) : (
            <>Start Interview →</>
          )}
        </button>

        {sessions.length > 0 && (
          <section className="history-section">
            <div className="history-heading">
              <div>
                <h2>Previous Interviews</h2>
                <p>Review your previous interview sessions.</p>
              </div>
            </div>

            <div className="history-list">
              {sessions.map((session) => (
                <div className="history-item" key={session.id}>
                  <div className="history-info">
                    <div className="history-type">
                      {session.interview_type}
                    </div>

                    <h4>
                      {session.interview_type.charAt(0).toUpperCase() +
                        session.interview_type.slice(1)}{" "}
                      Interview
                    </h4>

                    <p>
                      {session.num_questions} questions
                      {" • "}
                      {new Date(session.created_at).toLocaleString()}
                    </p>
                  </div>

                  <button
                    className="history-view-btn"
                    onClick={() => viewSession(session.id)}
                  >
                    View →
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Interview;