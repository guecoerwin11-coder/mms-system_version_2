import React, { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../../services/api';
import toast from 'react-hot-toast';

const QUICK_ASKS = [
  'How does color grading work in DaVinci Resolve?',
  'What are the best export settings for YouTube?',
  'How do I set up scenes in OBS Studio?',
  'What is a storyboard and why is it important?',
  'Explain the difference between H.264 and H.265',
  'How do I sync audio and video in editing?',
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hello! I'm your AI assistant for MMS: Video Editing. I can help with OBS Studio, DaVinci Resolve, color grading, export settings, pre-production planning, and all things video editing. What would you like to learn?"
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Load history
  useEffect(() => {
    aiAPI.getHistory().then(r => {
      if (r.data.history?.length) {
        setMessages(prev => [...prev, ...r.data.history]);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    
    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const { data } = await aiAPI.chat({ message: msg, history });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const serverErrorMessage = err.response?.data?.message;
      const isRateLimited = err.response?.status === 429;

      if (isRateLimited && serverErrorMessage) {
        toast.error(serverErrorMessage);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: serverErrorMessage 
        }]);
      } else {
        toast.error('AI is unavailable. Try again.');
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "Sorry, I'm having trouble connecting. Please try again." 
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    await aiAPI.clearHistory().catch(() => {});
    setMessages([{
      role: 'assistant',
      content: 'Chat cleared! Ask me anything about video editing.'
    }]);
    toast.success('Chat history cleared');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '10px' }}>
      <h1 className="page-title" style={{ fontSize: '26px', marginBottom: '6px' }}>AI Assistant</h1>
      <p className="page-sub" style={{ fontSize: '13px', marginBottom: '20px' }}>Powered by AI · Video editing topics only (pre-production to post-production)</p>

      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '600px', border: '1px solid var(--cream)', borderRadius: '12px', background: 'var(--card-bg, #fff)' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3d6b4a', boxShadow: '0 0 8px #3d6b4a' }}></div>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--wine)' }}>MMS AI Assistant</span>
            <span className="badge badge-wine" style={{ fontSize: '11px', padding: '3px 8px' }}>Video Editing Only</span>
          </div>
          <button className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px' }} onClick={clearChat}>Clear Chat</button>
        </div>

        {/* Messages Body */}
        <div className="chat-messages" style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(0,0,0,0.01)' }}>
          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', maxWidth: '85%', alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
                {!isUser && (
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--wine)', marginBottom: '4px', marginLeft: '4px' }}>
                    MMS AI
                  </span>
                )}
                <div 
                  style={{ 
                    padding: '12px 18px', 
                    borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px', 
                    background: isUser ? 'var(--wine)' : 'var(--cream, #f5f2ed)', 
                    color: isUser ? '#f5f2ed' : 'var(--text, #333)', 
                    fontSize: '14.5px', 
                    lineHeight: '1.5',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '85%', alignSelf: 'flex-start' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--wine)', marginBottom: '4px', marginLeft: '4px' }}>
                MMS AI
              </span>
              <div 
                style={{ 
                  padding: '12px 18px', 
                  borderRadius: '16px 16px 16px 2px', 
                  background: 'var(--cream, #f5f2ed)', 
                  color: 'var(--muted)', 
                  fontSize: '14px', 
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--cream)', background: 'rgba(255,255,255,0.03)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ flex: 1, padding: '12px 16px', fontSize: '14px', borderRadius: '8px', border: '1px solid var(--cream)', outline: 'none', background: 'var(--bg)' }}
            placeholder="Type your message about video editing here..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={loading}
          />
          <button 
            className="btn btn-wine" 
            style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600', borderRadius: '8px', height: '100%', minWidth: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            onClick={() => send()} 
            disabled={loading || !input.trim()}
          >
            {loading ? <span className="spinner" style={{ width: '16px', height: '16px' }} /> : 'Send'}
          </button>
        </div>
      </div>

      {/* Suggested Quick Asks Section */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: '500', marginBottom: '10px', marginLeft: '2px' }}>
          Suggested questions:
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {QUICK_ASKS.map(q => (
            <button 
              key={q} 
              className="btn btn-outline" 
              style={{ fontSize: '12.5px', padding: '8px 16px', borderRadius: '20px', background: 'transparent', transition: 'all 0.2s' }} 
              onClick={() => send(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
