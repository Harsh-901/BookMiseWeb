import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import Reader from './pages/Reader';
import Library from './pages/lib';
import Social from "./pages/Social";
import "./index.css"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<HomePage/>} />
        <Route path="/library" element={<Library/>} />
        <Route path="/reader/:id" element={<Reader />} />
        <Route path="/social" element={<Social/>} />
      </Routes>
    </Router>
  );
}

export default App;
