import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          {/* Public Routes (Redirects to chat if already logged in) */}
          <Route element={<PublicRoute />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} /> 
          </Route>

          {/* Protected Routes (Requires Login & Profile Check) */}
          <Route element={<ProtectedRoute requireProfile={false} />}>
            <Route path="/profile" element={<Profile />} />
          </Route>
          
          <Route element={<ProtectedRoute requireProfile={true} />}>
            <Route path="/chat" element={<Chat />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}
export default App;