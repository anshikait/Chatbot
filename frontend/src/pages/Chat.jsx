import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Mic, Send, Paperclip, AlertTriangle, User, LogOut, Image as ImageIcon, Volume2, Plus, MessageSquare } from 'lucide-react';
import MapWidget from '../components/MapWidget';

export default function Chat() {
  const navigate = useNavigate();
  const[messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]); // 🆕 List of past chats
  const [currentSessionId, setCurrentSessionId] = useState(null); // 🆕 Active chat ID
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const chatEndRef = useRef(null);

  // 🆕 Load Sessions list on mount
  useEffect(() => {
    loadSessions();
  },[]);

  const loadSessions = () => {
    api.get('/chat/sessions').then(res => {
        setSessions(res.data);
        // Automatically open the most recent chat if one exists
        if (res.data.length > 0 && !currentSessionId) {
            setCurrentSessionId(res.data[0].session_id);
        }
    });
  };

  // 🆕 Load History whenever the currentSessionId changes
  useEffect(() => {
    if (currentSessionId) {
        api.get(`/chat/history?session_id=${currentSessionId}`).then(res => {
            // Group user and bot messages dynamically
            const formattedHistory = res.data.reduce((acc, m) => {
                if (m.message) acc.push({ role: 'user', content: m.message });
                if (m.response) acc.push({ role: 'bot', content: m.response, risk: m.risk, explainability: m.explainability, needs_map: m.needs_map, audioBase64: m.audio_base64 });
                return acc;
            },[]);
            setMessages(formattedHistory);
        });
    } else {
        setMessages([]); // Clear chat if new session
    }
  }, [currentSessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const playUserAudio = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  // 🆕 Start New Chat
  const startNewChat = () => {
      setCurrentSessionId(null);
      setMessages([]);
  };

  const handleSend = async (text, audioBlob = null, imageFile = null) => {
    if (!text && !audioBlob && !imageFile) return;
    setLoading(true);
    
    const userDisplayMsg = text || (audioBlob ? '🎙️ Voice Message' : '📷 Image Uploaded');
    setMessages(prev => [...prev, { role: 'user', content: userDisplayMsg }]);
    setInput('');

    const formData = new FormData();
    formData.append('language', language);
    if (text) formData.append('message', text);
    if (audioBlob) formData.append('audio', audioBlob, 'voice.webm');
    if (imageFile) formData.append('image', imageFile);
    if (currentSessionId) formData.append('session_id', currentSessionId); // 🆕 Attach session

    try {
      const { data } = await api.post('/chat/', formData);
      
      // 🆕 If it was a new chat, update session state and refresh sidebar
      if (!currentSessionId) {
          setCurrentSessionId(data.session_id);
          loadSessions(); 
      }

      setMessages(prev =>[...prev, {
        role: 'bot',
        content: data.response,
        risk: data.risk_level,
        explainability: data.explainability,
        needs_map: data.needs_map,
        audioBase64: data.audio_base64
      }]);

      if (data.audio_base64) {
          const snd = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
          snd.play().catch(e => console.log("Autoplay blocked"));
      }
    } catch (e) {
      alert('Error fetching response');
    }
    setLoading(false);
  };

  const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) handleSend(null, null, file);
  };

  const handleLogout = () => {
      localStorage.removeItem('token');
      navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      
      {/* 🆕 UPGRADED SIDEBAR */}
      <div className="w-72 bg-gray-900 text-white flex flex-col hidden md:flex shadow-xl z-10">
        <div className="p-4 flex justify-between items-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Health AI</h1>
            <button onClick={() => navigate('/profile')} className="p-2 hover:bg-gray-800 rounded-full transition"><User size={20}/></button>
        </div>
        
        {/* NEW CHAT BUTTON */}
        <div className="px-4 pb-4 border-b border-gray-800">
            <button onClick={startNewChat} className="w-full flex items-center justify-start gap-3 bg-gray-800 hover:bg-blue-600 border border-gray-700 hover:border-blue-500 p-3 rounded-lg font-medium transition duration-200">
                <Plus size={20} /> New Chat
            </button>
        </div>

        {/* SESSION LIST */}
        <div className="p-3 flex-1 overflow-y-auto space-y-1">
            <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3 px-1 mt-2">Recent Chats</h3>
            {sessions.map(session => (
                <button 
                    key={session.session_id} 
                    onClick={() => setCurrentSessionId(session.session_id)}
                    className={`w-full text-left flex items-center gap-3 p-3 text-sm rounded-lg transition duration-200 ${currentSessionId === session.session_id ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'}`}
                >
                    <MessageSquare size={16} className={currentSessionId === session.session_id ? 'text-white' : 'text-gray-500'} />
                    <span className="truncate">{session.title}</span>
                </button>
            ))}
        </div>

        <div className="p-4 border-t border-gray-800">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-gray-400 hover:bg-red-500/10 hover:text-red-500 p-3 rounded-lg text-sm font-semibold transition">
                <LogOut size={18} /> Logout
            </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <header className="bg-white p-4 shadow-sm flex justify-between items-center md:hidden border-b z-10">
            <h1 className="font-bold text-blue-600">Health AI</h1>
            <div className="flex gap-3">
                <button onClick={startNewChat} className="text-blue-600"><Plus size={24}/></button>
                <button onClick={() => navigate('/profile')}><User size={20}/></button>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-gray-50">
          
          {/* Welcome Screen for Empty Chat */}
          {messages.length === 0 && !loading && (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center px-4">
                 <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6"><MessageSquare size={40}/></div>
                 <h2 className="text-2xl font-bold text-gray-700 mb-2">How can I help you today?</h2>
                 <p className="max-w-md text-sm">Upload images of skin issues, share your medical reports, or just ask any health-related questions. Your medical context is saved to personalize my advice.</p>
             </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl w-full p-5 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm ml-8' : 'bg-white text-gray-800 border rounded-tl-sm mr-8'}`}>
                
                {msg.role === 'user' && (
                    <button onClick={() => playUserAudio(msg.content)} className="float-right ml-3 p-1 bg-blue-700/50 rounded hover:bg-blue-800 transition">
                        <Volume2 size={16}/>
                    </button>
                )}

                <p className="whitespace-pre-wrap leading-relaxed text-md">{msg.content}</p>
                
                {msg.role === 'bot' && (
                  <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
                     {msg.risk && msg.risk !== 'LOW' && (
                        <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full w-fit ${msg.risk === 'HIGH' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}>
                          <AlertTriangle size={14}/> {msg.risk} RISK
                        </div>
                     )}
                     
                     {msg.explainability && <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded"><b>Reasoning:</b> {msg.explainability}</p>}
                     
                     {msg.audioBase64 && (
                       <div className="pt-1">
                           <audio controls src={`data:audio/mp3;base64,${msg.audioBase64}`} className="h-10 w-full rounded outline-none" />
                       </div>
                     )}

                     {msg.needs_map && <MapWidget />}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
             <div className="flex justify-start">
                 <div className="bg-white border text-gray-500 p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                     <span className="animate-pulse">●</span><span className="animate-pulse delay-100">●</span><span className="animate-pulse delay-200">●</span>
                     <span className="text-sm ml-2">Analyzing data...</span>
                 </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </main>

        <footer className="p-4 bg-white border-t border-gray-200 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-4 mb-3 items-center text-gray-500 text-sm px-2">
              <select value={language} onChange={e => setLanguage(e.target.value)} className="bg-gray-100 hover:bg-gray-200 transition border-transparent font-medium py-1.5 px-3 rounded-lg outline-none cursor-pointer">
                {['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi'].map(l => <option key={l}>{l}</option>)}
              </select>
              
              <label className="cursor-pointer hover:text-blue-600 flex items-center gap-1.5 bg-gray-50 hover:bg-blue-50 py-1.5 px-3 rounded-lg transition">
                <ImageIcon size={18} /> Skin Image
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>

              <label className="cursor-pointer hover:text-blue-600 flex items-center gap-1.5 bg-gray-50 hover:bg-blue-50 py-1.5 px-3 rounded-lg transition">
                <Paperclip size={18} /> Upload Report
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => {/* Report Logic */}} />
              </label>
            </div>

            <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent transition-all shadow-inner">
              <input 
                type="text" 
                className="flex-1 px-4 py-3 bg-transparent text-gray-800 outline-none placeholder-gray-400"
                placeholder={`Type your medical issue in ${language}...`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend(input)}
              />
              <button className={`p-3 rounded-xl transition shadow-sm ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-gray-600 hover:text-blue-600 border'}`}>
                <Mic size={22} />
              </button>
              <button onClick={() => handleSend(input)} className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md transition">
                <Send size={22} />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}