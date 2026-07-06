import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, authAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function InstructorProfile() {
  const { user, updateUser } = useAuth();
  
  
  const [form, setForm] = useState({ 
    name: user?.name || '', 
    department: user?.department || '' 
  });
  
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await userAPI.updateProfile(form);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch { 
      toast.error('Update failed'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleAvatar = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const { data } = await userAPI.uploadAvatar(fd);
      updateUser({ ...user, profile_pic: data.profile_pic });
      toast.success('Photo updated!');
    } catch { 
      toast.error('Upload failed'); 
    }
  };

  const handlePw = async () => {
    if (pwForm.newPassword !== pwForm.confirm) { 
      toast.error('Passwords do not match'); 
      return; 
    }
    setPwSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed'); 
    } finally { 
      setPwSaving(false); 
    }
  };

  return (
    <div>
      <h1 className="page-title">My Profile</h1>
      <p className="page-sub">Edit your information · Update photo · Change password</p>
      <div className="grid2">
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <label style={{ cursor: 'pointer' }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatar} />
              <div className="avatar-wrap" style={{ margin: '0 auto 8px' }}>
                {user?.profile_pic
                  ? <img src={user.profile_pic} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <svg viewBox="0 0 100 100"><circle cx="50" cy="38" r="22" fill="#856f6c" /><ellipse cx="50" cy="90" rx="34" ry="24" fill="#856f6c" /></svg>
                }
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Click to change photo</div>
            </label>
          </div>
          <div className="card-title">Basic Information</div>
          {[
            ['Full Name', 'name', 'text'],
            ['Department', 'department', 'text']
          ].map(([label, key, type]) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}</label>
              <input 
                className="form-input" 
                type={type} 
                value={form[key]} 
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} 
              />
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Email (read-only)</label>
            <input className="form-input" value={user?.email || ''} readOnly style={{ opacity: 0.6 }} />
          </div>
          <div className="btn-row">
            <button className="btn btn-wine" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Change Password</div>
          {[
            ['Current Password', 'currentPassword'],
            ['New Password', 'newPassword'],
            ['Confirm New Password', 'confirm']
          ].map(([label, key]) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}</label>
              <input className="form-input" type="password" value={pwForm[key]} onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))} placeholder="••••••••" />
            </div>
          ))}
          <div className="btn-row">
            <button className="btn btn-wine" onClick={handlePw} disabled={pwSaving}>
              {pwSaving ? 'Updating...' : 'Update Password'}
            </button>
            <button 
              className="btn btn-outline" 
              onClick={() => authAPI.forgotPassword({ email: user.email }).then(() => toast.success('Reset link sent!')).catch(() => toast.error('Error'))}
            >
              Reset via Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
