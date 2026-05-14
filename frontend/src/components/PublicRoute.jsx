// PublicRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
export default function PublicRoute() {
    const token = localStorage.getItem('token');
    // Feature 6: Redirect logged-in users away from public pages
    return token ? <Navigate to="/chat" replace /> : <Outlet />;
}