import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Stethoscope } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', formData);
      alert('Registered successfully! Please log in.');
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.detail || "Registration Failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2"><Stethoscope size={28}/></div>
            <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
            <p className="text-sm text-gray-500">Join HealthAI today</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" 
            placeholder="Full Name" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none" 
            required 
          />
          <input 
            type="email" 
            placeholder="Email Address" 
            value={formData.email} 
            onChange={e => setFormData({...formData, email: e.target.value})} 
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none" 
            required 
          />
          <input 
            type="password" 
            placeholder="Secure Password" 
            value={formData.password} 
            onChange={e => setFormData({...formData, password: e.target.value})} 
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none" 
            required 
          />
          <button type="submit" className="w-full bg-blue-600 text-white font-bold p-3 rounded-xl hover:bg-blue-700 transition">
            Sign Up
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600 text-sm">
          Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}