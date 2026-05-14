import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Stethoscope } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Create form data instead of standard JSON
      const formData = new URLSearchParams();
      formData.append('username', email); // Map email to the 'username' field
      formData.append('password', password);

      // 2. Send as form data
      const { data } = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      localStorage.setItem('token', data.access_token);
      navigate('/chat');
    } catch (err) {
      console.error(err);
      alert("Invalid email or password");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        
        <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2"><Stethoscope size={28}/></div>
            <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
            <p className="text-sm text-gray-500">Log in to access your HealthAI</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none" 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none" 
            required 
          />
          <button type="submit" className="w-full bg-blue-600 text-white font-bold p-3 rounded-xl hover:bg-blue-700 transition">
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600 text-sm">
          Don't have an account? <Link to="/register" className="text-blue-600 font-bold hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  );
}