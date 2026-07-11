import React, { useState, useEffect } from 'react';
import { peerAPI, userAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function PeerEvalSetup() {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ name:'', section:'', member_ids:[] });
  const [results, setResults] = useState([]);
  const [tab, setTab] = useState('groups');
  
  // Track which evaluator cards are expanded/opened
  const [expandedEvaluators, setExpandedEvaluators] = useState({});

  useEffect(() => {
    peerAPI.getGroups().then(r => setGroups(r.data.groups)).catch(() => {});
    userAPI.getStudents().then(r => setStudents(r.data.students)).catch(() => {});
    peerAPI.getResults().then(r => setResults(r.data.results)).catch(() => {});
  }, []);

  const createGroup = async () => {
    if (!form.name || !form.member_ids.length) { 
      toast.error('Enter group name and select members'); 
      return; 
    }
    try {
      await peerAPI.createGroup(form);
      toast.success('Group created!');
      setForm({ name:'', section:'', member_ids:[] });
      peerAPI.getGroups().then(r => setGroups(r.data.groups));
    } catch { 
      toast.error('Failed to create group'); 
    }
  };

  const deleteGroup = async id => {
    if (!window.confirm('Delete this group?')) return;
    try {
      await peerAPI.deleteGroup(id);
      toast.success('Group deleted');
      setGroups(prev => prev.filter(g => g.id !== id));
    } catch {
      toast.error('Failed to delete group');
    }
  };

  const toggleMember = id => {
    setForm(p => ({
      ...p,
      member_ids: p.member_ids.includes(id) ? p.member_ids.filter(x => x !== id) : [...p.member_ids, id]
    }));
  };

  const toggleEvaluatorAccordion = (evaluatorName) => {
    setExpandedEvaluators(prev => ({
      ...prev,
      [evaluatorName]: !prev[evaluatorName]
    }));
  };

  // Group the flat evaluation results array by evaluator_name
  const groupedResults = results.reduce((acc, current) => {
    const key = current.evaluator_name || 'Unknown Evaluator';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(current);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="page-title">Peer Evaluation</h1>
      <p className="page-sub">Create groups · Assign members · View evaluation results</p>
      
      <div className="tab-row">
        {['groups', 'results'].map(t => (
          <button 
            key={t} 
            className={`tab-btn ${tab === t ? 'active' : ''}`} 
            onClick={() => setTab(t)}
          >
            {t === 'groups' ? '👥 Manage Groups' : 'Evaluation Results'}
          </button>
        ))}
      </div>

      {tab === 'groups' && (
        <div className="grid2">
          <div className="card">
            <div className="card-title">➕ Create Group</div>
            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input 
                className="form-input" 
                placeholder="e.g. Group 1 – Premiere Pro" 
                value={form.name} 
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Select Members</label>
              <div style={{ border: '1px solid var(--cream)', borderRadius: 8, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                {students.map(s => (
                  <div 
                    key={s.id} 
                    onClick={() => toggleMember(s.id)} 
                    style={{ 
                      padding: '8px 12px', 
                      cursor: 'pointer', 
                      background: form.member_ids.includes(s.id) ? 'rgba(95,51,51,0.08)' : 'transparent', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      borderBottom: '1px solid var(--cream)' 
                    }}
                  >
                    <div style={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: 3, 
                      border: '1.5px solid var(--wine)', 
                      background: form.member_ids.includes(s.id) ? 'var(--wine)' : 'transparent', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: 10, 
                      color: '#fff' 
                    }}>
                      {form.member_ids.includes(s.id) ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text)' }}>
                      {s.name} <span style={{ color: 'var(--muted)' }}>(Sec {s.section})</span>
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {form.member_ids.length} selected
              </div>
            </div>
            <div className="btn-row">
              <button className="btn btn-wine" onClick={createGroup}>+ Create Group</button>
            </div>
          </div>

          <div>
            {groups.map(g => (
              <div key={g.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div className="card-title" style={{ marginBottom: 0 }}>👥 {g.name}</div>
                  <button onClick={() => deleteGroup(g.id)} className="btn btn-danger" style={{ fontSize: 10, padding: '4px 10px' }}>Delete</button>
                </div>
                {g.members?.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--cream)' }}>
                    <div style={{ 
                      width: 28, 
                      height: 28, 
                      borderRadius: '50%', 
                      background: 'var(--wine)', 
                      color: '#f5f2ed', 
                      fontSize: 10, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 700 
                    }}>
                      {m.name ? m.name.split(' ').map(x => x).join('').slice(0, 2) : '??'}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text)' }}>{m.name}</span>
                    <span className="badge badge-wine" style={{ marginLeft: 'auto' }}>Sec {m.section}</span>
                  </div>
                ))}
              </div>
            ))}
            {!groups.length && (
              <div className="card" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                No groups yet.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'results' && (
  <div>
    <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>
      Evaluations by Student
    </div>
    
    {Object.keys(groupedResults).length ? (
      Object.entries(groupedResults).map(([evaluatorName, evaluations]) => {
        const isExpanded = !!expandedEvaluators[evaluatorName];
        return (
          <div 
            key={evaluatorName} 
            className="card" 
            style={{ 
              marginBottom: '12px', 
              padding: '16px', 
              border: '1px solid var(--cream)',
              borderRadius: '8px'
            }}
          >
            {/* Card Header acts as an interactive button */}
            <div 
              onClick={() => toggleEvaluatorAccordion(evaluatorName)} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  background: 'var(--wine)', 
                  color: '#f5f2ed', 
                  fontSize: '11px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 700 
                }}>
                  {evaluatorName.split(' ').map(x => x[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{evaluatorName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Submitted {evaluations.length} evaluation(s)</div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--wine)', fontWeight: 'bold' }}>
                {isExpanded ? '▲ Hide Details' : '▼ View Details'}
              </div>
            </div>

            {/* Expanded Dropdown Table Container */}
            {isExpanded && (
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--cream)', paddingTop: '12px' }}>
                <div className="table-wrap">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--cream)' }}>
                        <th style={{ padding: '8px 4px', fontSize: '12px' }}>Evaluatee</th>
                        <th style={{ padding: '8px 4px', fontSize: '12px' }}>Group</th>
                        <th style={{ padding: '8px 4px', fontSize: '12px' }}>Rating</th>
                        <th style={{ padding: '8px 4px', fontSize: '12px' }}>Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluations.map((r, i) => (
                        <tr key={i} style={{ borderBottom: i !== evaluations.length - 1 ? '1px solid var(--cream)' : 'none' }}>
                          <td style={{ padding: '10px 4px', fontSize: '13px', fontWeight: 500, color: 'var(--wine)' }}>
                            {r.evaluatee_name}
                          </td>
                          <td style={{ padding: '10px 4px' }}>
                            <span className="badge badge-wine" style={{ fontSize: '10px' }}>{r.group_name}</span>
                          </td>
                          <td style={{ padding: '10px 4px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#c8973a' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                          </td>
                          <td style={{ padding: '10px 4px', fontSize: '12px', color: 'var(--muted)', maxWidth: '250px', wordBreak: 'break-word' }}>
                            {r.comment || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })
    ) : (
      <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No evaluations submitted yet.</p>
      </div>
    )}
  </div>
      )}</div>
)
}
