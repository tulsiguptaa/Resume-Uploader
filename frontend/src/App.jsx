import { useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setMessage("");

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
        setMessage("Resume uploaded successfully! ✓");
        console.log(data);
      } else {
        setMessage(data.error || "Upload failed");
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
          Upload your resume and we'll extract your information
        </p>

        <label className="upload-area">
          <span className="upload-icon">⬆</span>

          <span className="upload-title">
            {file ? file.name : "Drop your resume here"}
          </span>

          <span className="upload-text">
            {file ? "File selected" : "or click to browse"}
          </span>

          <span className="file-types">
            PDF, PNG or JPG • Max 5MB
          </span>

          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
          />
        </label>

        <button onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? "Uploading..." : "Upload Resume"}
        </button>

        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
}

export default App;