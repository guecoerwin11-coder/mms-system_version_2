import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { chapterAPI, quizAPI } from '../../services/api';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    chapterAPI.getAll().then(r => setChapters(r.data.chapters)).catch(() => {});
    quizAPI.getAttempts(user.id).then(r => setAttempts(r.data.attempts)).catch(() => {});
    chapterAPI.getProgress(user.id).then(r => setProgress(r.data.percentage)).catch(() => {});
  }, [user.id]);

  const bestScore = attempts.length ? Math.max(...attempts.map(a => a.percentage || 0)) : 0;

  return (
    <div>
      <h1 className="page-title">Hello, {user.name}</h1>
      <p className="page-sub">{user.year} · Section {user.section} · {new Date().toDateString()}</p>
      <div className="grid4" style={{ marginBottom:'20px' }}>
        <div className="stat-card"><div className="stat-label">Best Score</div><div className="stat-value">{bestScore}%</div><div className="stat-sub">{attempts.length} attempts</div></div>
        <div className="stat-card"><div className="stat-label">Progress</div><div className="stat-value">{progress}%</div><div className="stat-sub">Chapters viewed</div></div>
        <div className="stat-card"><div className="stat-label">Chapters</div><div className="stat-value">6</div><div className="stat-sub">Available</div></div>
        <div className="stat-card"><div className="stat-label">Submissions</div><div className="stat-value">2</div><div className="stat-sub">1 graded</div></div>
      </div>
      <div className="grid2">
        <div className="card">
          <div className="card-title"> Continue Learning</div>
          {chapters.slice(0,4).map(ch => (
            <div key={ch.id} onClick={() => navigate('/student/lessons')} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom:'1px solid var(--cream)', cursor:'pointer' }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--wine)', color:'#f5f2ed', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, flexShrink:0 }}>Ch{ch.number}</div>
              <div>
                <div style={{ fontSize:'12px', fontWeight:500, color:'var(--wine)' }}>{ch.title}</div>
                <div style={{ fontSize:'10px', color:'var(--muted)' }}>{ch.slides?.length || 0} slides{ch.videos?.length ? ' · Video' : ''}</div>
              </div>
            </div>
          ))}
          <div className="btn-row"><button className="btn btn-wine" onClick={() => navigate('/student/lessons')}>Open Lessons</button></div>
        </div>
        <div className="card">
          <div className="card-title">Quick Actions</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {[
              { label:"Take Quiz",        path:'/student/assessment',      cls:'btn-wine' },
              { label:"AI Assistant",     path:'/student/ai',              cls:'btn-outline' },
              { label:"Peer Evaluation",  path:'/student/peer-evaluation', cls:'btn-outline' },
              { label:"Upload Activity",  path:'/student/upload',          cls:'btn-green' },
            ].map(a => (
              <button key={a.path} className={`btn ${a.cls}`} style={{ width:'100%', justifyContent:'flex-start' }} onClick={() => navigate(a.path)}>{a.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
