import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
} from "react-router-dom";

import "./App.css";
import Interview from "./pages/Interview";
import ResumeUpload from "./pages/ResumeUpload";

function App() {
  return (
    <BrowserRouter>
      <div className="site-shell">
        <header className="site-header">
          <Link className="brand" to="/resume-upload" aria-label="CareerCanvas home">
            <span className="brand-mark">C</span>
            <span>CareerCanvas</span>
          </Link>
          <nav className="site-nav" aria-label="Main navigation">
            <Link to="/resume-upload">Resume studio</Link>
            <Link to="/resume-upload#resumes">Your resumes</Link>
          </nav>
          <span className="header-note">
            <span className="status-dot" />
            AI-powered career prep
          </span>
        </header>

        <Routes>
          <Route path="/" element={<Navigate to="/resume-upload" replace />} />
          <Route path="/resume-upload" element={<ResumeUpload />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="*" element={<Navigate to="/resume-upload" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
