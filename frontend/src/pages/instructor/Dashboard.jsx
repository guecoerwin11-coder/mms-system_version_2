import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userAPI, quizAPI, activityAPI } from '../../services/api';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    userAPI.getStudents().then(r => setStudents(r.data.students)).catch(() => {});
    activityAPI.getSubmissions().then(r => setSubmissions(r.data.submissions)).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="page-title">Welcome, {user.name}</h1>
      <p className="page-sub">{new Date().toDateString()} · College of Computer Studies</p>
      <div className="grid4" style={{ marginBottom:20 }}>
        <div className="stat-card"><div className="stat-label">Total Students</div><div className="stat-value">{students.length}</div><div className="stat-sub">3 sections</div></div>
        <div className="stat-card"><div className="stat-label">Active Chapters</div><div className="stat-value">6</div><div className="stat-sub">All published</div></div>
        <div className="stat-card"><div className="stat-label">Submissions</div><div className="stat-value">{submissions.length}</div><div className="stat-sub">Needs grading</div></div>
        <div className="stat-card"><div className="stat-label">Groups</div><div className="stat-value">0</div><div className="stat-sub">Peer eval active</div></div>
      </div>
      <div className="grid2">
        <div className="card">
          <div className="card-title">Student Progress</div>
          {students.slice(0,6).map(s => (
            <div key={s.id} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                <span>{s.name}</span>
                <span style={{ color:'var(--wine)', fontWeight:600 }}>{s.avg_score || 0}%</span>
              </div>
              <div className="progress-wrap">
                <div className="progress-fill" style={{ width:(s.avg_score||0)+'%' }} /> 
              </div>
            </div>
          ))}
          <div className="btn-row"><button className="btn btn-wine" onClick={() => navigate('/instructor/students')}>View All Students</button></div>
        </div>
        <div className="card">
          <div className="card-title">Recent Submissions</div>
          {submissions.slice(0,5).map(s => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid var(--cream)' }}>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:'var(--wine)' }}>{s.student_name}</div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>{s.title} · {s.submitted_at?.slice(0,10)}</div>
              </div>
              <span className={`badge ${s.score ? 'badge-green' : 'badge-amber'}`}>{s.score ? 'Graded: '+s.score : 'Pending'}</span>
            </div>
          ))}
          {!submissions.length && <p style={{ color:'var(--muted)', fontSize:13 }}>No submissions yet.</p>}
          <div className="btn-row"><button className="btn btn-outline" onClick={() => navigate('/instructor/students')}>Manage Students</button></div>
        </div>
      </div>
    </div>
  );
}
