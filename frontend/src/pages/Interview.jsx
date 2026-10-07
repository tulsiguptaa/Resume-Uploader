import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  generateInterviewQuestions,
  getResumeSessions,
  getSessionQuestions,
  saveInterviewAnswer,
  evaluateInterviewAnswer,
  getInterviewReport,
} from "../services/api";

import "./Interview.css";

const Interview = () => {
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get("resume_id");

  // --------------------------------
  // INTERVIEW STATE
  // --------------------------------

  const [interviewType, setInterviewType] = useState("technical");
  const [numQuestions, setNumQuestions] = useState(5);

  const [questions, setQuestions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewFinished, setInterviewFinished] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [answers, setAnswers] = useState({});

  // --------------------------------
  // EVALUATION
  // --------------------------------

  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  // --------------------------------
  // REPORT
  // --------------------------------

  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // --------------------------------
  // GENERAL
  // --------------------------------

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [timeLeft, setTimeLeft] = useState(30 * 60);

  // --------------------------------
  // FETCH INTERVIEW HISTORY
  // --------------------------------

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

  // --------------------------------
  // TIMER
  // --------------------------------

  useEffect(() => {
    if (!interviewStarted || interviewFinished) {
      return;
    }

    if (timeLeft <= 0) {
      finishInterview();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [interviewStarted, interviewFinished, timeLeft]);

  // --------------------------------
  // FORMAT TIMER
  // --------------------------------

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  };

  // --------------------------------
  // START INTERVIEW
  // --------------------------------

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

      setEvaluation(null);
      setReport(null);

      setInterviewStarted(true);
      setInterviewFinished(false);

      setTimeLeft(30 * 60);

      await fetchSessions();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to generate interview questions."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------
  // VIEW OLD SESSION
  // --------------------------------

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

      setEvaluation(null);
      setReport(null);

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

  // --------------------------------
  // ANSWER HANDLING
  // --------------------------------

  const handleAnswerChange = (value) => {
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion]: value,
    }));
  };

  // --------------------------------
  // SAVE CURRENT ANSWER
  // --------------------------------

  const saveCurrentAnswer = async () => {
    const question = questions[currentQuestion];

    if (!question) return;

    const answer = answers[currentQuestion] || "";

    try {
      await saveInterviewAnswer(question.id, answer);
    } catch (err) {
      console.error(
        "Failed to save answer:",
        err
      );
    }
  };

  // --------------------------------
  // EVALUATE CURRENT ANSWER
  // --------------------------------

  const evaluateCurrentAnswer = async () => {
    const question = questions[currentQuestion];

    if (!question) return false;

    const answer = answers[currentQuestion] || "";

    if (!answer.trim()) {
      alert(
        "Please answer the question before continuing."
      );

      return false;
    }

    try {
      setEvaluating(true);
      setError("");

      // Save answer first
      await saveInterviewAnswer(
        question.id,
        answer
      );

      // AI evaluation
      const result =
        await evaluateInterviewAnswer(
          question.id,
          answer
        );

      setEvaluation(
        result.evaluation || null
      );

      return true;
    } catch (err) {
      console.error(
        "Evaluation failed:",
        err
      );

      setError(
        err.response?.data?.error ||
          "Failed to evaluate answer."
      );

      return false;
    } finally {
      setEvaluating(false);
    }
  };

  // --------------------------------
  // GO TO QUESTION
  // --------------------------------

  const goToQuestion = async (index) => {
    if (
      index < 0 ||
      index >= questions.length ||
      index === currentQuestion
    ) {
      return;
    }

    await saveCurrentAnswer();

    setEvaluation(null);

    setCurrentQuestion(index);
  };

  // --------------------------------
  // NEXT QUESTION
  // --------------------------------

  const nextQuestion = async () => {
    const evaluated =
      await evaluateCurrentAnswer();

    if (!evaluated) return;

    // Stay on current question so
    // candidate can see evaluation.
  };

  // --------------------------------
  // MOVE TO NEXT AFTER EVALUATION
  // --------------------------------

  const moveToNextQuestion = () => {
    if (
      currentQuestion <
      questions.length - 1
    ) {
      setEvaluation(null);

      setCurrentQuestion(
        (previous) => previous + 1
      );
    }
  };

  // --------------------------------
  // PREVIOUS QUESTION
  // --------------------------------

  const previousQuestion = async () => {
    await saveCurrentAnswer();

    setEvaluation(null);

    if (currentQuestion > 0) {
      setCurrentQuestion(
        (previous) => previous - 1
      );
    }
  };

  // --------------------------------
  // FINISH INTERVIEW
  // --------------------------------

  const finishInterview = async () => {
    const question =
      questions[currentQuestion];

    const answer =
      answers[currentQuestion] || "";

    /*
     * Evaluate the current question
     * if it has an answer and hasn't
     * already been evaluated.
     */
    if (
      question &&
      answer.trim() &&
      !evaluation
    ) {
      try {
        setEvaluating(true);

        await saveInterviewAnswer(
          question.id,
          answer
        );

        await evaluateInterviewAnswer(
          question.id,
          answer
        );
      } catch (err) {
        console.error(
          "Final answer evaluation failed:",
          err
        );
      } finally {
        setEvaluating(false);
      }
    }

    if (!sessionId) {
      setInterviewFinished(true);
      return;
    }

    try {
      setLoadingReport(true);
      setError("");

      /*
       * Small delay ensures the evaluation
       * request has completed before asking
       * for the report.
       */
      const data =
        await getInterviewReport(
          sessionId
        );

      setReport(data);
      setInterviewFinished(true);
      setInterviewStarted(false);
    } catch (err) {
      console.error(
        "Failed to load interview report:",
        err
      );

      setError(
        err.response?.data?.error ||
          "Failed to generate interview report."
      );
    } finally {
      setLoadingReport(false);
    }
  };

  // --------------------------------
  // RESTART
  // --------------------------------

  const startNewInterview = () => {
    setQuestions([]);
    setSessionId(null);

    setCurrentQuestion(0);
    setAnswers({});

    setEvaluation(null);
    setReport(null);

    setInterviewStarted(false);
    setInterviewFinished(false);

    setTimeLeft(30 * 60);

    setError("");
  };

  // --------------------------------
  // STATISTICS
  // --------------------------------

  const answeredCount =
    Object.values(answers).filter(
      (answer) =>
        answer &&
        answer.trim().length > 0
    ).length;

  const progress =
    questions.length > 0
      ? ((currentQuestion + 1) /
          questions.length) *
        100
      : 0;

  // ================================================
  // FINAL REPORT SCREEN
  // ================================================

  if (interviewFinished) {
    return (
      <div className="interview-page">

        {loadingReport ? (
          <div className="completion-card">

            <div className="spinner"></div>

            <h1>
              Generating Your Report
            </h1>

            <p>
              AI is analyzing your interview
              performance...
            </p>

          </div>
        ) : report ? (
          <div className="report-page">

            <div className="report-header">

              <span className="brand-small">
                AI INTERVIEWER
              </span>

              <h1>
                Interview Report
              </h1>

              <p>
                Here's how you performed in your{" "}
                {report.interview_type} interview.
              </p>

            </div>

            {/* SCORE CARDS */}

            <div className="report-stats">

              <div className="report-stat">
                <span>
                  Average Score
                </span>

                <strong>
                  {report.average_score}/10
                </strong>
              </div>

              <div className="report-stat">
                <span>
                  Total Score
                </span>

                <strong>
                  {report.total_score}
                </strong>
              </div>

              <div className="report-stat">
                <span>
                  Questions
                </span>

                <strong>
                  {report.evaluated_questions}/
                  {report.total_questions}
                </strong>
              </div>

            </div>

            {/* STRENGTHS / IMPROVEMENTS */}

            <div className="report-grid">

              <div className="report-card">

                <h2>
                  Your Strengths
                </h2>

                {report.strengths &&
                report.strengths.length > 0 ? (
                  <ul>
                    {report.strengths.map(
                      (item, index) => (
                        <li key={index}>
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p>
                    No strengths recorded.
                  </p>
                )}

              </div>

              <div className="report-card">

                <h2>
                  Areas to Improve
                </h2>

                {report.improvements &&
                report.improvements.length > 0 ? (
                  <ul>
                    {report.improvements.map(
                      (item, index) => (
                        <li key={index}>
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p>
                    No major improvements
                    recorded.
                  </p>
                )}

              </div>

            </div>

            {/* QUESTION RESULTS */}

            <div className="question-results">

              <h2>
                Question-wise Performance
              </h2>

              {report.questions?.map(
                (item, index) => (
                  <div
                    className="result-question"
                    key={item.question_id}
                  >

                    <div className="result-question-header">

                      <span>
                        Question {index + 1}
                      </span>

                      <strong>
                        {item.score !== null &&
                        item.score !== undefined
                          ? `${item.score}/10`
                          : "Not evaluated"}
                      </strong>

                    </div>

                    <h3>
                      {item.question}
                    </h3>

                    <p>
                      {item.feedback ||
                        "No feedback available."}
                    </p>

                  </div>
                )
              )}

            </div>

            {/* ACTIONS */}

            <div className="completion-actions">

              <button
                className="primary-btn"
                onClick={startNewInterview}
              >
                Start New Interview
              </button>

              <button
                className="secondary-btn"
                onClick={() => {
                  setInterviewFinished(false);
                  setInterviewStarted(false);
                  setReport(null);
                  fetchSessions();
                }}
              >
                Back to Interviews
              </button>

            </div>

          </div>
        ) : (
          <div className="completion-card">

            <h1>
              Unable to Generate Report
            </h1>

            <p>
              {error ||
                "Something went wrong while generating your report."}
            </p>

            <button
              className="primary-btn"
              onClick={() => {
                setInterviewFinished(false);
                setInterviewStarted(true);
              }}
            >
              Back to Interview
            </button>

          </div>
        )}

      </div>
    );
  }

  // ================================================
  // ACTIVE INTERVIEW SCREEN
  // ================================================

  if (
    interviewStarted &&
    questions.length > 0
  ) {
    const question =
      questions[currentQuestion];

    return (
      <div className="interview-page">

        {/* HEADER */}

        <header className="interview-header">

          <div>

            <span className="brand-small">
              AI INTERVIEWER
            </span>

            <h1>
              {interviewType
                .charAt(0)
                .toUpperCase() +
                interviewType.slice(1)}{" "}
              Interview
            </h1>

          </div>

          <div
            className={`timer ${
              timeLeft <= 300
                ? "timer-warning"
                : ""
            }`}
          >
            <span>⏱</span>

            {formatTime()}

          </div>

        </header>

        {/* PROGRESS */}

        <div className="progress-section">

          <div className="progress-info">

            <span>
              Question{" "}
              {currentQuestion + 1} of{" "}
              {questions.length}
            </span>

            <span>
              {Math.round(progress)}%
            </span>

          </div>

          <div className="progress-track">

            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />

          </div>

        </div>

        {/* MAIN LAYOUT */}

        <div className="interview-layout">

          {/* SIDEBAR */}

          <aside className="question-sidebar">

            <div className="sidebar-title">

              <h3>
                Questions
              </h3>

              <span>
                {answeredCount}/
                {questions.length}
              </span>

            </div>

            <div className="question-list">

              {questions.map(
                (item, index) => {

                  const answered =
                    answers[index] &&
                    answers[index]
                      .trim()
                      .length > 0;

                  return (
                    <button
                      key={item.id || index}
                      className={`question-number ${
                        currentQuestion ===
                        index
                          ? "active"
                          : ""
                      } ${
                        answered
                          ? "answered"
                          : ""
                      }`}
                      onClick={() =>
                        goToQuestion(index)
                      }
                    >

                      <span>
                        {index + 1}
                      </span>

                      {answered && (
                        <small>
                          ✓
                        </small>
                      )}

                    </button>
                  );
                }
              )}

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

          {/* QUESTION */}

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
                {String(
                  currentQuestion + 1
                ).padStart(2, "0")}
              </div>

              <h2>
                {question.question}
              </h2>

              <p className="answer-label">
                Your Answer
              </p>

              <textarea
                className="answer-editor"
                placeholder="Type your answer here..."
                value={
                  answers[
                    currentQuestion
                  ] || ""
                }
                onChange={(e) =>
                  handleAnswerChange(
                    e.target.value
                  )
                }
                disabled={evaluating}
              />

              {/* ====================================
                  EVALUATION RESULT
              ==================================== */}

              {evaluation && (
                <div className="evaluation-card">

                  <div className="evaluation-score">

                    <span>
                      AI Score
                    </span>

                    <strong>
                      {evaluation.score}/10
                    </strong>

                  </div>

                  <div className="evaluation-section">

                    <h4>
                      Feedback
                    </h4>

                    <p>
                      {evaluation.feedback}
                    </p>

                  </div>

                  {evaluation.strengths
                    ?.length > 0 && (
                    <div className="evaluation-section">

                      <h4>
                        Strengths
                      </h4>

                      <ul>
                        {evaluation.strengths.map(
                          (
                            strength,
                            index
                          ) => (
                            <li key={index}>
                              {strength}
                            </li>
                          )
                        )}
                      </ul>

                    </div>
                  )}

                  {evaluation.improvements
                    ?.length > 0 && (
                    <div className="evaluation-section">

                      <h4>
                        Improvements
                      </h4>

                      <ul>
                        {evaluation.improvements.map(
                          (
                            improvement,
                            index
                          ) => (
                            <li key={index}>
                              {improvement}
                            </li>
                          )
                        )}
                      </ul>

                    </div>
                  )}

                </div>
              )}

              {/* ANSWER FOOTER */}

              <div className="answer-footer">

                <span>
                  {
                    (
                      answers[
                        currentQuestion
                      ] || ""
                    ).length
                  }{" "}
                  characters
                </span>

                <span>
                  {answers[
                    currentQuestion
                  ]
                    ? "Answer entered"
                    : "Not answered yet"}
                </span>

              </div>

            </div>

            {/* ====================================
                NAVIGATION
            ==================================== */}

            <div className="question-navigation">

              <button
                className="secondary-btn"
                disabled={
                  currentQuestion === 0 ||
                  evaluating
                }
                onClick={
                  previousQuestion
                }
              >
                ← Previous
              </button>

              {/* NOT EVALUATED */}

              {!evaluation && (
                <button
                  className="primary-btn"
                  onClick={
                    nextQuestion
                  }
                  disabled={evaluating}
                >
                  {evaluating
                    ? "AI is evaluating..."
                    : "Submit Answer"}
                </button>
              )}

              {/* EVALUATED + MORE QUESTIONS */}

              {evaluation &&
                currentQuestion <
                  questions.length -
                    1 && (
                  <button
                    className="primary-btn"
                    onClick={
                      moveToNextQuestion
                    }
                  >
                    Next Question →
                  </button>
                )}

              {/* EVALUATED + LAST QUESTION */}

              {evaluation &&
                currentQuestion ===
                  questions.length -
                    1 && (
                  <button
                    className="finish-btn"
                    onClick={
                      finishInterview
                    }
                    disabled={
                      evaluating ||
                      loadingReport
                    }
                  >
                    {loadingReport
                      ? "Generating Report..."
                      : "Finish Interview ✓"}
                  </button>
                )}

            </div>

          </main>

        </div>

      </div>
    );
  }

  // ================================================
  // SETUP SCREEN
  // ================================================

  return (
    <div className="interview-page">

      <div className="setup-container">

        <div className="setup-header">

          <span className="brand-small">
            AI INTERVIEWER
          </span>

          <h1>
            Prepare for your interview.
          </h1>

          <p>
            Choose your interview style and
            let AI generate questions based
            on your resume.
          </p>

        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* INTERVIEW TYPE */}

        <section className="setup-section">

          <h2>
            Choose Interview Type
          </h2>

          <div className="interview-types">

            <button
              className={`type-card ${
                interviewType ===
                "technical"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setInterviewType(
                  "technical"
                )
              }
            >
              <div className="type-icon">
                ⌘
              </div>

              <h3>
                Technical
              </h3>

              <p>
                Test your technical
                knowledge, projects and
                development skills.
              </p>

            </button>

            <button
              className={`type-card ${
                interviewType === "hr"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setInterviewType("hr")
              }
            >
              <div className="type-icon">
                ◎
              </div>

              <h3>
                HR
              </h3>

              <p>
                Practice behavioral,
                career and
                personality-based
                questions.
              </p>

            </button>

            <button
              className={`type-card ${
                interviewType ===
                "mock"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setInterviewType("mock")
              }
            >
              <div className="type-icon">
                ◆
              </div>

              <h3>
                Mock Interview
              </h3>

              <p>
                Experience a realistic
                combination of technical
                and HR questions.
              </p>

            </button>

          </div>

        </section>

        {/* QUESTION COUNT */}

        <section className="setup-section">

          <h2>
            Number of Questions
          </h2>

          <div className="question-count-options">

            {[5, 10, 15, 20].map(
              (count) => (
                <button
                  key={count}
                  className={
                    numQuestions ===
                    count
                      ? "count-option selected"
                      : "count-option"
                  }
                  onClick={() =>
                    setNumQuestions(
                      count
                    )
                  }
                >
                  {count}
                </button>
              )
            )}

          </div>

        </section>

        {/* START */}

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
            <>
              Start Interview →
            </>
          )}
        </button>

        {/* HISTORY */}

        {sessions.length > 0 && (
          <section className="history-section">

            <div className="history-heading">

              <div>

                <h2>
                  Previous Interviews
                </h2>

                <p>
                  Review your previous
                  interview sessions.
                </p>

              </div>

            </div>

            <div className="history-list">

              {sessions.map(
                (session) => (
                  <div
                    className="history-item"
                    key={session.id}
                  >

                    <div className="history-info">

                      <div className="history-type">
                        {
                          session.interview_type
                        }
                      </div>

                      <h4>
                        {session.interview_type
                          .charAt(0)
                          .toUpperCase() +
                          session.interview_type.slice(
                            1
                          )}{" "}
                        Interview
                      </h4>

                      <p>
                        {
                          session.num_questions
                        }{" "}
                        questions
                        {" • "}
                        {new Date(
                          session.created_at
                        ).toLocaleString()}
                      </p>

                    </div>

                    <button
                      className="history-view-btn"
                      onClick={() =>
                        viewSession(
                          session.id
                        )
                      }
                    >
                      View →
                    </button>

                  </div>
                )
              )}

            </div>

          </section>
        )}

      </div>

    </div>
  );
};

export default Interview;