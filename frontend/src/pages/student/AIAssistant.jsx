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
    content: 'Hello! I\'m your AI assistant for MMS: Video Editing. I can help with OBS Studio, DaVinci Resolve, color grading, export settings, pre-production planning, and all things video editing. What would you like to learn?'
  }]);
  const [input,   setInput]   = useState('');
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
      // Extract custom error message sent by your backend API response
      const serverErrorMessage = err.response?.data?.message;
      const isRateLimited = err.response?.status === 429;

      if (isRateLimited && serverErrorMessage) {
        toast.error(serverErrorMessage);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: serverErrorMessage 
        }]);
      } else {
        // Fallback for real network failures or server crashes
        toast.error('AI is unavailable. Try again.');
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I\'m having trouble connecting. Please try again.' 
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
    <div>
      <h1 className="page-title">AI Assistant</h1>
      <p className="page-sub">Powered by AI · Video editing topics only (pre-production to post-production)</p>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--cream)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#3d6b4a' }}></div>
            <span style={{ fontSize:'12px', fontWeight:'500', color:'var(--wine)' }}>MMS AI Assistant</span>
            <span className="badge badge-wine">Video Editing Only</span>
          </div>
          <button className="btn btn-outline" style={{ fontSize:'11px', padding:'4px 10px' }} onClick={clearChat}>Clear</button>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg-wrap ${m.role === 'user' ? 'user' : ''}`}>
              {m.role === 'assistant' && <div className="msg-name">MMS AI</div>}
              <div className={`msg-bubble ${m.role === 'user' ? 'user' : 'ai'}`}>{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="msg-wrap">
              <div className="msg-name">MMS AI</div>
              <div className="msg-bubble ai" style={{ color:'var(--muted)', fontStyle:'italic' }}>Thinking...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <input
            className="form-input"
            style={{ flex:1 }}
            placeholder="Ask about video editing..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={loading}
          />
          <button className="btn btn-wine" onClick={() => send()} disabled={loading || !input.trim()}>
            {loading ? <span className="spinner" /> : 'Send'}
          </button>
        </div>
      </div>

      {/* Quick asks */}
      <div style={{ marginTop:'12px' }}>
        <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'8px' }}>Suggested questions:</div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {QUICK_ASKS.map(q => (
            <button key={q} className="btn btn-outline" style={{ fontSize:'11px', padding:'5px 12px' }} onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
