import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Mic, Send, Paperclip, AlertTriangle, User,
  LogOut, Image as ImageIcon, Plus, MessageSquare,
  FileText, X, StopCircle
} from 'lucide-react';
import MapWidget from '../components/MapWidget';

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages]                 = useState([]);
  const [sessions, setSessions]                 = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [input, setInput]                       = useState('');
  const [language, setLanguage]                 = useState('English');
  const [loading, setLoading]                   = useState(false);

  // ── Voice recording ────────────────────────────────────────
  const [isRecording, setIsRecording]     = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef  = useRef(null);
  const audioChunksRef    = useRef([]);
  const recordingTimerRef = useRef(null);

  // ── Pending attachments (shown as previews before sending) ─
  const [pendingImage,  setPendingImage]  = useState(null); // { file, previewUrl }
  const [pendingReport, setPendingReport] = useState(null); // { file, name }

  const chatEndRef    = useRef(null);
  const imageInputRef  = useRef(null);
  const reportInputRef = useRef(null);

  // ── Load sessions on mount ─────────────────────────────────
  useEffect(() => { loadSessions(); }, []);

  const loadSessions = () => {
    api.get('/chat/sessions')
      .then(res => {
        setSessions(res.data);
        if (res.data.length > 0 && !currentSessionId) {
          setCurrentSessionId(res.data[0].session_id);
        }
      })
      .catch(() => {});
  };

  // ── Load history when session changes ─────────────────────
  useEffect(() => {
    if (currentSessionId) {
      api.get(`/chat/history?session_id=${currentSessionId}`)
        .then(res => {
          const formatted = res.data.reduce((acc, m) => {
            if (m.message)  acc.push({ role: 'user', content: m.message });
            if (m.response) acc.push({
              role: 'bot',
              content:       m.response,
              risk:          m.risk,
              explainability: m.explainability,
              needs_map:     m.needs_map,
              image_type:    m.image_type,
              audioBase64:   m.audio_base64,
            });
            return acc;
          }, []);
          setMessages(formatted);
        })
        .catch(() => {});
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
    };
  }, []);

  // ════════════════════════════════════════════════════════════
  // VOICE — start recording
  // ════════════════════════════════════════════════════════════
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current   = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop()); // release mic
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        clearInterval(recordingTimerRef.current);
        setRecordingTime(0);
        setIsRecording(false);
        if (audioBlob.size > 0) sendMessage({ audioBlob });
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 59) { stopRecording(); return 0; }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Mic error:', err);
      alert('Microphone access denied. Please allow microphone permissions in your browser settings and try again.');
    }
  };

  // ════════════════════════════════════════════════════════════
  // VOICE — stop recording
  // ════════════════════════════════════════════════════════════
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // triggers onstop → sendMessage
    }
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  // ════════════════════════════════════════════════════════════
  // FILE PICKERS
  // ════════════════════════════════════════════════════════════
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingImage({ file, previewUrl: URL.createObjectURL(file) });
    e.target.value = '';
  };

  const handleReportSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingReport({ file, name: file.name });
    e.target.value = '';
  };

  // ════════════════════════════════════════════════════════════
  // MAIN SEND
  // ════════════════════════════════════════════════════════════
  const sendMessage = async ({ text, audioBlob } = {}) => {
    const finalText   = text ?? (input.trim() || null);
    const finalImage  = pendingImage?.file  ?? null;
    const finalReport = pendingReport?.file ?? null;
    const finalAudio  = audioBlob ?? null;

    if (!finalText && !finalAudio && !finalImage && !finalReport) return;

    // Clear pending attachments and input immediately
    setPendingImage(null);
    setPendingReport(null);
    setInput('');
    setLoading(true);

    // Build display message
    const parts = [];
    if (finalText)   parts.push(finalText);
    if (finalAudio)  parts.push('🎙️ Voice message');
    if (finalImage)  parts.push(`📷 ${finalImage.name}`);
    if (finalReport) parts.push(`📄 ${finalReport.name}`);
    setMessages(prev => [...prev, { role: 'user', content: parts.join(' · ') }]);

    // Build FormData
    const formData = new FormData();
    formData.append('language', language);
    if (finalText)         formData.append('message', finalText);
    if (currentSessionId)  formData.append('session_id', currentSessionId);
    if (finalAudio) {
      const ext = finalAudio.type.includes('ogg') ? 'ogg' : 'webm';
      formData.append('audio', finalAudio, `voice.${ext}`);
    }
    if (finalImage)  formData.append('image',  finalImage);
    if (finalReport) formData.append('report', finalReport); // separate field

    try {
      const { data } = await api.post('/chat/', formData);

      if (!currentSessionId && data.session_id) {
        setCurrentSessionId(data.session_id);
        loadSessions();
      }

      setMessages(prev => [...prev, {
        role:           'bot',
        content:        data.response,
        risk:           data.risk_level,
        explainability: data.explainability,
        needs_map:      data.needs_map,
        image_type:     data.image_type,
        audioBase64:    data.audio_base64,
      }]);

      if (data.audio_base64) {
        const snd = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
        snd.play().catch(() => {});
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        role: 'bot',
        content: '⚠️ Sorry, something went wrong. Please try again.',
        risk: 'LOW',
      }]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage({ text: input.trim() });
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setPendingImage(null);
    setPendingReport(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  // Image type badges
  const imageTypeBadge = {
    SKIN_DISEASE:  { label: '🔬 Skin Analysis',    cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    LAB_REPORT:    { label: '🧪 Lab Report',        cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    XRAY_SCAN:     { label: '🩻 Scan Analysis',     cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    PRESCRIPTION:  { label: '💊 Prescription',      cls: 'bg-green-50 text-green-700 border-green-200' },
    OTHER_MEDICAL: { label: '📋 Medical Document',  cls: 'bg-gray-50 text-gray-700 border-gray-200' },
    PDF_REPORT:    { label: '📄 Report Analysis',   cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  };

  return (
    <div className="flex h-screen bg-gray-100">

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <div className="w-72 bg-gray-900 text-white flex-col hidden md:flex shadow-xl z-10">
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
            Health AI
          </h1>
          <button onClick={() => navigate('/profile')} className="p-2 hover:bg-gray-800 rounded-full transition">
            <User size={20} />
          </button>
        </div>

        <div className="px-4 pb-4 border-b border-gray-800">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-start gap-3 bg-gray-800 hover:bg-blue-600 border border-gray-700 hover:border-blue-500 p-3 rounded-lg font-medium transition duration-200"
          >
            <Plus size={20} /> New Chat
          </button>
        </div>

        <div className="p-3 flex-1 overflow-y-auto space-y-1">
          <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3 px-1 mt-2">
            Recent Chats
          </h3>
          {sessions.map(session => (
            <button
              key={session.session_id}
              onClick={() => setCurrentSessionId(session.session_id)}
              className={`w-full text-left flex items-center gap-3 p-3 text-sm rounded-lg transition duration-200 ${
                currentSessionId === session.session_id
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <MessageSquare size={16} className={currentSessionId === session.session_id ? 'text-white' : 'text-gray-500'} />
              <span className="truncate">{session.title}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-gray-400 hover:bg-red-500/10 hover:text-red-500 p-3 rounded-lg text-sm font-semibold transition"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      {/* ── MAIN AREA ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile header */}
        <header className="bg-white p-4 shadow-sm flex justify-between items-center md:hidden border-b z-10">
          <h1 className="font-bold text-blue-600">Health AI</h1>
          <div className="flex gap-3">
            <button onClick={startNewChat} className="text-blue-600"><Plus size={24} /></button>
            <button onClick={() => navigate('/profile')}><User size={20} /></button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-gray-50">

          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center px-4 py-20">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                <MessageSquare size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">How can I help you today?</h2>
              <p className="max-w-md text-sm">
                Upload skin images, medical reports, ask by voice, or type your health question.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-sm">
                {[
                  { icon: '📷', text: 'Upload skin image' },
                  { icon: '📄', text: 'Analyze a report' },
                  { icon: '🎙️', text: 'Ask by voice' },
                  { icon: '💬', text: 'Type a question' },
                ].map((s, i) => (
                  <div key={i} className="bg-white border rounded-xl p-3 text-sm text-gray-600 flex items-center gap-2 shadow-sm">
                    <span className="text-xl">{s.icon}</span> {s.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl w-full p-5 rounded-2xl shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm ml-8'
                  : 'bg-white text-gray-800 border rounded-tl-sm mr-8'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                {msg.role === 'bot' && (
                  <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">

                    {/* Image/report type badge */}
                    {msg.image_type && msg.image_type !== 'NONE' && imageTypeBadge[msg.image_type] && (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border ${imageTypeBadge[msg.image_type].cls}`}>
                        {imageTypeBadge[msg.image_type].label}
                      </span>
                    )}

                    {/* Risk badge */}
                    {msg.risk && msg.risk !== 'LOW' && (
                      <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full w-fit ${
                        msg.risk === 'HIGH'
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                      }`}>
                        <AlertTriangle size={14} /> {msg.risk} RISK
                      </div>
                    )}

                    {msg.explainability && (
                      <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <b>Reasoning:</b> {msg.explainability}
                      </p>
                    )}

                    {msg.audioBase64 && (
                      <audio
                        controls
                        src={`data:audio/mp3;base64,${msg.audioBase64}`}
                        className="h-10 w-full rounded outline-none"
                      />
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
                <span className="animate-pulse">●</span>
                <span className="animate-pulse delay-100">●</span>
                <span className="animate-pulse delay-200">●</span>
                <span className="text-sm ml-2">Analyzing…</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </main>

        {/* ── FOOTER ──────────────────────────────────────────── */}
        <footer className="p-4 bg-white border-t border-gray-200 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="max-w-4xl mx-auto space-y-3">

            {/* Attachment previews */}
            {(pendingImage || pendingReport) && (
              <div className="flex flex-wrap gap-2 px-1">
                {pendingImage && (
                  <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm text-purple-700">
                    <img src={pendingImage.previewUrl} alt="preview" className="w-8 h-8 object-cover rounded" />
                    <span className="max-w-[140px] truncate">{pendingImage.file.name}</span>
                    <button onClick={() => setPendingImage(null)} className="ml-1 hover:text-purple-900">
                      <X size={14} />
                    </button>
                  </div>
                )}
                {pendingReport && (
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700">
                    <FileText size={16} />
                    <span className="max-w-[160px] truncate">{pendingReport.name}</span>
                    <button onClick={() => setPendingReport(null)} className="ml-1 hover:text-orange-900">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center text-gray-500 text-sm px-1">
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="bg-gray-100 hover:bg-gray-200 transition border-transparent font-medium py-1.5 px-3 rounded-lg outline-none cursor-pointer"
              >
                {['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi'].map(l => (
                  <option key={l}>{l}</option>
                ))}
              </select>

              <label className="cursor-pointer hover:text-blue-600 flex items-center gap-1.5 bg-gray-50 hover:bg-blue-50 py-1.5 px-3 rounded-lg transition">
                <ImageIcon size={18} /> Skin Image
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </label>

              <label className="cursor-pointer hover:text-blue-600 flex items-center gap-1.5 bg-gray-50 hover:bg-blue-50 py-1.5 px-3 rounded-lg transition">
                <Paperclip size={18} /> Upload Report
                <input ref={reportInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleReportSelect} />
              </label>
            </div>

            {/* Recording indicator */}
            {isRecording && (
              <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                Recording… {recordingTime}s
                <span className="text-xs text-red-400 ml-auto">Tap mic again to stop · max 60s</span>
              </div>
            )}

            {/* Input row */}
            <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-400 transition-all shadow-inner">
              <input
                type="text"
                className="flex-1 px-4 py-3 bg-transparent text-gray-800 outline-none placeholder-gray-400"
                placeholder={isRecording ? 'Recording… tap mic to stop' : `Type your medical issue in ${language}…`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isRecording}
              />
              <button
                onClick={toggleRecording}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
                className={`p-3 rounded-xl transition shadow-sm ${
                  isRecording
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-gray-600 hover:text-blue-600 border'
                }`}
              >
                {isRecording ? <StopCircle size={22} /> : <Mic size={22} />}
              </button>
              <button
                onClick={() => sendMessage({ text: input.trim() })}
                disabled={loading || isRecording}
                className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md transition disabled:opacity-50"
              >
                <Send size={22} />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
