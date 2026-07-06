import React, { useState, useEffect } from 'react';
import { peerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const CRITERIA = ['Participation & Contribution','Quality of Work','Communication Skills','Teamwork & Cooperation','Punctuality & Responsibility'];

export default function PeerEvaluation() {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    peerAPI.getMyGroup().then(r => setGroup(r.data.group)).catch(() => {});
  }, []);

  const rate = (memberId, stars) => setRatings(p => ({ ...p, [memberId]: stars }));

  const handleSubmit = async () => {
    const peers = group?.members?.filter(m => m.id !== user.id) || [];
    if (peers.some(m => !ratings[m.id])) { toast.error('Please rate all members'); return; }
    const evaluations = peers.map(m => ({ evaluatee_id: m.id, group_id: group.id, rating: ratings[m.id], comment: comments[m.id] || '' }));
    try {
      await peerAPI.evaluate({ evaluations });
      setSubmitted(true);
      toast.success('Evaluation submitted! Thank you.');
    } catch { toast.error('Submission failed'); }
  };

  if (!group) return (
    <div>
      <h1 className="page-title">Peer Evaluation</h1>
      <div className="card" style={{ textAlign:'center', padding:40 }}>
        <p style={{ color:'var(--muted)', fontSize:14 }}>You have not been assigned to a group yet. Please check with your instructor.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div>
      <h1 className="page-title">Peer Evaluation</h1>
      <div className="card" style={{ textAlign:'center', padding:40 }}>
        <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
        <h3 style={{ color:'var(--wine)', marginBottom:8 }}>Evaluation Submitted!</h3>
        <p style={{ color:'var(--muted)', fontSize:13 }}>Thank you for evaluating your group members.</p>
      </div>
    </div>
  );

  const peers = group.members?.filter(m => m.id !== user.id) || [];

  return (
    <div>
      <h1 className="page-title">Peer Evaluation</h1>
      <p className="page-sub">Rate your group members honestly and fairly</p>
      <div className="grid2">
        <div>
          <div className="card" style={{ marginBottom:14 }}>
            <div className="card-title">👥 {group.name}</div>
            <p style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>Rate each teammate from 1–5 stars</p>
            {peers.map(m => (
              <div key={m.id} style={{ padding:'14px 0', borderBottom:'1px solid var(--cream)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--wine)', color:'#f5f2ed', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
                    {m.name.split(' ').map(x=>x[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--wine)' }}>{m.name}</div>
                    <div style={{ fontSize:10, color:'var(--muted)' }}>Section {m.section}</div>
                  </div>
                </div>
                <div className="stars" style={{ marginBottom:8 }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className={`star ${(ratings[m.id]||0) >= s ? 'lit' : ''}`} onClick={() => rate(m.id, s)}>★</span>
                  ))}
                  <span style={{ fontSize:11, color:'var(--muted)', marginLeft:6 }}>{ratings[m.id] ? ratings[m.id]+'/5' : 'Not rated'}</span>
                </div>
                <textarea
                  className="form-textarea"
                  style={{ height:55 }}
                  placeholder={'Optional comment about ' + m.name.split(' ')[0] + '...'}
                  value={comments[m.id] || ''}
                  onChange={e => setComments(p => ({ ...p, [m.id]: e.target.value }))}
                />
              </div>
            ))}
            <div className="btn-row" style={{ marginTop:14 }}>
              <button className="btn btn-wine" onClick={handleSubmit}>Submit Evaluation</button>
            </div>
          </div>
        </div>
        <div>
          <div className="card" style={{ marginBottom:14 }}>
            <div className="card-title">📊 Evaluation Criteria</div>
            {CRITERIA.map((c,i) => (
              <div key={i} style={{ padding:'8px 0', borderBottom:'1px solid var(--cream)', fontSize:12, color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ color:'var(--rose)', fontSize:14 }}>★</span>{c}
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title">👥 All Group Members</div>
            {group.members?.map(m => (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--cream)' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background: m.id===user.id ? 'var(--green)' : 'var(--wine)', color:'#f5f2ed', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
                  {m.name.split(' ').map(x=>x[0]).join('').slice(0,2)}
                </div>
                <div>
                  <div style={{ fontSize:12, color:'var(--wine)' }}>{m.name} {m.id===user.id ? '(You)':''}</div>
                  <div style={{ fontSize:10, color:'var(--muted)' }}>Section {m.section}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
