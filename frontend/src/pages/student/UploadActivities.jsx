import React, { useState, useEffect } from 'react';
import { activityAPI, chapterAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function UploadActivities() {
  const [chapters, setChapters] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ chapter_id: '', title: '', notes: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    chapterAPI.getAll().then(r => setChapters(r.data.chapters)).catch(() => {});
    activityAPI.getSubmissions().then(r => setSubmissions(r.data.submissions)).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!file) { toast.error('Please choose a file'); return; }
    if (!form.chapter_id) { toast.error('Select a chapter'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('chapter_id', form.chapter_id);
    fd.append('title', form.title || file.name);
    fd.append('notes', form.notes);
    try {
      await activityAPI.submit(fd);
      toast.success('Activity submitted successfully!');
      setFile(null);
      setForm({ chapter_id:'', title:'', notes:'' });
      activityAPI.getSubmissions().then(r => setSubmissions(r.data.submissions)).catch(() => {});
    } catch { toast.error('Submission failed'); }
    finally { setUploading(false); }
  };

  return (
    <div>
      <h1 className="page-title">Upload Activities</h1>
      <p className="page-sub">Submit your completed work for each chapter</p>
      <div className="grid2">
        <div className="card">
          <div className="card-title">Submit Activity</div>
          <div className="form-group">
            <label className="form-label">Select Chapter</label>
            <select className="form-select" value={form.chapter_id} onChange={e => setForm(p => ({ ...p, chapter_id: e.target.value }))}>
              <option value="">Choose chapter...</option>
              {chapters.map(ch => <option key={ch.id} value={ch.id}>Chapter {ch.number}: {ch.title}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Title (optional)</label>
            <input className="form-input" placeholder="Activity title..." value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="upload-zone" style={{ marginBottom:12 }} onClick={() => document.getElementById('act-upload').click()}>
            {file ? (
              <div>
                <p style={{ color:'var(--wine)', fontWeight:500 }}>📎 {file.name}</p>
                <p className="limit">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <>
                <p>Click to choose your file</p>
                <p className="limit">PDF · DOCX · PPT · MP4 (max 500 MB)</p>
              </>
            )}
          </div>
          <input id="act-upload" type="file" style={{ display:'none' }} accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4" onChange={e => setFile(e.target.files[0])} />
          <div className="form-group">
            <label className="form-label">Notes to Instructor</label>
            <textarea className="form-textarea" placeholder="Optional note..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="btn-row">
            <button className="btn btn-wine" onClick={() => document.getElementById('act-upload').click()}>Choose File</button>
            <button className="btn btn-green" onClick={handleSubmit} disabled={uploading}>{uploading ? 'Submitting...' : 'Submit'}</button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Submission History</div>
          {submissions.length === 0
            ? <p style={{ color:'var(--muted)', fontSize:13 }}>No submissions yet.</p>
            : submissions.map(s => (
              <div key={s.id} style={{ padding:'10px 0', borderBottom:'1px solid var(--cream)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--wine)' }}>{s.title}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{s.chapter_title} · {s.submitted_at?.slice(0,10)}</div>
                    {s.feedback && <div style={{ fontSize:11, color:'var(--green)', marginTop:4 }}>Feedback: {s.feedback}</div>}
                  </div>
                  <span className={`badge ${s.score ? 'badge-green' : 'badge-gray'}`}>{s.score ? 'Score: '+s.score : 'Pending'}</span>
                </div>
                {s.score && (
                  <div className="progress-wrap" style={{ marginTop:6 }}>
                    <div className="progress-fill" style={{ width: s.score+'%', background:'var(--green)' }} />
                  </div>
                )}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
