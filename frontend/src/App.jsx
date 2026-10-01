import { useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [resumeData, setResumeData] = useState(null);
  const [extractedText, setExtractedText] = useState("");

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    setFile(selectedFile);
    setMessage("");
    setResumeData(null);
    setExtractedText("");
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setMessage("");
    setResumeData(null);
    setExtractedText("");

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
      } else {
        setMessage(data.error || "Something went wrong.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app">

      <div className="upload-card">

        <div className="icon">📄</div>

        <h1>Resume Analyzer</h1>

        <p className="subtitle">
          Upload your resume and let AI extract your professional profile.
        </p>

        <label className="upload-area">

          <span className="upload-icon">⬆</span>

          <span className="upload-title">
            {file ? file.name : "Drop your resume here"}
          </span>

          <span className="upload-text">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
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
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? "Analyzing Resume..." : "Analyze Resume"}
        </button>

        {message && (
          <p className="message">
            {message}
          </p>
        )}

      </div>

      {resumeData && (
        <div className="results">

          <h1>Resume Analysis</h1>

          {/* Profile */}

          <section className="result-section">

            <h2>👤 Profile</h2>

            <div className="profile-grid">

              <div>
                <span>Name</span>
                <strong>{resumeData.name || "Not found"}</strong>
              </div>

              <div>
                <span>Email</span>
                <strong>{resumeData.email || "Not found"}</strong>
              </div>

              <div>
                <span>Phone</span>
                <strong>{resumeData.phone || "Not found"}</strong>
              </div>

            </div>

          </section>


          {/* Skills */}

          <section className="result-section">

            <h2>🛠 Skills</h2>

            <div className="skills">

              {resumeData.skills?.length > 0 ? (
                resumeData.skills.map((skill, index) => (
                  <span className="skill" key={index}>
                    {skill}
                  </span>
                ))
              ) : (
                <p>No skills found.</p>
              )}

            </div>

          </section>


          {/* Education */}

          <section className="result-section">

            <h2>🎓 Education</h2>

            {resumeData.education?.length > 0 ? (
              <ul>
                {resumeData.education.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>No education information found.</p>
            )}

          </section>


          {/* Experience */}

          <section className="result-section">

            <h2>💼 Experience</h2>

            {resumeData.experience?.length > 0 ? (
              <ul>
                {resumeData.experience.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>No experience information found.</p>
            )}

          </section>


          {/* Projects */}

          <section className="result-section">
  <h2>🚀 Projects</h2>

  {resumeData.projects?.length > 0 ? (
    <div className="projects-list">
      {resumeData.projects.map((project, index) => (
        <div className="project-card" key={index}>

          <h3>
            {typeof project === "object"
              ? project.name
              : project}
          </h3>

          {typeof project === "object" && project.tech_stack && (
            <div className="skills">
              {project.tech_stack.map((tech, techIndex) => (
                <span className="skill" key={techIndex}>
                  {tech}
                </span>
              ))}
            </div>
          )}

          {typeof project === "object" && project.description && (
            <p>{project.description}</p>
          )}

        </div>
      ))}
    </div>
  ) : (
    <p>No projects found.</p>
  )}
</section>


          {/* Certifications */}

          <section className="result-section">

            <h2>🏆 Certifications</h2>

            {resumeData.certifications?.length > 0 ? (
              <ul>
                {resumeData.certifications.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>No certifications found.</p>
            )}

          </section>


          {/* Raw text */}

          <details className="raw-text">

            <summary>View extracted resume text</summary>

            <pre>{extractedText}</pre>

          </details>

        </div>
      )}

    </div>
  );
}

export default App;