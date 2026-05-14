import { useNavigate } from 'react-router-dom';
import { Stethoscope, Activity, MapPin, MessageSquare, Globe } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 lg:px-24 bg-blue-50">
        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2"><Stethoscope/> HealthAI</h1>
        <div className="hidden md:flex gap-6 font-medium text-gray-600">
          <a href="#features" className="hover:text-blue-600">Features</a>
          <a href="#about" className="hover:text-blue-600">About</a>
        </div>
        <div className="flex gap-4">
          <button onClick={() => navigate('/login')} className="px-5 py-2 text-blue-600 font-semibold border border-blue-600 rounded-full hover:bg-blue-50">Login</button>
          <button onClick={() => navigate('/login')} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700">Register</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center py-20 px-6 bg-blue-50">
        <h2 className="text-5xl font-extrabold text-gray-900 mb-6">Your Personal Multilingual Medical Assistant</h2>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">Upload skin issues, analyze lab reports, and get real-time voice medical advice in 6+ languages powered by advanced AI and your personal health memory.</p>
        <button onClick={() => navigate('/login')} className="px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-full shadow-lg hover:bg-blue-700 transition">Start Chatting Now</button>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 lg:px-24">
        <h3 className="text-3xl font-bold text-center mb-12">Powerful Features</h3>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard icon={<MessageSquare />} title="Voice & Chat Memory" desc="AI remembers your past health issues to provide personalized advice. Audio auto-plays." />
          <FeatureCard icon={<Activity />} title="Skin & Lab Analysis" desc="Upload images of rashes or acne, and PDF medical reports for instant explanations." />
          <FeatureCard icon={<MapPin />} title="Nearby Clinics" desc="Instantly detect emergencies and find the nearest hospitals with integrated map support." />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-6 bg-white border rounded-2xl shadow-sm hover:shadow-md transition text-center">
      <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">{icon}</div>
      <h4 className="text-xl font-bold mb-2">{title}</h4>
      <p className="text-gray-600">{desc}</p>
    </div>
  );
}