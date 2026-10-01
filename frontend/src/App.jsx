import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [resumeData, setResumeData] = useState(null);
  const [extractedText, setExtractedText] = useState("");

  const [previousResumes, setPreviousResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);

  // --------------------------------------------------
  // Fetch previous resumes
  // --------------------------------------------------

  const fetchPreviousResumes = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/resume/list/"
      );

      const data = await response.json();

      if (response.ok) {
        setPreviousResumes(data);
      } else {
        console.error("Failed to fetch resumes:", data);
      }
    } catch (error) {
      console.error("Failed to fetch resumes:", error);
    }
  };

  // --------------------------------------------------
  // Load previous resumes when page opens
  // --------------------------------------------------

  useEffect(() => {
    fetchPreviousResumes();
  }, []);

  // --------------------------------------------------
  // File selection
  // --------------------------------------------------

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);
    setMessage("");

    // Clear currently displayed resume
    setResumeData(null);
    setExtractedText("");
    setSelectedResume(null);
  };

  // --------------------------------------------------
  // Upload resume
  // --------------------------------------------------

  const handleUpload = async () => {
    if (!file) {
      return;
    }

    setUploading(true);
    setMessage("");

    setResumeData(null);
    setExtractedText("");
    setSelectedResume(null);

    const formData = new FormData();

    formData.append("file", file);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/resume/upload/",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Resume analyzed successfully!");

        setResumeData(data.resume_data);
        setExtractedText(data.extracted_text);

        // Refresh previous resumes after upload
        await fetchPreviousResumes();
      } else {
        setMessage(data.error || "Something went wrong.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("Could not connect to the server.");
    } finally {
      setUploading(false);
    }
  };
  const handleDeleteResume = async (resumeId) => {
  try {
    const response = await fetch(
      `http://127.0.0.1:8000/api/resume/delete/${resumeId}/`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();

    if (response.ok) {
      setMessage("Resume deleted successfully!");

      // Refresh resume list
      await fetchPreviousResumes();

      // Clear analysis if deleted resume was selected
      if (selectedResume?.id === resumeId) {
        setSelectedResume(null);
        setResumeData(null);
        setExtractedText("");
      }
    } else {
      setMessage(data.error || "Failed to delete resume.");
    }
  } catch (error) {
    console.error("Delete error:", error);
    setMessage("Could not connect to the server.");
  }
};

  // --------------------------------------------------
  // View a previously uploaded resume
  // --------------------------------------------------

  const handleViewResume = async (resume) => {
  try {
    const response = await fetch(
      `http://127.0.0.1:8000/api/resume/${resume.id}/`
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Failed to load resume.");
      return;
    }

    setSelectedResume(resume);
    setResumeData(data.extracted_data || {});
    setExtractedText(data.extracted_text || "");

    setTimeout(() => {
      const analysisSection =
        document.getElementById("resume-analysis");

      if (analysisSection) {
        analysisSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);

  } catch (error) {
    console.error("Failed to load resume:", error);
    setMessage("Could not connect to the server.");
  }
};

  // --------------------------------------------------
  // Clear selected resume
  // --------------------------------------------------

  const handleClearSelectedResume = () => {
    setSelectedResume(null);
    setResumeData(null);
    setExtractedText("");
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="app">

      {/* ==============================================
          UPLOAD SECTION
      ============================================== */}

      <div className="upload-card">

        <div className="icon">
          📄
        </div>

        <h1>
          Resume Analyzer
        </h1>

        <p className="subtitle">
          Upload your resume and let AI extract your
          professional profile.
        </p>

        <label className="upload-area">

          <span className="upload-icon">
            ⬆
          </span>

          <span className="upload-title">
            {file
              ? file.name
              : "Drop your resume here"}
          </span>

          <span className="upload-text">
            {file
              ? `${(
                  file.size /
                  1024 /
                  1024
                ).toFixed(2)} MB`
              : "or click to browse"}
          </span>

          <span className="file-types">
            PDF, PNG or JPG
          </span>

          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
          />

        </label>

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading
            ? "Analyzing Resume..."
            : "Analyze Resume"}
        </button>

        {message && (
          <p className="message">
            {message}
          </p>
        )}

      </div>


      {/* ==============================================
          RESUME ANALYSIS
      ============================================== */}

      {resumeData &&
        Object.keys(resumeData).length > 0 && (

          <div
            className="results"
            id="resume-analysis"
          >

            <h1>
              Resume Analysis
            </h1>

            {selectedResume && (
              <div className="selected-resume-banner">

                <span>
                  📂 Viewing saved resume #
                  {selectedResume.id}
                </span>

                <button
                  type="button"
                  onClick={handleClearSelectedResume}
                >
                  Clear
                </button>

              </div>
            )}


            {/* ==========================================
                PROFILE
            ========================================== */}

            <section className="result-section">

              <h2>
                👤 Profile
              </h2>

              <div className="profile-grid">

                <div>
                  <span>
                    Name
                  </span>

                  <strong>
                    {resumeData.name ||
                      "Not found"}
                  </strong>
                </div>

                <div>
                  <span>
                    Email
                  </span>

                  <strong>
                    {resumeData.email ||
                      "Not found"}
                  </strong>
                </div>

                <div>
                  <span>
                    Phone
                  </span>

                  <strong>
                    {resumeData.phone ||
                      "Not found"}
                  </strong>
                </div>

              </div>

            </section>


            {/* ==========================================
                SKILLS
            ========================================== */}

            <section className="result-section">

              <h2>
                🛠 Skills
              </h2>

              <div className="skills">

                {Array.isArray(
                  resumeData.skills
                ) &&
                resumeData.skills.length > 0 ? (

                  resumeData.skills.map(
                    (skill, index) => (

                      <span
                        className="skill"
                        key={index}
                      >
                        {typeof skill ===
                        "object"
                          ? JSON.stringify(skill)
                          : skill}
                      </span>

                    )
                  )

                ) : (

                  <p>
                    No skills found.
                  </p>

                )}

              </div>

            </section>


            {/* ==========================================
                EDUCATION
            ========================================== */}

            <section className="result-section">

              <h2>
                🎓 Education
              </h2>

              {Array.isArray(
                resumeData.education
              ) &&
              resumeData.education.length > 0 ? (

                <div className="items-list">

                  {resumeData.education.map(
                    (item, index) => (

                      <div
                        className="info-card"
                        key={index}
                      >

                        {typeof item ===
                        "object" ? (

                          <>

                            {item.degree && (
                              <h3>
                                {item.degree}
                              </h3>
                            )}

                            {item.institution && (
                              <p>
                                <strong>
                                  Institution:
                                </strong>{" "}
                                {item.institution}
                              </p>
                            )}

                            {item.year && (
                              <p>
                                <strong>
                                  Year:
                                </strong>{" "}
                                {item.year}
                              </p>
                            )}

                            {item.description && (
                              <p>
                                {item.description}
                              </p>
                            )}

                          </>

                        ) : (

                          <p>
                            {item}
                          </p>

                        )}

                      </div>

                    )
                  )}

                </div>

              ) : (

                <p>
                  No education information found.
                </p>

              )}

            </section>


            {/* ==========================================
                EXPERIENCE
            ========================================== */}

            <section className="result-section">

              <h2>
                💼 Experience
              </h2>

              {Array.isArray(
                resumeData.experience
              ) &&
              resumeData.experience.length > 0 ? (

                <div className="items-list">

                  {resumeData.experience.map(
                    (item, index) => (

                      <div
                        className="info-card"
                        key={index}
                      >

                        {typeof item ===
                        "object" ? (

                          <>

                            {item.role && (
                              <h3>
                                {item.role}
                              </h3>
                            )}

                            {item.company && (
                              <p>
                                <strong>
                                  Company:
                                </strong>{" "}
                                {item.company}
                              </p>
                            )}

                            {item.duration && (
                              <p>
                                <strong>
                                  Duration:
                                </strong>{" "}
                                {item.duration}
                              </p>
                            )}

                            {item.description && (
                              <p>
                                {item.description}
                              </p>
                            )}

                          </>

                        ) : (

                          <p>
                            {item}
                          </p>

                        )}

                      </div>

                    )
                  )}

                </div>

              ) : (

                <p>
                  No experience information found.
                </p>

              )}

            </section>


            {/* ==========================================
                PROJECTS
            ========================================== */}

            <section className="result-section">

              <h2>
                🚀 Projects
              </h2>

              {Array.isArray(
                resumeData.projects
              ) &&
              resumeData.projects.length > 0 ? (

                <div className="projects-list">

                  {resumeData.projects.map(
                    (project, index) => (

                      <div
                        className="project-card"
                        key={index}
                      >

                        {typeof project ===
                        "object" ? (

                          <>

                            {project.name && (
                              <h3>
                                {project.name}
                              </h3>
                            )}

                            {Array.isArray(
                              project.tech_stack
                            ) &&
                            project.tech_stack.length > 0 && (

                              <div className="skills">

                                {project.tech_stack.map(
                                  (
                                    tech,
                                    techIndex
                                  ) => (

                                    <span
                                      className="skill"
                                      key={
                                        techIndex
                                      }
                                    >
                                      {tech}
                                    </span>

                                  )
                                )}

                              </div>

                            )}

                            {project.description && (
                              <p>
                                {project.description}
                              </p>
                            )}

                          </>

                        ) : (

                          <h3>
                            {project}
                          </h3>

                        )}

                      </div>

                    )
                  )}

                </div>

              ) : (

                <p>
                  No projects found.
                </p>

              )}

            </section>


            {/* ==========================================
                CERTIFICATIONS
            ========================================== */}

            <section className="result-section">

              <h2>
                🏆 Certifications
              </h2>

              {Array.isArray(
                resumeData.certifications
              ) &&
              resumeData.certifications.length > 0 ? (

                <ul>

                  {resumeData.certifications.map(
                    (item, index) => (

                      <li key={index}>

                        {typeof item ===
                        "object"
                          ? JSON.stringify(item)
                          : item}

                      </li>

                    )
                  )}

                </ul>

              ) : (

                <p>
                  No certifications found.
                </p>

              )}

            </section>


            {/* ==========================================
                RAW TEXT
            ========================================== */}

            {extractedText && (

              <details className="raw-text">

                <summary>
                  View extracted resume text
                </summary>

                <pre>
                  {extractedText}
                </pre>

              </details>

            )}

          </div>

        )}


      {/* ==============================================
          PREVIOUS RESUMES
      ============================================== */}

      {previousResumes.length > 0 && (

        <div className="previous-resumes">

          <h1>
            📂 Previous Resumes
          </h1>

          <div className="resume-list">

            {previousResumes.map(
              (resume) => (

                <div
                  className="resume-card"
                  key={resume.id}
                >

                  <div className="resume-info">

                    <h3>
                      {resume.extracted_data?.name ||
                        "Unknown Candidate"}
                    </h3>

                    <p>
                      {resume.extracted_data?.email ||
                        "No email found"}
                    </p>

                    <small>
                      Uploaded:{" "}
                      {new Date(
                        resume.uploaded_at
                      ).toLocaleString()}
                    </small>

                  </div>


                  <div className="resume-skills">

                    {Array.isArray(
                      resume.extracted_data?.skills
                    ) &&
                    resume.extracted_data.skills
                      .slice(0, 5)
                      .map(
                        (skill, index) => (

                          <span
                            className="skill"
                            key={index}
                          >
                            {skill}
                          </span>

                        )
                      )}

                  </div>


                  <button
                    type="button"
                    className="view-resume-btn"
                    onClick={() =>
                      handleViewResume(resume)
                    }
                  >
                    View Resume
                  </button>
                  <button
  type="button"
  className="delete-resume-btn"
  onClick={() => handleDeleteResume(resume.id)}
>
  Delete
</button>

                </div>

              )
            )}

          </div>

        </div>

      )}

    </div>
  );
}

export default App;