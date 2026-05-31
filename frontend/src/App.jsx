import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <ToastProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          <Routes>
            {/* Public-only routes (redirect to /chat if already logged in) */}
            <Route element={<PublicRoute />}>
              <Route path="/"                element={<Landing />} />
              <Route path="/login"           element={<Login />} />
              <Route path="/register"        element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password"  element={<ResetPassword />} />
            </Route>

            {/* Profile — requires login but not completed profile */}
            <Route element={<ProtectedRoute requireProfile={false} />}>
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Chat — requires login AND completed profile */}
            <Route element={<ProtectedRoute requireProfile={true} />}>
              <Route path="/chat" element={<Chat />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
