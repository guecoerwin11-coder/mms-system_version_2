import React, { useState, useEffect } from 'react';
import { quizAPI, activityAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function CreateAssessment() {
  const [tab, setTab] = useState('quiz');
  const [questions, setQuestions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [form, setForm] = useState({ question:'', option_a:'', option_b:'', option_c:'', correct_option:'A', timer_seconds:30 });
  const [actFile, setActFile] = useState(null);
  const [actForm, setActForm] = useState({ chapter_id:'', title:'' });
  const [gradeForms, setGradeForms] = useState({});

  useEffect(() => {
    quizAPI.getQuestions().then(r => setQuestions(r.data.questions)).catch(() => {});
    activityAPI.getAll().then(r => setActivities(r.data.activities)).catch(() => {});
    activityAPI.getSubmissions().then(r => setSubmissions(r.data.submissions)).catch(() => {});
  }, []);

  const addQuestion = async () => {
    if (!form.question || !form.option_a || !form.option_b || !form.option_c) { toast.error('Fill all fields'); return; }
    try {
      await quizAPI.create(form);
      toast.success('Question added!');
      setForm({ question:'', option_a:'', option_b:'', option_c:'', correct_option:'A', timer_seconds:30 });
      quizAPI.getQuestions().then(r => setQuestions(r.data.questions));
    } catch { toast.error('Failed to add question'); }
  };

  const deleteQuestion = async id => {
    await quizAPI.remove(id);
    toast.success('Question deleted');
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const uploadActivity = async () => {
    if (!actFile) { toast.error('Choose a file'); return; }
    const fd = new FormData();
    fd.append('file', actFile);
    fd.append('chapter_id', actForm.chapter_id);
    fd.append('title', actForm.title || actFile.name);
    try {
      await activityAPI.upload(fd);
      toast.success('Activity file uploaded!');
      setActFile(null);
      activityAPI.getAll().then(r => setActivities(r.data.activities));
    } catch { toast.error('Upload failed'); }
  };

  const gradeSubmission = async (id) => {
    const g = gradeForms[id];
    if (!g?.score) { toast.error('Enter a score'); return; }
    try {
      await activityAPI.grade(id, { score: g.score, feedback: g.feedback });
      toast.success('Graded!');
      activityAPI.getSubmissions().then(r => setSubmissions(r.data.submissions));
    } catch { toast.error('Grade failed'); }
  };

  return (
    <div>
      <h1 className="page-title">Create Assessment</h1>
      <p className="page-sub">Build quizzes · Upload activity files · Grade submissions</p>
      <div className="tab-row">
        {['quiz','activity','submissions'].map(t => (
          <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={() => setTab(t)}>
            {t==='quiz'?' Quiz Builder':t==='activity'?' Activity Files':' Submissions'}
          </button>
        ))}
      </div>

      {tab==='quiz' && (
        <div className="grid2">
          <div className="card">
            <div className="card-title">➕ Add Question</div>
            <div className="form-group"><label className="form-label">Question</label><input className="form-input" placeholder="Type the question..." value={form.question} onChange={e => setForm(p=>({...p,question:e.target.value}))} /></div>
            {['option_a','option_b','option_c'].map((key,i) => (
              <div className="form-group" key={key}>
                <label className="form-label">Option {['A','B','C'][i]}</label>
                <input className="form-input" placeholder={'Answer '+['A','B','C'][i]} value={form[key]} onChange={e => setForm(p=>({...p,[key]:e.target.value}))} />
              </div>
            ))}
            <div className="form-row" style={{ marginBottom:12 }}>
              <div className="form-group">
                <label className="form-label">Correct Answer</label>
                <select className="form-select" value={form.correct_option} onChange={e => setForm(p=>({...p,correct_option:e.target.value}))}>
                  {['A','B','C'].map(o => <option key={o} value={o}>Option {o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Timer</label>
                <select className="form-select" value={form.timer_seconds} onChange={e => setForm(p=>({...p,timer_seconds:parseInt(e.target.value)}))}>
                  <option value={30}>30 sec</option>
                  <option value={45}>45 sec</option>
                  <option value={60}>60 sec</option>
                </select>
              </div>
            </div>
            <div className="btn-row">
              <button className="btn btn-wine" onClick={addQuestion}>+ Add Question</button>
              <button className="btn btn-green" onClick={() => toast.success('Quiz randomized & posted!')}>Randomize & Post</button>
            </div>
          </div>
          <div className="card">
            <div className="card-title"> Questions ({questions.length})</div>
            {questions.map((q,i) => (
              <div key={q.id} style={{ padding:'8px 0', borderBottom:'1px solid var(--cream)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--wine)' }}>Q{i+1}. {q.question}</div>
                    <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>Correct: {q.correct_option} · {q.timer_seconds}s</div>
                  </div>
                  <button onClick={() => deleteQuestion(q.id)} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:16 }}>×</button>
                </div>
              </div>
            ))}
            {!questions.length && <p style={{ color:'var(--muted)', fontSize:13 }}>No questions yet.</p>}
          </div>
        </div>
      )}

      {tab==='activity' && (
        <div className="grid2">
          <div className="card">
            <div className="card-title">📎 Upload Activity File</div>
            <div className="upload-zone" style={{ marginBottom:12 }} onClick={() => document.getElementById('act-file').click()}>
              {actFile ? <p style={{ color:'var(--wine)', fontWeight:500 }}>📎 {actFile.name}</p> : <><p>Click to upload instruction file</p><p className="limit">PDF · PPT · DOCX · DOC</p></>}
            </div>
            <input id="act-file" type="file" style={{ display:'none' }} accept=".pdf,.ppt,.pptx,.doc,.docx" onChange={e => setActFile(e.target.files[0])} />
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={actForm.title} placeholder="Activity title..." onChange={e => setActForm(p=>({...p,title:e.target.value}))} />
            </div>
            <div className="btn-row"><button className="btn btn-wine" onClick={uploadActivity}>Upload File</button></div>
          </div>
          <div className="card">
            <div className="card-title"> Uploaded Files ({activities.length})</div>
            {activities.map(a => (
              <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid var(--cream)' }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:'var(--wine)' }}>{a.title}</div>
                  <div style={{ fontSize:10, color:'var(--muted)' }}>{a.file_type?.toUpperCase()} · {a.created_at?.slice(0,10)}</div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <span className="badge badge-wine">{a.file_type?.toUpperCase()}</span>
                  <button onClick={() => activityAPI.remove(a.id).then(() => { toast.success('Deleted'); setActivities(p=>p.filter(x=>x.id!==a.id)); })} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer' }}>×</button>
                </div>
              </div>
            ))}
            {!activities.length && <p style={{ color:'var(--muted)', fontSize:13 }}>No files uploaded.</p>}
          </div>
        </div>
      )}

      {tab==='submissions' && (
        <div className="card">
          <div className="card-title">Student Submissions</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Activity</th><th>File</th><th>Submitted</th><th>Score</th><th>Grade</th></tr></thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight:500, color:'var(--wine)' }}>{s.student_name}</td>
                    <td>{s.title}</td>
                    <td><a href={s.cloudinary_url} target="_blank" rel="noreferrer" style={{ color:'var(--wine)', fontSize:11 }}>View File</a></td>
                    <td style={{ fontSize:11, color:'var(--muted)' }}>{s.submitted_at?.slice(0,10)}</td>
                    <td>{s.score ? <span className="badge badge-green">{s.score}</span> : <span className="badge badge-gray">Pending</span>}</td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <input type="number" min="0" max="100" placeholder="Score" style={{ width:60, border:'1px solid var(--cream)', borderRadius:6, padding:'3px 6px', fontSize:11 }}
                          value={gradeForms[s.id]?.score||''} onChange={e => setGradeForms(p=>({...p,[s.id]:{...p[s.id],score:e.target.value}}))} />
                        <button className="btn btn-wine" style={{ fontSize:10, padding:'4px 8px' }} onClick={() => gradeSubmission(s.id)}>Grade</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!submissions.length && <div style={{ padding:20, textAlign:'center', color:'var(--muted)', fontSize:13 }}>No submissions yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
