// ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';

export default function ProtectedRoute({ requireProfile }) {
    const [isProfileComplete, setIsProfileComplete] = useState(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (token && requireProfile) {
            api.get('/profile/').then(res => {
                // If profile is empty/missing name or age, it's incomplete
                if (!res.data || !res.data.name || !res.data.age) setIsProfileComplete(false);
                else setIsProfileComplete(true);
            }).catch(() => setIsProfileComplete(false));
        } else {
            setIsProfileComplete(true);
        }
    },[token, requireProfile]);

    if (!token) return <Navigate to="/login" replace />;
    if (isProfileComplete === null) return <div className="h-screen flex items-center justify-center">Loading...</div>;
    
    // Feature 4: Enforce Profile Completion
    if (requireProfile && !isProfileComplete) {
        alert("Please complete your profile before chatting.");
        return <Navigate to="/profile" replace />;
    }

    return <Outlet />;
}