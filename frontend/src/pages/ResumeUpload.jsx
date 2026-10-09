import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteResume,
  getMediaUrl,
  getResume,
  getResumes,
  uploadResume,
} from "../services/api";

const allowedExtensions = /\.(pdf|png|jpe?g)$/i;

function displayDate(value) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ResumeUpload() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [loadingResumeId, setLoadingResumeId] = useState(null);
  const [deletingResumeId, setDeletingResumeId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [resumeId, setResumeId] = useState(null);
  const [resumeFileUrl, setResumeFileUrl] = useState("");

  const refreshResumes = async () => {
    const data = await getResumes();
    setResumes(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    let active = true;

    getResumes()
      .then((data) => {
        if (active) setResumes(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (active) {
          setFeedback({
            type: "error",
            text:
              error.response?.data?.error ||
              "Could not load saved resumes. Check that the backend is running.",
          });
        }
      })
      .finally(() => {
        if (active) setLoadingResumes(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectFile = (selectedFile) => {
    if (!selectedFile) return;
    setFeedback(null);
    setResumeData(null);
    setExtractedText("");
    setResumeId(null);
    setResumeFileUrl("");

    if (!allowedExtensions.test(selectedFile.name)) {
      setFile(null);
      setFeedback({
        type: "error",
        text: "Choose a PDF, PNG or JPG file.",
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleFileChange = (event) => {
    selectFile(event.target.files?.[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    selectFile(event.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setFeedback({ type: "error", text: "Select a resume to get started." });
      return;
    }

    setUploading(true);
    setFeedback(null);
    setResumeData(null);
    setExtractedText("");

    try {
      const data = await uploadResume(file);
      const uploadedResumeId =
        data.id ?? data.resume_id ?? data.resume?.id ?? null;
      setResumeData(data.resume_data || data.extracted_data || null);
      setExtractedText(data.extracted_text || "");
      setResumeId(uploadedResumeId);
      setResumeFileUrl(data.file || "");
      setFeedback({
        type: uploadedResumeId == null ? "warning" : "success",
        text:
          uploadedResumeId == null
            ? "Resume analyzed, but the server did not return its resume ID."
            : "Your resume has been analyzed.",
      });
      try {
        await refreshResumes();
      } catch (refreshError) {
        console.error("Failed to refresh resume library:", refreshError);
        setFeedback({
          type: "warning",
          text: "Resume analyzed successfully, but the library could not be refreshed.",
        });
      }
    } catch (error) {
      const responseData = error.response?.data;
      if (responseData?.extracted_text) {
        setExtractedText(responseData.extracted_text);
        try {
          await refreshResumes();
        } catch (refreshError) {
          console.error("Failed to refresh resume library:", refreshError);
        }
      }
      setFeedback({
        type: "error",
        text:
          responseData?.error ||
          "Resume upload failed. Check your connection and try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const openResume = async (id) => {
    setLoadingResumeId(id);
    setFeedback(null);

    try {
      const data = await getResume(id);
      setResumeId(data.id);
      setResumeData(data.extracted_data || null);
      setExtractedText(data.extracted_text || "");
      setResumeFileUrl(data.file || "");
      document.getElementById("analysis")?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.error || "Could not open this resume.",
      });
    } finally {
      setLoadingResumeId(null);
    }
  };

  const removeResume = async (id) => {
    if (!window.confirm("Delete this resume and its interview history?")) return;

    setDeletingResumeId(id);
    setFeedback(null);
    try {
      await deleteResume(id);
      setResumes((current) => current.filter((resume) => resume.id !== id));
      if (resumeId === id) {
        setResumeId(null);
        setResumeData(null);
        setExtractedText("");
        setResumeFileUrl("");
      }
      setFeedback({ type: "success", text: "Resume deleted." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.error || "Could not delete this resume.",
      });
    } finally {
      setDeletingResumeId(null);
    }
  };

  const renderList = (items, emptyMessage) => {
    if (!Array.isArray(items) || items.length === 0) {
      return <p className="empty-copy">{emptyMessage}</p>;
    }

    return (
      <ul className="analysis-list">
        {items.map((item, index) => (
          <li key={`${index}-${typeof item === "string" ? item : "item"}`}>
            {typeof item === "object" && item !== null
              ? item.name ||
                item.degree ||
                item.role ||
                JSON.stringify(item)
              : String(item)}
          </li>
        ))}
      </ul>
    );
  };

  const profileName = resumeData?.name || "Your next opportunity starts here";

  return (
    <main className="resume-page">
      <section className="hero-layout">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-line" />RESUME STUDIO</span>
          <h1>
            Make your next
            <br />
            move <em>count.</em>
          </h1>
          <p>
            Get a clearer picture of your experience, then turn your resume
            into a personalized interview practice session.
          </p>
          <div className="hero-proof">
            <span className="proof-mark">✳</span>
            <span>Resume library</span>
            <span className="proof-divider" />
            <span>Built around your experience</span>
          </div>
        </div>

        <div className="upload-panel">
          <div className="panel-topline">
            <div>
              <span className="panel-kicker">01 / UPLOAD</span>
              <h2>Start with your resume</h2>
            </div>
            <span className="file-stamp">PDF · PNG · JPG</span>
          </div>

          <label
            className={`upload-dropzone${file ? " has-file" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
            />
            <span className="upload-symbol" aria-hidden="true">
              {file ? "✓" : "↑"}
            </span>
            <strong>{file ? file.name : "Drop your resume here"}</strong>
            <span className="dropzone-hint">
              {file
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Click to change`
                : "or browse files from your device"}
            </span>
          </label>

          <button
            className="button button-primary upload-submit"
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <span className="button-spinner" />
                Analyzing your resume…
              </>
            ) : (
              <>Analyze resume <span aria-hidden="true">↗</span></>
            )}
          </button>

          {feedback && (
            <p className={`feedback feedback-${feedback.type}`} role="status">
              {feedback.text}
            </p>
          )}
          <p className="privacy-note">
            Your upload and its analysis are saved so you can revisit them later.
          </p>
        </div>
      </section>

      <section className="library-section" id="resumes">
        <div className="section-heading">
          <div>
            <span className="panel-kicker">YOUR WORKSPACE</span>
            <h2>Resume library <span className="item-count">{resumes.length}</span></h2>
          </div>
          <span className="section-aside">Your uploaded resumes, all in one place.</span>
        </div>

        {loadingResumes ? (
          <div className="library-empty"><span className="button-spinner" /> Loading your resumes…</div>
        ) : resumes.length ? (
          <div className="resume-grid">
            {resumes.map((resume) => {
              const filename = decodeURIComponent(
                (resume.file || "").split("/").pop() || "Resume file"
              );
              return (
                <article className="resume-tile" key={resume.id}>
                  <div className="resume-tile-top">
                    <span className="document-icon" aria-hidden="true">▤</span>
                    <span className="resume-id">RESUME {String(resume.id).padStart(3, "0")}</span>
                    <button
                      className="icon-button delete-resume"
                      type="button"
                      aria-label={`Delete ${filename}`}
                      title="Delete resume"
                      disabled={deletingResumeId === resume.id}
                      onClick={() => removeResume(resume.id)}
                    >
                      {deletingResumeId === resume.id ? "…" : "×"}
                    </button>
                  </div>
                  <h3 title={filename}>{filename}</h3>
                  <p className="resume-date">Added {displayDate(resume.uploaded_at)}</p>
                  <div className="resume-tile-actions">
                    <button
                      className="text-button"
                      type="button"
                      disabled={loadingResumeId === resume.id}
                      onClick={() => openResume(resume.id)}
                    >
                      {loadingResumeId === resume.id ? "Loading…" : "View analysis"}
                      <span aria-hidden="true">↗</span>
                    </button>
                    <a
                      className="file-link"
                      href={getMediaUrl(resume.file)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open file
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="library-empty">
            <span className="empty-icon" aria-hidden="true">↳</span>
            <div>
              <strong>Your library is ready when you are.</strong>
              <p>Upload a resume above to see its analysis here.</p>
            </div>
          </div>
        )}
      </section>

      {resumeData && (
        <section className="analysis-section" id="analysis">
          <div className="analysis-heading">
            <div>
              <span className="panel-kicker">RESUME INSIGHTS</span>
              <h2>{profileName}</h2>
              <p>A structured snapshot of the information found in your resume.</p>
            </div>
            {resumeFileUrl && (
              <a
                className="button button-outline"
                href={getMediaUrl(resumeFileUrl)}
                target="_blank"
                rel="noreferrer"
              >
                Open original <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>

          <div className="analysis-grid">
            <section className="analysis-card profile-card">
              <span className="panel-kicker">AT A GLANCE</span>
              <h3>Profile</h3>
              <div className="profile-details">
                <div><span>Name</span><strong>{resumeData.name || "Not found"}</strong></div>
                <div><span>Email</span><strong>{resumeData.email || "Not found"}</strong></div>
                <div><span>Phone</span><strong>{resumeData.phone || "Not found"}</strong></div>
              </div>
              <div className="analysis-subsection">
                <h4>Skills</h4>
                {Array.isArray(resumeData.skills) && resumeData.skills.length ? (
                  <div className="skill-tags">
                    {resumeData.skills.map((skill, index) => (
                      <span className="skill-tag" key={`${skill}-${index}`}>{skill}</span>
                    ))}
                  </div>
                ) : <p className="empty-copy">No skills found.</p>}
              </div>
            </section>

            <section className="analysis-card">
              <span className="panel-kicker">BACKGROUND</span>
              <h3>Education</h3>
              {Array.isArray(resumeData.education) && resumeData.education.length ? (
                <div className="analysis-items">
                  {resumeData.education.map((item, index) => (
                    <article className="analysis-item" key={index}>
                      <h4>{typeof item === "object" ? item.degree || "Education" : item}</h4>
                      {typeof item === "object" && <p>{[item.institution, item.year].filter(Boolean).join(" · ")}</p>}
                      {typeof item === "object" && item.description && <p>{item.description}</p>}
                    </article>
                  ))}
                </div>
              ) : <p className="empty-copy">No education information found.</p>}
            </section>

            <section className="analysis-card">
              <span className="panel-kicker">CAREER HISTORY</span>
              <h3>Experience</h3>
              {Array.isArray(resumeData.experience) && resumeData.experience.length ? (
                <div className="analysis-items">
                  {resumeData.experience.map((item, index) => (
                    <article className="analysis-item" key={index}>
                      <h4>{typeof item === "object" ? item.role || "Experience" : item}</h4>
                      {typeof item === "object" && <p>{[item.company, item.duration].filter(Boolean).join(" · ")}</p>}
                      {typeof item === "object" && item.description && <p>{item.description}</p>}
                    </article>
                  ))}
                </div>
              ) : <p className="empty-copy">No experience information found.</p>}
            </section>

            <section className="analysis-card">
              <span className="panel-kicker">SELECTED WORK</span>
              <h3>Projects</h3>
              {Array.isArray(resumeData.projects) && resumeData.projects.length ? (
                <div className="analysis-items">
                  {resumeData.projects.map((project, index) => (
                    <article className="analysis-item" key={index}>
                      <h4>{typeof project === "object" ? project.name || "Project" : project}</h4>
                      {typeof project === "object" && Array.isArray(project.tech_stack) && (
                        <div className="skill-tags compact-tags">
                          {project.tech_stack.map((tech, techIndex) => (
                            <span className="skill-tag" key={`${tech}-${techIndex}`}>{tech}</span>
                          ))}
                        </div>
                      )}
                      {typeof project === "object" && project.description && <p>{project.description}</p>}
                    </article>
                  ))}
                </div>
              ) : <p className="empty-copy">No projects found.</p>}
            </section>

            <section className="analysis-card certification-card">
              <span className="panel-kicker">CREDENTIALS</span>
              <h3>Certifications</h3>
              {renderList(resumeData.certifications, "No certifications found.")}
            </section>
          </div>

          <details className="extracted-text">
            <summary>View extracted resume text</summary>
            <pre>{extractedText || "No extracted text was returned."}</pre>
          </details>

          <div className="analysis-cta">
            <div>
              <span className="panel-kicker">READY FOR THE NEXT STEP?</span>
              <h3>Practice with questions tailored to your resume.</h3>
            </div>
            <button
              className="button button-primary"
              type="button"
              onClick={() => navigate(`/interview?resume_id=${resumeId}`)}
              disabled={resumeId == null}
            >
              Build my interview <span aria-hidden="true">↗</span>
            </button>
          </div>
        </section>
      )}

      {extractedText && !resumeData && (
        <section className="analysis-section" id="analysis">
          <div className="analysis-heading">
            <div>
              <span className="panel-kicker">TEXT EXTRACTION COMPLETE</span>
              <h2>AI analysis is temporarily unavailable.</h2>
              <p>Your resume text was extracted and the saved file remains in your library.</p>
            </div>
          </div>
          <details className="extracted-text" open>
            <summary>Extracted resume text</summary>
            <pre>{extractedText}</pre>
          </details>
        </section>
      )}

      <footer className="page-footer">
        <span>CareerCanvas</span>
        <span>One thoughtful step at a time.</span>
      </footer>
    </main>
  );
}

export default ResumeUpload;
