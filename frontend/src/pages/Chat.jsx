import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, MicOff, Send, Plus, Paperclip, Image as ImageIcon, FileText, MessageCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import MapWidget from '../components/MapWidget';
import Modal from '../components/Modal';
import '../styles/Chat.css';

// ─────────────────────────────────────────────────────────────
// Message Types
// ─────────────────────────────────────────────────────────────

const MSG_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  PDF: 'pdf',
  VOICE: 'voice',
};

// ─────────────────────────────────────────────────────────────
// Clean Markdown Function
// ─────────────────────────────────────────────────────────────

const cleanMarkdown = (text) => {
  if (!text) return '';
  
  // Remove markdown formatting
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')      // **bold** → bold
    .replace(/__(.+?)__/g, '$1')          // __italic__ → italic
    .replace(/\*(.+?)\*/g, '$1')          // *italic* → italic
    .replace(/`(.+?)`/g, '$1')            // `code` → code
    .replace(/^#+\s+/gm, '')              // # Heading → Heading
    .replace(/^\s*[-*]\s+/gm, '• ')       // - bullet → • bullet
    .replace(/^\s*\d+\.\s+/gm, '$1. ')    // 1. item → 1. item
    .replace(/^>\s+/gm, '')               // > quote → quote
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')   // [text](url) → text
    .replace(/!\[(.+?)\]\(.+?\)/g, '$1')  // ![alt](url) → alt
    .replace(/<[^>]+>/g, '')               // Remove HTML
    .trim();
};

// ─────────────────────────────────────────────────────────────
// Rich Text Part Component
// ─────────────────────────────────────────────────────────────

const RichPart = ({ part, onImageClick }) => {
  if (part.type === MSG_TYPE.TEXT) {
    return (
      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
        {part.text}
      </div>
    );
  }
  
  if (part.type === MSG_TYPE.IMAGE) {
    return (
      <div
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onImageClick(part)}
      >
        <img
          src={`data:${part.mime || 'image/jpeg'};base64,${part.data}`}
          alt={part.filename || 'Image'}
          className="max-w-xs rounded-lg shadow-md"
        />
        <p className="text-xs text-gray-600 mt-2">{part.filename}</p>
      </div>
    );
  }
  
  if (part.type === MSG_TYPE.PDF) {
    return (
      <div
        className="cursor-pointer inline-block bg-orange-50 border-2 border-orange-300 px-4 py-2 rounded-lg hover:bg-orange-100 transition"
        onClick={() => onImageClick(part)}
      >
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-orange-600" />
          <div>
            <p className="font-semibold text-orange-900">{part.filename}</p>
            <p className="text-xs text-orange-700">Click to view</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (part.type === MSG_TYPE.VOICE) {
    return (
      <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
        <MessageCircle size={18} className="text-blue-600" />
        <audio
          controls
          src={`data:audio/mp3;base64,${part.data}`}
          className="h-8 flex-1"
        />
      </div>
    );
  }
  
  return null;
};

// ─────────────────────────────────────────────────────────────
// Image Modal Component
// ─────────────────────────────────────────────────────────────

const ImageModal = ({ part, isOpen, onClose }) => {
  if (!isOpen || !part) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="max-w-2xl w-full">
        {part.type === MSG_TYPE.IMAGE && (
          <img
            src={`data:${part.mime || 'image/jpeg'};base64,${part.data}`}
            alt={part.filename}
            className="w-full rounded-lg"
          />
        )}
        {part.type === MSG_TYPE.PDF && (
          <div className="bg-gray-100 p-8 rounded-lg text-center">
            <FileText size={64} className="mx-auto text-orange-600 mb-4" />
            <p className="text-lg font-semibold">{part.filename}</p>
            <p className="text-gray-600 mt-2">PDF content displayed above</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Chat Component
// ─────────────────────────────────────────────────────────────

export default function Chat() {
  const navigate = useNavigate();
  const { sessionId: paramSessionId } = useParams();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(paramSessionId || null);
  const [loading, setLoading] = useState(false);
  
  // ✅ TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef(null);
  
  // ✅ Recording State
  const [recState, setRecState] = useState('idle');
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pendingAudioUrl, setPendingAudioUrl] = useState(null);
  
  // ✅ Media Upload State
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingReport, setPendingReport] = useState(null);
  
  // ✅ Modal State
  const [modalPart, setModalPart] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const messagesEndRef = useRef(null);

  // ─────────────────────────────────────────────────────────────
  // ✅ STOP TTS FUNCTION - Called on navigation, new message, etc
  // ─────────────────────────────────────────────────────────────
  
  const stopTTS = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  // ✅ Stop TTS when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      stopTTS();
    };
  }, []);

  // ✅ Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ─────────────────────────────────────────────────────────────
  // Fetch Chat History
  // ─────────────────────────────────────────────────────────────

  const fetchHistory = async (sid) => {
    try {
      const response = await api.get(`/chat/history`, { params: { session_id: sid } });
      const formattedMessages = response.data.map(msg => ({
        role: msg.response ? 'bot' : 'user',
        parts: [{ type: MSG_TYPE.TEXT, text: msg.response || msg.message }],
        risk: msg.risk,
        audioBase64: msg.audio_base64,
      }));
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast('Failed to load chat history', 'error');
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchHistory(sessionId);
    }
  }, [sessionId]);

  // ─────────────────────────────────────────────────────────────
  // Voice Recording Functions
  // ─────────────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      recorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorderRef.current.start();
      
      setRecState('recording');
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 60) {
            stopRecording();
            toast('Maximum recording time (60s) reached', 'info');
            return t;
          }
          return t + 1;
        });
      }, 1000);
      
      toast('Recording started', 'info');
    } catch (error) {
      toast('Microphone permission denied', 'error');
      console.error('Recording error:', error);
    }
  };

  const pauseRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.pause();
      setRecState('paused');
      clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.resume();
      setRecState('recording');
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recState !== 'idle') {
      recorderRef.current.stop();
      clearInterval(timerRef.current);
      
      recorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setPendingAudioUrl(url);
        setRecState('idle');
      };
    }
  };

  const resetRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
    }
    setPendingAudioUrl(null);
    chunksRef.current = [];
    setRecState('idle');
    setRecordingTime(0);
    clearInterval(timerRef.current);
    toast('Recording discarded', 'info');
  };

  // ─────────────────────────────────────────────────────────────
  // ✅ HANDLE NEW MESSAGE - STOP TTS
  // ─────────────────────────────────────────────────────────────

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim() && !pendingImage && !pendingReport && !pendingAudioUrl) {
      toast('Please enter a message or upload an image/file', 'warning');
      return;
    }

    // ✅ STOP TTS BEFORE SENDING NEW MESSAGE
    stopTTS();

    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('message', input);
      formData.append('session_id', sessionId || 'null');
      
      if (pendingImage) {
        formData.append('image', pendingImage);
      }
      if (pendingReport) {
        formData.append('report', pendingReport);
      }
      if (pendingAudioUrl) {
        const response = await fetch(pendingAudioUrl);
        const blob = await response.blob();
        formData.append('audio', blob, 'voice.webm');
      }

      const response = await api.post('/chat/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!sessionId) {
        setSessionId(response.data.session_id);
      }

      // ✅ CLEAN RESPONSE TEXT - Remove markdown
      const cleanedResponse = cleanMarkdown(response.data.response);

      setMessages(prev => [
        ...prev,
        { role: 'user', parts: [{ type: MSG_TYPE.TEXT, text: input }] },
        {
          role: 'bot',
          parts: [{ type: MSG_TYPE.TEXT, text: cleanedResponse }],
          risk: response.data.risk_level,
          audioBase64: response.data.audio_base64,
          userLocation: response.data.user_location,
          needsMap: response.data.needs_map,
        }
      ]);

      setInput('');
      setPendingImage(null);
      setPendingReport(null);
      setPendingAudioUrl(null);
      
      toast('Message sent successfully', 'success');
    } catch (error) {
      toast(error.message || 'Failed to send message', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    // ✅ STOP TTS BEFORE NEW CHAT
    stopTTS();
    
    setMessages([]);
    setSessionId(null);
    setInput('');
  };

  const handleLogout = () => {
    // ✅ STOP TTS BEFORE LOGOUT
    stopTTS();
    
    try {
      api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    navigate('/login');
  };

  // ─────────────────────────────────────────────────────────────
  // ✅ TTS CONTROLS
  // ─────────────────────────────────────────────────────────────

  const handlePlayAudio = (audioBase64) => {
    if (!audioBase64) return;

    if (audioRef.current) {
      if (isSpeaking && !isPaused) {
        // Pause
        audioRef.current.pause();
        setIsPaused(true);
      } else if (isSpeaking && isPaused) {
        // Resume
        audioRef.current.play();
        setIsPaused(false);
      } else {
        // Play new
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = `data:audio/mp3;base64,${audioBase64}`;
        audioRef.current.play();
        setIsSpeaking(true);
        setIsPaused(false);
      }
    }
  };

  const handleStopAudio = () => {
    stopTTS();
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Hidden audio element for TTS playback */}
      <audio 
        ref={audioRef}
        onEnded={() => {
          setIsSpeaking(false);
          setIsPaused(false);
        }}
      />

      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Chat sessions would go here */}
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">Medical AI Assistant</h1>
          <p className="text-sm text-gray-600">Session: {sessionId?.slice(0, 8)}...</p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
                <p>No messages yet. Start a conversation!</p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-lg px-4 py-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                {msg.parts.map((part, pidx) => (
                  <div key={pidx}>
                    <RichPart 
                      part={part}
                      onImageClick={(p) => {
                        setModalPart(p);
                        setModalOpen(true);
                      }}
                    />
                  </div>
                ))}

                {msg.role === 'bot' && msg.audioBase64 && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handlePlayAudio(msg.audioBase64)}
                      className={`px-3 py-1 rounded text-sm font-medium transition ${
                        isSpeaking
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      {isSpeaking && !isPaused ? '⏸ Pause' : '▶ Speak'}
                    </button>
                    
                    {isSpeaking && (
                      <button
                        onClick={handleStopAudio}
                        className="px-3 py-1 rounded text-sm font-medium bg-gray-500 text-white hover:bg-gray-600 transition"
                      >
                        ⏹ Stop
                      </button>
                    )}
                  </div>
                )}

                {msg.needsMap && msg.userLocation && (
                  <div className="mt-4">
                    <MapWidget userLocation={msg.userLocation} />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="space-y-3">
            {/* Pending Media Preview */}
            {(pendingImage || pendingReport || pendingAudioUrl) && (
              <div className="flex gap-2 flex-wrap">
                {pendingImage && (
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(pendingImage)}
                      alt="preview"
                      className="h-16 w-16 rounded object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPendingImage(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                )}

                {pendingReport && (
                  <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded">
                    <FileText size={16} className="text-orange-600" />
                    <span className="text-sm">{pendingReport.name}</span>
                    <button
                      type="button"
                      onClick={() => setPendingReport(null)}
                      className="text-orange-600 font-bold"
                    >
                      ×
                    </button>
                  </div>
                )}

                {pendingAudioUrl && (
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded">
                    <Mic size={16} className="text-blue-600" />
                    <span className="text-sm">{recordingTime}s</span>
                    <button
                      type="button"
                      onClick={resetRecording}
                      className="text-blue-600 font-bold"
                    >
                      ↺
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Voice Recording Controls */}
            {recState !== 'idle' && (
              <div className="bg-red-50 border border-red-200 p-3 rounded flex items-center gap-3">
                <div className="animate-pulse">●</div>
                <span className="text-sm text-red-700">Recording… {recordingTime}s</span>
                
                <button
                  type="button"
                  onClick={recState === 'recording' ? pauseRecording : resumeRecording}
                  className="ml-auto px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                >
                  {recState === 'recording' ? '⏸ Pause' : '▶ Resume'}
                </button>
                
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                >
                  ■ Stop
                </button>
                
                <button
                  type="button"
                  onClick={resetRecording}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                  ↺ Reset
                </button>
              </div>
            )}

            {/* Input Controls */}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />

              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={(e) => setPendingImage(e.target.files?.[0])}
                hidden
              />
              <button
                type="button"
                onClick={() => document.getElementById('image-upload').click()}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                title="Upload image"
              >
                <ImageIcon size={20} />
              </button>

              <input
                type="file"
                id="report-upload"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setPendingReport(e.target.files?.[0])}
                hidden
              />
              <button
                type="button"
                onClick={() => document.getElementById('report-upload').click()}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                title="Upload report"
              >
                <FileText size={20} />
              </button>

              <button
                type="button"
                onClick={recState === 'idle' ? startRecording : stopRecording}
                className={`px-4 py-2 rounded-lg transition ${
                  recState === 'idle'
                    ? 'bg-gray-500 text-white hover:bg-gray-600'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title="Record voice"
              >
                {recState === 'idle' ? <Mic size={20} /> : <MicOff size={20} />}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        part={modalPart}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
