import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';



export default function LoginPage() {
  const [role,     setRole]     = useState('instructor');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();


  const mmsLogo = "/mms-logo.png";

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role !== role) { toast.error(`This account is a ${user.role} account`); setLoading(false); return; }
      toast.success(`Welcome, ${user.name}!`);
      navigate(user.role === 'instructor' ? '/instructor' : '/student');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:'360px' }}>
        
        {/* NEW IMAGE LOGO CONTAINER */}
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ 
            width: 150, 
            height: 150, 
            margin: '0 auto 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img 
              src={mmsLogo} 
              alt="MMS Web-Based Guide Logo" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                borderRadius: '50%' 
              }} 
            />
          </div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'20px', color:'var(--wine)', marginBottom:'4px' }}>MMS: A Web-Based Guide</h1>
          <p style={{ fontSize:'11px', color:'var(--muted)' }}>In Learning Video Editing · CCS–DCT</p>
        </div>

        {/* Role tabs */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
          {['instructor','student'].map(r => (
            <button key={r} onClick={() => setRole(r)} style={{
              flex:1, padding:'8px', borderRadius:'8px', cursor:'pointer',
              border: role===r ? 'none' : '2px solid var(--cream)',
              background: role===r ? 'var(--wine)' : 'transparent',
              color: role===r ? '#f5f2ed' : 'var(--muted)',
              fontFamily:'DM Sans,sans-serif', fontSize:'13px', textTransform:'capitalize'
            }}>
              {r}
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{ background:'var(--wine)', borderRadius:'16px', padding:'28px' }}>
          <h3 style={{ fontFamily:'Playfair Display,serif', color:'#f5f2ed', fontSize:'18px', marginBottom:'18px' }}>Log In</h3>
          <form onSubmit={handleSubmit}>
            <input
              style={{ width:'100%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#f5f2ed', padding:'10px 14px', borderRadius:'9px', fontSize:'13px', fontFamily:'DM Sans,sans-serif', outline:'none', marginBottom:'12px' }}
              type="email" placeholder={role==='instructor' ? 'instructor@ccs.edu' : 'student@ccs.edu'} autoComplete="username"
              value={email} onChange={e => setEmail(e.target.value)}
            />
            <input
              style={{ width:'100%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#f5f2ed', padding:'10px 14px', borderRadius:'9px', fontSize:'13px', fontFamily:'DM Sans,sans-serif', outline:'none', marginBottom:'14px' }}
              type="password" placeholder="Password" autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
            />
            <button type="submit" disabled={loading} style={{ width:'100%', background:'var(--cream)', color:'var(--wine)', padding:'11px', border:'none', borderRadius:'9px', fontSize:'14px', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans,sans-serif', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div style={{ textAlign:'right', marginTop:'10px' }}>
            <Link to="/forgot-password" style={{ color:'var(--cream)', fontSize:'12px' }}>Forgot Password?</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
