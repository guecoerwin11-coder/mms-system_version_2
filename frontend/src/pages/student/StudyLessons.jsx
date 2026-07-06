import React, { useState, useEffect, useRef } from 'react';
import { chapterAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function TheaterModal({ video, chapter, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!video) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 900,
          background: '#111', borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#1a1a1a',
          borderBottom: '1px solid #333',
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>
              CH {chapter?.number} {chapter?.title}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{video.title}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#888' }}>Press ESC to exit</span>
            <button
              onClick={onClose}
              style={{
                background: '#333', border: 'none', borderRadius: 6,
                color: '#fff', fontSize: 18, width: 32, height: 32,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >X</button>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', background: '#000', aspectRatio: '16/9' }}>
          <video
            src={video.cloudinary_url}
            controls
            autoPlay
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
          />
        </div>

        <div style={{
          padding: '10px 16px', background: '#1a1a1a',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <a
            href={video.cloudinary_url}
            download
            style={{
              fontSize: 11, padding: '6px 14px', borderRadius: 6,
              background: 'transparent', border: '1px solid #444',
              color: '#ccc', textDecoration: 'none',
            }}
          >
            Download
          </a>
          <button
            onClick={onClose}
            style={{
              fontSize: 11, padding: '6px 14px', borderRadius: 6,
              background: '#7a1c2e', border: 'none', color: '#fff', cursor: 'pointer',
            }}
          >
            Close Theater
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudyLessons() {
  const [chapters, setChapters] = useState([]);
  const [open, setOpen] = useState({});
  const [theaterVideo, setTheaterVideo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    chapterAPI.getAll().then(r => setChapters(r.data.chapters)).catch(() => {});
  }, []);

  const toggle = id => setOpen(p => ({ ...p, [id]: !p[id] }));

  const openTheater = (video, chapter) => {
    setTheaterVideo({ video, chapter });
  };

  const goToAssessment = (video, chapter) => {
    const videoPayload = {
      id: String(video.id),
      title: video.title,
      cloudinary_url: video.cloudinary_url,
      chapter_id: String(chapter.id),
      chapter_number: String(chapter.number),
      chapter_title: chapter.title,
    };
    localStorage.setItem('active_simulation_video', JSON.stringify(videoPayload));
    navigate('/assessment', {
      state: {
        autoTab: 'video',
        targetChapterId: String(chapter.id),
        targetChapterNumber: String(chapter.number),
      },
    });
  };

  return (
    <>
      {theaterVideo && (
        <TheaterModal
          video={theaterVideo.video}
          chapter={theaterVideo.chapter}
          onClose={() => setTheaterVideo(null)}
        />
      )}

      <div>
        <h1 className="page-title">Learning Lessons</h1>
        <p className="page-sub">6 chapters - Download slides - Watch video simulations</p>

        {chapters.map(ch => (
          <div key={ch.id} className="chapter-item">
            <div className="chapter-hdr" onClick={() => toggle(ch.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="chapter-num">{ch.number}</div>
                <div>
                  <div className="chapter-name">{ch.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                    {ch.slides?.length || 0} file(s)
                    {ch.videos?.length ? (
                      <span style={{ color: 'var(--green)' }}> - Video available</span>
                    ) : null}
                    {ch.assessmentVideos?.length ? (
                      <span style={{ color: 'var(--wine)' }}> - Exam Ready</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <span style={{
                color: 'var(--muted)', fontSize: 11,
                transition: 'transform 0.2s', display: 'inline-block',
                transform: open[ch.id] ? 'rotate(180deg)' : 'none',
              }}>v</span>
            </div>

            {open[ch.id] && (
              <div className="chapter-body open">
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 14 }}>
                  {ch.description}
                </p>

                <div className="grid2">

                  <div>
                    <div className="card-title" style={{ fontSize: 12 }}>Lesson Materials</div>

                    {ch.slides?.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                        {ch.slides.map(s => (
                          <div key={s.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'var(--bg)', borderRadius: 8, padding: '10px 12px',
                          }}>
                            <span style={{ fontSize: 12 }}>{s.title}</span>
                            <a
                              href={s.image_url}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-wine"
                              style={{ fontSize: 10, textDecoration: 'none' }}
                            >
                              Download
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, textAlign: 'center', marginBottom: 12 }}>
                        <p style={{ fontSize: 12, color: 'var(--muted)' }}>No materials uploaded yet.</p>
                      </div>
                    )}

                    <div className="btn-row">
                      <button
                        className="btn btn-outline"
                        style={{ fontSize: 11 }}
                        onClick={() => {
                          chapterAPI.markProgress({ chapter_id: ch.id })
                            .then(() => toast.success('Progress saved!'))
                            .catch(() => {});
                        }}
                      >
                        Mark Done
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="card-title" style={{ fontSize: 12 }}>Video Simulation</div>

                    {ch.videos?.length ? (
                      ch.videos.map(v => (
                        <div key={v.id} style={{ marginBottom: 12 }}>
                          <div
                            onClick={() => openTheater(v, ch)}
                            style={{
                              position: 'relative', width: '100%', aspectRatio: '16/9',
                              background: '#111', borderRadius: 8, marginBottom: 8,
                              cursor: 'pointer', overflow: 'hidden',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <video
                              src={v.cloudinary_url}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                              muted
                              preload="metadata"
                            />
                            <div style={{
                              position: 'absolute', inset: 0,
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}>
                              <div style={{
                                width: 48, height: 48, borderRadius: '50%',
                                background: 'rgba(122,28,46,0.9)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 20, color: '#fff',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                              }}>{'>'}</div>
                              <span style={{
                                fontSize: 10, color: '#fff',
                                background: 'rgba(0,0,0,0.5)',
                                padding: '2px 8px', borderRadius: 4,
                              }}>
                                {v.title}
                              </span>
                            </div>
                          </div>

                          <div className="btn-row">
                            <button
                              className="btn btn-wine"
                              style={{ fontSize: 11 }}
                              onClick={() => openTheater(v, ch)}
                            >
                              Watch
                            </button>
                            <a
                              href={v.cloudinary_url}
                              download
                              className="btn btn-outline"
                              style={{ fontSize: 11, textDecoration: 'none' }}
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, textAlign: 'center' }}>
                        <p style={{ fontSize: 12, color: 'var(--muted)' }}>No lecture video uploaded yet.</p>
                      </div>
                    )}

                    {ch.assessmentVideos?.length > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed var(--cream)' }}>
                        <button
                          className="btn btn-wine"
                          style={{ fontSize: 11, width: '100%' }}
                          onClick={() => navigate('/assessment', {
                            state: {
                              targetChapterId: String(ch.id),
                              targetChapterNumber: String(ch.number),
                              autoTab: 'video',
                            },
                          })}
                        >
                          Go to Chapter {ch.number} Video Assessment
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}