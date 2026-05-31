// ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from './Toast';

export default function ProtectedRoute({ requireProfile }) {
  const [isProfileComplete, setIsProfileComplete] = useState(null);
  const { toast } = useToast();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token && requireProfile) {
      api.get('/profile/')
        .then(res => {
          if (!res.data || !res.data.name || !res.data.age) {
            setIsProfileComplete(false);
          } else {
            setIsProfileComplete(true);
          }
        })
        .catch(() => setIsProfileComplete(false));
    } else {
      setIsProfileComplete(true);
    }
  }, [token, requireProfile]);

  if (!token) return <Navigate to="/login" replace />;

  if (isProfileComplete === null) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (requireProfile && !isProfileComplete) {
    // Use toast instead of alert — but we need to trigger it after render
    // so we use a side-effect-safe pattern via Navigate + state
    return <RedirectWithToast to="/profile" message="Please complete your profile before chatting." />;
  }

  return <Outlet />;
}

// Tiny helper that fires a toast then navigates
function RedirectWithToast({ to, message }) {
  const { toast } = useToast();
  useEffect(() => {
    toast(message, 'info');
  }, []);
  return <Navigate to={to} replace />;
}
