import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ newPassword:'', confirm:'' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, newPassword: form.newPassword });
      toast.success('Password reset! Please log in.');
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid or expired link'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:360 }}>
        <div style={{ background:'var(--wine)', borderRadius:16, padding:28 }}>
          <h3 style={{ fontFamily:'Playfair Display,serif', color:'#f5f2ed', fontSize:18, marginBottom:18 }}>Set New Password</h3>
          <form onSubmit={handleSubmit}>
            {[['New Password','newPassword'],['Confirm Password','confirm']].map(([label,key]) => (
              <div key={key} style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, color:'var(--cream)', marginBottom:4, letterSpacing:'0.5px' }}>{label.toUpperCase()}</div>
                <input style={{ width:'100%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#f5f2ed', padding:'10px 14px', borderRadius:9, fontSize:13, fontFamily:'DM Sans,sans-serif', outline:'none' }}
                  type="password" placeholder="••••••••" value={form[key]} onChange={e => setForm(p=>({...p,[key]:e.target.value}))} required />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{ width:'100%', background:'var(--cream)', color:'var(--wine)', padding:11, border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif', marginTop:6 }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
