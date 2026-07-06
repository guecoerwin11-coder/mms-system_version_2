// ForgotPassword.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
      toast.success('Reset link sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send reset email');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:'360px' }}>
        <div style={{ textAlign:'center', marginBottom:'24px' }}>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'20px', color:'var(--wine)' }}>Forgot Password</h1>
          <p style={{ fontSize:'12px', color:'var(--muted)', marginTop:'4px' }}>Enter your Gmail to receive a reset link</p>
        </div>
        <div style={{ background:'var(--wine)', borderRadius:'16px', padding:'28px' }}>
          {sent ? (
            <div style={{ textAlign:'center', color:'#f5f2ed' }}>
              <div style={{ fontSize:'36px', marginBottom:'10px' }}>✉️</div>
              <p style={{ fontSize:'13px' }}>Reset link sent to <b>{email}</b>. Check your inbox.</p>
              <Link to="/login" style={{ display:'inline-block', marginTop:'14px', color:'var(--cream)', fontSize:'12px' }}>← Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3 style={{ fontFamily:'Playfair Display,serif', color:'#f5f2ed', marginBottom:'16px' }}>Reset Password</h3>
              <input style={{ width:'100%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#f5f2ed', padding:'10px 14px', borderRadius:'9px', fontSize:'13px', fontFamily:'DM Sans,sans-serif', outline:'none', marginBottom:'14px' }}
                type="email" placeholder="yourname@gmail.com" value={email} onChange={e => setEmail(e.target.value)} required />
              <button type="submit" disabled={loading} style={{ width:'100%', background:'var(--cream)', color:'var(--wine)', padding:'11px', border:'none', borderRadius:'9px', fontSize:'14px', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <div style={{ textAlign:'right', marginTop:'10px' }}>
                <Link to="/login" style={{ color:'var(--cream)', fontSize:'12px' }}>← Back to Login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ResetPassword.js
import React2, { useState as useState2 } from 'react';
import { useParams, useNavigate as useNavigate2, Link as Link2 } from 'react-router-dom';
import { authAPI as authAPI2 } from '../services/api';
import toast2 from 'react-hot-toast';

export function ResetPassword() {
  const { token } = useParams();
  const navigate  = useNavigate2();
  const [newPassword, setNew] = useState2('');
  const [confirm, setConfirm] = useState2('');
  const [loading, setLoading] = useState2(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (newPassword !== confirm) { toast2.error('Passwords do not match'); return; }
    if (newPassword.length < 6)  { toast2.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await authAPI2.resetPassword({ token, newPassword });
      toast2.success('Password reset! Please log in.');
      navigate('/login');
    } catch (err) {
      toast2.error(err.response?.data?.message || 'Reset failed. Link may have expired.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:'360px' }}>
        <div style={{ textAlign:'center', marginBottom:'24px' }}>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'20px', color:'var(--wine)' }}>Set New Password</h1>
        </div>
        <div style={{ background:'var(--wine)', borderRadius:'16px', padding:'28px' }}>
          <form onSubmit={handleSubmit}>
            <h3 style={{ fontFamily:'Playfair Display,serif', color:'#f5f2ed', marginBottom:'16px' }}>New Password</h3>
            <input style={{ width:'100%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#f5f2ed', padding:'10px 14px', borderRadius:'9px', fontSize:'13px', fontFamily:'DM Sans,sans-serif', outline:'none', marginBottom:'10px' }}
              type="password" placeholder="New password" value={newPassword} onChange={e => setNew(e.target.value)} required />
            <input style={{ width:'100%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#f5f2ed', padding:'10px 14px', borderRadius:'9px', fontSize:'13px', fontFamily:'DM Sans,sans-serif', outline:'none', marginBottom:'14px' }}
              type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            <button type="submit" disabled={loading} style={{ width:'100%', background:'var(--cream)', color:'var(--wine)', padding:'11px', border:'none', borderRadius:'9px', fontSize:'14px', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
