import React, { useState, useEffect } from 'react';
import { peerAPI, userAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function PeerEvalSetup() {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ name:'', section:'', member_ids:[] });
  const [results, setResults] = useState([]);
  const [tab, setTab] = useState('groups');

  useEffect(() => {
    peerAPI.getGroups().then(r => setGroups(r.data.groups)).catch(() => {});
    userAPI.getStudents().then(r => setStudents(r.data.students)).catch(() => {});
    peerAPI.getResults().then(r => setResults(r.data.results)).catch(() => {});
  }, []);

  const createGroup = async () => {
    if (!form.name || !form.member_ids.length) { toast.error('Enter group name and select members'); return; }
    try {
      await peerAPI.createGroup(form);
      toast.success('Group created!');
      setForm({ name:'', section:'', member_ids:[] });
      peerAPI.getGroups().then(r => setGroups(r.data.groups));
    } catch { toast.error('Failed to create group'); }
  };

  const deleteGroup = async id => {
    if (!window.confirm('Delete this group?')) return;
    await peerAPI.deleteGroup(id);
    toast.success('Group deleted');
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  const toggleMember = id => {
    setForm(p => ({
      ...p,
      member_ids: p.member_ids.includes(id) ? p.member_ids.filter(x=>x!==id) : [...p.member_ids, id]
    }));
  };

  return (
    <div>
      <h1 className="page-title">Peer Evaluation</h1>
      <p className="page-sub">Create groups · Assign members · View evaluation results</p>
      <div className="tab-row">
        {['groups','results'].map(t => (
          <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={() => setTab(t)}>
            {t==='groups'?'👥 Manage Groups':'Evaluation Results'}
          </button>
        ))}
      </div>

      {tab==='groups' && (
        <div className="grid2">
          <div className="card">
            <div className="card-title">➕ Create Group</div>
            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input className="form-input" placeholder="e.g. Group 1 – Premiere Pro" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Select Members</label>
              <div style={{ border:'1px solid var(--cream)', borderRadius:8, overflow:'hidden', maxHeight:200, overflowY:'auto' }}>
                {students.map(s => (
                  <div key={s.id} onClick={() => toggleMember(s.id)} style={{ padding:'8px 12px', cursor:'pointer', background: form.member_ids.includes(s.id) ? 'rgba(95,51,51,0.08)' : 'transparent', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid var(--cream)' }}>
                    <div style={{ width:16, height:16, borderRadius:3, border:'1.5px solid var(--wine)', background: form.member_ids.includes(s.id) ? 'var(--wine)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff' }}>
                      {form.member_ids.includes(s.id) ? '✓' : ''}
                    </div>
                    <span style={{ fontSize:12, color:'var(--text)' }}>{s.name} <span style={{ color:'var(--muted)' }}>(Sec {s.section})</span></span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{form.member_ids.length} selected</div>
            </div>
            <div className="btn-row"><button className="btn btn-wine" onClick={createGroup}>+ Create Group</button></div>
          </div>
          <div>
            {groups.map(g => (
              <div key={g.id} className="card" style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div className="card-title" style={{ marginBottom:0 }}>👥 {g.name}</div>
                  <button onClick={() => deleteGroup(g.id)} className="btn btn-danger" style={{ fontSize:10, padding:'4px 10px' }}>Delete</button>
                </div>
                {g.members?.map(m => (
                  <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid var(--cream)' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--wine)', color:'#f5f2ed', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
                      {m.name.split(' ').map(x=>x[0]).join('').slice(0,2)}
                    </div>
                    <span style={{ fontSize:12, color:'var(--text)' }}>{m.name}</span>
                    <span className="badge badge-wine" style={{ marginLeft:'auto' }}>Sec {m.section}</span>
                  </div>
                ))}
              </div>
            ))}
            {!groups.length && <div className="card" style={{ textAlign:'center', color:'var(--muted)' }}>No groups yet.</div>}
          </div>
        </div>
      )}

      {tab==='results' && (
        <div className="card">
          <div className="card-title">Peer Evaluation Results</div>
          {results.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Evaluator</th><th>Evaluatee</th><th>Group</th><th>Rating</th><th>Comment</th></tr></thead>
                <tbody>
                  {results.map((r,i) => (
                    <tr key={i}>
                      <td>{r.evaluator_name}</td>
                      <td style={{ fontWeight:500, color:'var(--wine)' }}>{r.evaluatee_name}</td>
                      <td><span className="badge badge-wine">{r.group_name}</span></td>
                      <td><span style={{ color:'#c8973a' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span></td>
                      <td style={{ fontSize:11, color:'var(--muted)' }}>{r.comment || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p style={{ color:'var(--muted)', fontSize:13 }}>No evaluations submitted yet.</p>}
        </div>
      )}
    </div>
  );
}
