import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../components/Toast';
import {
  Mic, Send, Paperclip, AlertTriangle, User,
  LogOut, Image as ImageIcon, Plus, MessageSquare,
  FileText, X, Square, Pause, Play, RotateCcw,
} from 'lucide-react';
import MapWidget from '../components/MapWidget';

// ─────────────────────────────────────────────────────────────
// Rich message content types
// ─────────────────────────────────────────────────────────────
const MSG_TYPE = {
  TEXT:  'text',
  IMAGE: 'image',   // { url, name }
  PDF:   'pdf',     // { name }
  VOICE: 'voice',   // { blobUrl }
};

export default function Chat() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [messages, setMessages]                 = useState([]);
  const [sessions, setSessions]                 = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [input, setInput]                       = useState('');
  const [language, setLanguage]                 = useState('English');
  const [loading, setLoading]                   = useState(false);

  // ── Voice recording state ───────────────────────────────────
  const [recState, setRecState]       = useState('idle'); // 'idle' | 'recording' | 'paused'
  const [recordingTime, setRecordingTime] = useState(0);
  const [pendingAudioBlob, setPendingAudioBlob] = useState(null);
  const [pendingAudioUrl,  setPendingAudioUrl]  = useState(null);

  const mediaRecorderRef  = useRef(null);
  const audioChunksRef    = useRef([]);
  const streamRef         = useRef(null);
  const recordingTimerRef = useRef(null);

  // ── Pending attachments ─────────────────────────────────────
  const [pendingImage,  setPendingImage]  = useState(null); // { file, previewUrl, name }
  const [pendingReport, setPendingReport] = useState(null); // { file, name }

  const chatEndRef     = useRef(null);
  const imageInputRef  = useRef(null);
  const reportInputRef = useRef(null);

  // ── Load sessions ───────────────────────────────────────────
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

  // ── Load history when session changes ──────────────────────
  useEffect(() => {
    if (!currentSessionId) { setMessages([]); return; }
    api.get(`/chat/history?session_id=${currentSessionId}`)
      .then(res => {
        const formatted = res.data.reduce((acc, m) => {
          if (m.message) {
            acc.push({
              role: 'user',
              parts: [{ type: MSG_TYPE.TEXT, text: m.message }],
            });
          }
          if (m.response) {
            acc.push({
              role: 'bot',
              parts: [{ type: MSG_TYPE.TEXT, text: m.response }],
              risk:          m.risk,
              explainability: m.explainability,
              needs_map:     m.needs_map,
              image_type:    m.image_type,
              audioBase64:   m.audio_base64,
            });
          }
          return acc;
        }, []);
        setMessages(formatted);
      })
      .catch(() => {});
  }, [currentSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(recordingTimerRef.current);
      stopStreamTracks();
    };
  }, []);

  // ════════════════════════════════════════════════════════════
  // VOICE RECORDING — fully controlled
  // ════════════════════════════════════════════════════════════
  const stopStreamTracks = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startTimer = () => {
    clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 59) { stopRecording(); return 0; }
        return prev + 1;
      });
    }, 1000);
  };

  const pauseTimer = () => clearInterval(recordingTimerRef.current);

  // Start fresh recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm' : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current   = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start(250);
      setRecState('recording');
      setRecordingTime(0);
      startTimer();
    } catch {
      toast('Microphone access denied. Please allow mic permissions and try again.', 'error');
    }
  };

  // Pause recording (not stop — mic keeps running)
  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecState('paused');
      pauseTimer();
    }
  };

  // Resume paused recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecState('recording');
      startTimer();
    }
  };

  // Stop and KEEP the audio (will be shown as preview, not auto-sent)
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    pauseTimer();

    mediaRecorderRef.current.onstop = () => {
      stopStreamTracks();
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      if (blob.size > 0) {
        setPendingAudioBlob(blob);
        setPendingAudioUrl(URL.createObjectURL(blob));
      }
      setRecState('idle');
      setRecordingTime(0);
    };

    mediaRecorderRef.current.stop();
  }, []);

  // RESET — discard recording, restart clean
  const resetRecording = () => {
    // If currently recording/paused, stop and discard
    if (mediaRecorderRef.current && ['recording', 'paused'].includes(mediaRecorderRef.current.state)) {
      mediaRecorderRef.current.onstop = () => {
        stopStreamTracks();
        // Discard all chunks — do NOT set pendingAudio
        audioChunksRef.current = [];
        setRecState('idle');
        setRecordingTime(0);
        toast('Recording discarded.', 'info');
      };
      mediaRecorderRef.current.stop();
    }
    // Also clear any already-stopped pending audio
    if (pendingAudioBlob) {
      URL.revokeObjectURL(pendingAudioUrl);
      setPendingAudioBlob(null);
      setPendingAudioUrl(null);
      toast('Voice note removed.', 'info');
    }
    pauseTimer();
  };

  // ════════════════════════════════════════════════════════════
  // FILE PICKERS
  // ════════════════════════════════════════════════════════════
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingImage({ file, previewUrl: URL.createObjectURL(file), name: file.name });
    e.target.value = '';
  };

  const handleReportSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingReport({ file, name: file.name });
    e.target.value = '';
    // PDF notice
    if (file.name.toLowerCase().endsWith('.pdf')) {
      toast('PDF selected — will be analyzed via page preview.', 'info');
    }
  };

  // ════════════════════════════════════════════════════════════
  // MAIN SEND
  // ════════════════════════════════════════════════════════════
  const sendMessage = async () => {
    const finalText   = input.trim() || null;
    const finalImage  = pendingImage?.file  ?? null;
    const finalReport = pendingReport?.file ?? null;
    const finalAudio  = pendingAudioBlob    ?? null;

    if (!finalText && !finalAudio && !finalImage && !finalReport) return;

    // Build rich user message parts
    const userParts = [];
    if (finalText)   userParts.push({ type: MSG_TYPE.TEXT,  text: finalText });
    if (finalAudio)  userParts.push({ type: MSG_TYPE.VOICE, blobUrl: pendingAudioUrl });
    if (finalImage)  userParts.push({ type: MSG_TYPE.IMAGE, url: pendingImage.previewUrl, name: pendingImage.name });
    if (finalReport) userParts.push({ type: MSG_TYPE.PDF,   name: pendingReport.name });

    // Clear inputs immediately
    setInput('');
    setPendingImage(null);
    setPendingReport(null);
    setPendingAudioBlob(null);
    setPendingAudioUrl(null);

    setMessages(prev => [...prev, { role: 'user', parts: userParts }]);
    setLoading(true);

    // Build FormData
    const formData = new FormData();
    formData.append('language', language);
    if (finalText)        formData.append('message', finalText);
    if (currentSessionId) formData.append('session_id', currentSessionId);
    if (finalAudio) {
      const ext = finalAudio.type.includes('ogg') ? 'ogg' : 'webm';
      formData.append('audio', finalAudio, `voice.${ext}`);
    }
    if (finalImage)  formData.append('image',  finalImage);
    if (finalReport) formData.append('report', finalReport);

    try {
      const { data } = await api.post('/chat/', formData);

      if (!currentSessionId && data.session_id) {
        setCurrentSessionId(data.session_id);
        loadSessions();
      }

      setMessages(prev => [...prev, {
        role: 'bot',
        parts: [{ type: MSG_TYPE.TEXT, text: data.response }],
        risk:           data.risk_level,
        explainability: data.explainability,
        needs_map:      data.needs_map,
        image_type:     data.image_type,
        audioBase64:    data.audio_base64,
        userLocation:   data.user_location,  // ✅ Pass location from backend
      }]);

      if (data.audio_base64) {
        const snd = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
        snd.play().catch(() => {});
      }

      if (data.risk_level === 'HIGH') {
        toast('⚠️ High risk detected — please consult a doctor immediately.', 'error');
      } else if (data.risk_level === 'MEDIUM') {
        toast('⚠️ Medium risk detected — monitor symptoms closely.', 'info');
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errMsg = err?.response?.status === 401
        ? 'Session expired. Please log in again.'
        : '⚠️ Something went wrong. Please try again.';
      toast(errMsg, 'error');
      if (err?.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
      setMessages(prev => [...prev, {
        role: 'bot',
        parts: [{ type: MSG_TYPE.TEXT, text: '⚠️ Sorry, something went wrong. Please try again.' }],
        risk: 'LOW',
      }]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setPendingImage(null);
    setPendingReport(null);
    resetRecording();
  };

  // ── Proper logout: call backend then clear token ────────────
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('token');
    toast('Logged out successfully.', 'success');
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

  const isActiveRecording = recState === 'recording' || recState === 'paused';

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
              <div className={`max-w-2xl w-full p-4 rounded-2xl shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm ml-8'
                  : 'bg-white text-gray-800 border rounded-tl-sm mr-8'
              }`}>

                {/* ── Rich content parts ── */}
                <div className="space-y-2">
                  {msg.parts.map((part, pi) => (
                    <RichPart key={pi} part={part} isUser={msg.role === 'user'} />
                  ))}
                </div>

                {/* ── Bot extras ── */}
                {msg.role === 'bot' && (
                  <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">

                    {msg.image_type && msg.image_type !== 'NONE' && imageTypeBadge[msg.image_type] && (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border ${imageTypeBadge[msg.image_type].cls}`}>
                        {imageTypeBadge[msg.image_type].label}
                      </span>
                    )}

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

                    {msg.needs_map && <MapWidget userLocation={msg.userLocation} />}
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

            {/* ── Attachment + voice previews ── */}
            {(pendingImage || pendingReport || pendingAudioUrl) && (
              <div className="flex flex-wrap gap-2 px-1">

                {/* Image preview */}
                {pendingImage && (
                  <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm text-purple-700">
                    <img src={pendingImage.previewUrl} alt="preview" className="w-10 h-10 object-cover rounded" />
                    <span className="max-w-[140px] truncate">{pendingImage.name}</span>
                    <button onClick={() => setPendingImage(null)} className="ml-1 hover:text-purple-900">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* PDF preview */}
                {pendingReport && (
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700">
                    <div className="w-10 h-10 bg-orange-100 rounded flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-orange-600" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="max-w-[160px] truncate font-medium">{pendingReport.name}</span>
                      <span className="text-xs text-orange-500">PDF Report</span>
                    </div>
                    <button onClick={() => setPendingReport(null)} className="ml-1 hover:text-orange-900">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Voice note preview */}
                {pendingAudioUrl && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mic size={14} className="text-red-600" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <audio controls src={pendingAudioUrl} className="h-8 max-w-[180px]" />
                      <span className="text-xs text-red-500 mt-0.5">Voice note ready</span>
                    </div>
                    <button onClick={resetRecording} className="ml-1 hover:text-red-900" title="Remove voice note">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Toolbar ── */}
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

            {/* ── Recording controls (shown when active) ── */}
            {isActiveRecording && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                <span className={`w-2.5 h-2.5 rounded-full bg-red-500 ${recState === 'recording' ? 'animate-pulse' : 'opacity-50'}`} />
                <span>
                  {recState === 'paused' ? 'Paused' : 'Recording…'} {recordingTime}s
                </span>
                <span className="text-xs text-red-400 ml-auto">max 60s</span>

                {/* Pause / Resume */}
                <button
                  onClick={recState === 'recording' ? pauseRecording : resumeRecording}
                  title={recState === 'recording' ? 'Pause' : 'Resume'}
                  className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 transition"
                >
                  {recState === 'recording'
                    ? <Pause size={16} />
                    : <Play size={16} />
                  }
                </button>

                {/* Stop and keep */}
                <button
                  onClick={stopRecording}
                  title="Stop & keep recording"
                  className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 transition"
                >
                  <Square size={16} />
                </button>

                {/* Reset / discard */}
                <button
                  onClick={resetRecording}
                  title="Discard this recording"
                  className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 transition text-red-600"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            )}

            {/* ── Input row ── */}
            <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-400 transition-all shadow-inner">
              <input
                type="text"
                className="flex-1 px-4 py-3 bg-transparent text-gray-800 outline-none placeholder-gray-400"
                placeholder={
                  isActiveRecording
                    ? recState === 'paused' ? 'Recording paused…' : 'Recording… pause or stop when done'
                    : `Type your medical issue in ${language}…`
                }
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isActiveRecording}
              />

              {/* Mic button — starts recording, not a toggle-send */}
              <button
                onClick={isActiveRecording ? stopRecording : startRecording}
                title={isActiveRecording ? 'Stop recording' : 'Start voice input'}
                className={`p-3 rounded-xl transition shadow-sm ${
                  recState === 'recording'
                    ? 'bg-red-500 text-white'
                    : recState === 'paused'
                    ? 'bg-yellow-400 text-white'
                    : 'bg-white text-gray-600 hover:text-blue-600 border'
                }`}
              >
                <Mic size={22} />
              </button>

              <button
                onClick={sendMessage}
                disabled={loading || isActiveRecording}
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


// ─────────────────────────────────────────────────────────────
// RichPart — renders each content type in a chat bubble
// ─────────────────────────────────────────────────────────────
function RichPart({ part, isUser }) {
  switch (part.type) {
    case MSG_TYPE.TEXT:
      return (
        <p className="whitespace-pre-wrap leading-relaxed">{part.text}</p>
      );

    case MSG_TYPE.IMAGE:
      return (
        <div className="space-y-1">
          <img
            src={part.url}
            alt={part.name}
            className="max-w-xs max-h-56 rounded-xl object-cover border border-white/20 shadow"
          />
          <p className={`text-xs ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
            📷 {part.name}
          </p>
        </div>
      );

    case MSG_TYPE.PDF:
      return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl w-fit ${
          isUser ? 'bg-blue-500/40 text-blue-100' : 'bg-orange-50 text-orange-700 border border-orange-100'
        }`}>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            isUser ? 'bg-blue-400/40' : 'bg-orange-100'
          }`}>
            <FileText size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium max-w-[200px] truncate">{part.name}</span>
            <span className={`text-xs ${isUser ? 'text-blue-300' : 'text-orange-400'}`}>PDF Report</span>
          </div>
        </div>
      );

    case MSG_TYPE.VOICE:
      return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl w-fit ${
          isUser ? 'bg-blue-500/40 text-blue-100' : 'bg-gray-100 text-gray-600'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-blue-400/40' : 'bg-gray-200'
          }`}>
            <Mic size={14} />
          </div>
          <div className="flex flex-col gap-1">
            <audio controls src={part.blobUrl} className="h-8 max-w-[200px]" />
            <span className={`text-xs ${isUser ? 'text-blue-300' : 'text-gray-400'}`}>Voice message</span>
          </div>
        </div>
      );

    default:
      return null;
  }
}
