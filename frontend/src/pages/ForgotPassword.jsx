import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
      toast.success('Reset link sent!');
    } catch (err) { toast.error(err.response?.data?.message || 'Not found'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:360 }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:20, color:'var(--wine)' }}>Forgot Password</h1>
          <p style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Enter your Gmail to receive a reset link</p>
        </div>
        <div style={{ background:'var(--wine)', borderRadius:16, padding:28 }}>
          {sent ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📧</div>
              <p style={{ color:'var(--cream)', fontSize:13, marginBottom:16 }}>Reset link sent to <strong>{email}</strong>. Check your inbox.</p>
              <Link to="/login" style={{ color:'var(--cream)', fontSize:12 }}>← Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3 style={{ fontFamily:'Playfair Display,serif', color:'#f5f2ed', fontSize:18, marginBottom:16 }}>Reset Password</h3>
              <input style={{ width:'100%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#f5f2ed', padding:'10px 14px', borderRadius:9, fontSize:13, fontFamily:'DM Sans,sans-serif', outline:'none', marginBottom:14 }}
                type="email" placeholder="yourname@gmail.com" value={email} onChange={e => setEmail(e.target.value)} required />
              <button type="submit" disabled={loading} style={{ width:'100%', background:'var(--cream)', color:'var(--wine)', padding:11, border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <div style={{ textAlign:'center', marginTop:10 }}>
                <Link to="/login" style={{ color:'var(--cream)', fontSize:12 }}>← Back to Login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
