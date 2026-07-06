import React, { useState, useEffect, useRef } from 'react';
import { chapterAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function LearningLessons() {
  const [chapters, setChapters] = useState([]);
  const [open, setOpen] = useState({});
  const [editing, setEditing] = useState({});
  const videoRefs = useRef({});

  useEffect(() => {
    chapterAPI.getAll().then(r => setChapters(r.data.chapters)).catch(() => toast.error('Failed to load chapters'));
  }, []);

  const toggle = id => setOpen(p => ({ ...p, [id]: !p[id] }));

  const saveChapter = async (ch) => {
    try {
      await chapterAPI.update(ch.id, { title: ch.title, description: ch.description, content: ch.content });
      toast.success('Chapter updated!');
      setEditing(p => ({ ...p, [ch.id]: false }));
    } catch { toast.error('Update failed'); }
  };

  const handleVideoUpload = async (chapterId, file) => {
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) { toast.error('Video must be under 500 MB'); return; }
    const fd = new FormData();
    fd.append('video', file);
    fd.append('chapter_id', chapterId);
    fd.append('title', file.name);
    toast('Uploading video... this may take a moment');
    try {
      await chapterAPI.uploadVideo(fd);
      toast.success('Video uploaded!');
      chapterAPI.getAll().then(r => setChapters(r.data.chapters));
    } catch { toast.error('Upload failed'); }
  };

  const deleteVideo = async (videoId) => {
    if (!window.confirm('Delete this video?')) return;
    try {
      await chapterAPI.deleteVideo(videoId);
      toast.success('Video deleted');
      chapterAPI.getAll().then(r => setChapters(r.data.chapters));
    } catch { toast.error('Delete failed'); }
  };


    const handleSlideUpload = async (chapterId, file) => {
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!['.ppt', '.pptx', '.pdf'].includes(ext)) {
      toast.error('Only PPT or PDF files allowed');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('chapter_id', chapterId);
    fd.append('title', file.name);
    toast('Uploading...');
    try {
      await chapterAPI.uploadSlide(fd);
      toast.success('File uploaded!');
      chapterAPI.getAll().then(r => setChapters(r.data.chapters));
    } catch {
      toast.error('Upload failed');
    }
  };

  const deleteSlide = async (slideId) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await chapterAPI.deleteSlide(slideId);
      toast.success('File deleted');
      chapterAPI.getAll().then(r => setChapters(r.data.chapters));
    } catch {
      toast.error('Delete failed');
    }
  };
  return (
    <div>
      <h1 className="page-title">Learning Lessons</h1>
      <p className="page-sub">6 chapters · Upload slides, content and video simulations</p>
      {chapters.map(ch => (
        <div key={ch.id} className="chapter-item">
          <div className="chapter-hdr" onClick={() => toggle(ch.id)}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="chapter-num">{ch.number}</div>
              <div>
                <div className="chapter-name">{ch.title}</div>
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>
                  {ch.slides?.length || 0} slides
                  {ch.videos?.length ? <span style={{ color:'var(--green)' }}> · {ch.videos.length} video(s)</span> : ' · No video'}
                </div>
              </div>
            </div>
            <span style={{ color:'var(--muted)', fontSize:11, transition:'transform 0.2s', display:'inline-block', transform: open[ch.id]?'rotate(180deg)':'none' }}>▼</span>
          </div>

          {open[ch.id] && (
            <div className="chapter-body open">
              <div className="grid2">
                <div>
                  <div className="card-title" style={{ fontSize:12 }}>Chapter Content</div>
                  {editing[ch.id] ? (
                    <>
                      <div className="form-group">
                        <label className="form-label">Title</label>
                        <input className="form-input" value={ch.title} onChange={e => setChapters(prev => prev.map(c => c.id===ch.id ? {...c, title: e.target.value} : c))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" value={ch.description||''} onChange={e => setChapters(prev => prev.map(c => c.id===ch.id ? {...c, description: e.target.value} : c))} />
                      </div>
                      <div className="btn-row">
                        <button className="btn btn-green" onClick={() => saveChapter(ch)}>Save</button>
                        <button className="btn btn-outline" onClick={() => setEditing(p=>({...p,[ch.id]:false}))}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7, marginBottom:12 }}>{ch.description}</p>

                      {ch.slides?.length > 0 && (
                        <div style={{ marginBottom:12 }}>
                          {ch.slides.map(s => (
                            <div key={s.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg)', borderRadius:8, padding:'8px 10px', marginBottom:6 }}>
                              <span style={{ fontSize:12 }}>{s.title}</span>
                              <div className="btn-row">
                                <a href={s.image_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize:10, textDecoration:'none' }}>View</a>
                                <button className="btn btn-danger" style={{ fontSize:10 }} onClick={() => deleteSlide(s.id)}>Delete</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="btn-row">
                        <button className="btn btn-outline" style={{ fontSize:11 }} onClick={() => setEditing(p=>({...p,[ch.id]:true}))}>Edit Content</button>
                        <button
                          className="btn btn-wine"
                          style={{ fontSize:11 }}
                          onClick={() => {
                            const i = document.createElement('input');
                            i.type = 'file';
                            i.accept = '.ppt,.pptx,.pdf';
                            i.onchange = e => { if (e.target.files[0]) handleSlideUpload(ch.id, e.target.files[0]); };
                            i.click();
                          }}
                        >
                          Upload PPT/PDF
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <div className="card-title" style={{ fontSize:12 }}>🎬 Video Simulation</div>
                  {ch.videos?.map(v => (
                    <div key={v.id} style={{ marginBottom:10 }}>
                      <div className="video-thumb" onClick={() => window.open(v.cloudinary_url,'_blank')}>
                        <div className="play-btn">▶</div>
                        <div className="video-title">{v.title}</div>
                      </div>
                      <div className="btn-row" style={{ marginTop:6 }}>
                        <a href={v.cloudinary_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize:10, textDecoration:'none' }}>View</a>
                        <button className="btn btn-danger" style={{ fontSize:10 }} onClick={() => deleteVideo(v.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                  <div className="upload-zone" onClick={() => { const i=document.createElement('input'); i.type='file'; i.accept='.mp4'; i.onchange=e=>handleVideoUpload(ch.id, e.target.files[0]); i.click(); }}>
                    <p>Upload MP4 Video</p>
                    <p className="limit">max 500 MB · Stored on Cloudinary</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
