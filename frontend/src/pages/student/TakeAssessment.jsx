import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { quizAPI, activityAPI, aiAPI, chapterAPI } from '../../services/api';
import toast from 'react-hot-toast';

// ── Theater Mode Modal ────────────────────────────────────────────────────────
function TheaterModal({ video, onClose }) {
  const videoRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prevent background scroll while modal is open
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
      {/* Modal box — stop click from bubbling to backdrop */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 900,
          background: '#111',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#1a1a1a',
          borderBottom: '1px solid #333',
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>
              CH {video.chapter_number} · {video.chapter_title}
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
            >✕</button>
          </div>
        </div>

        {/* Video player */}
        <div style={{ position: 'relative', width: '100%', background: '#000', aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            src={video.cloudinary_url}
            controls
            autoPlay
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
          />
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 16px',
          background: '#1a1a1a',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <a
            href={video.cloudinary_url}
            download
            style={{
              fontSize: 11, padding: '6px 14px', borderRadius: 6,
              background: 'transparent', border: '1px solid #444',
              color: '#ccc', textDecoration: 'none', cursor: 'pointer',
            }}
          >
            ⬇ Download
          </a>
          <button
            onClick={onClose}
            style={{
              fontSize: 11, padding: '6px 14px', borderRadius: 6,
              background: '#7a1c2e', border: 'none',
              color: '#fff', cursor: 'pointer',
            }}
          >
            ✕ Close Theater
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TakeAssessment() {
  const location = useLocation();

  const [tab, setTab] = useState(location.state?.autoTab || 'quiz');
  const [selectedChapterFilter, setSelectedChapterFilter] = useState('all');

  // Theater mode
  const [theaterVideo, setTheaterVideo] = useState(null);

  // Quiz state
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions,   setQuestions]   = useState([]);
  const [attemptId,   setAttemptId]   = useState(null);
  const [current,     setCurrent]     = useState(0);
  const [answers,     setAnswers]     = useState({});
  const [timeLeft,    setTimeLeft]    = useState(30);
  const [submitted,   setSubmitted]   = useState(false);
  const [result,      setResult]      = useState(null);
  const timerRef = useRef(null);

  // Files & video state
  const [activities,          setActivities]          = useState([]);
  const [allAssessmentVideos, setAllAssessmentVideos] = useState([]);
  const [pinnedVideo,         setPinnedVideo]         = useState(null);
  const [videoQ,              setVideoQ]              = useState(null);
  const [genLoading,          setGenLoading]          = useState(false);

  // ── Load everything on mount ───────────────────────────────────────────────
  useEffect(() => {
    quizAPI.startAttempt()
      .then(r => { setQuestions(r.data.questions || []); setAttemptId(r.data.attempt_id); })
      .catch(() => {});

    activityAPI.getAll()
      .then(r => setActivities(r.data.activities || []))
      .catch(() => {});

    const loadVideos = async () => {
      let videos = [];
      try {
        const r = await chapterAPI.getAssessmentVideos();
        videos = r.data.videos || [];
      } catch (_) {
        try {
          const r = await chapterAPI.getAll();
          const chapters = r.data.chapters || [];
          chapters.forEach(ch => {
            (ch.videos || []).forEach(v => {
              videos.push({
                ...v,
                chapter_id:     String(ch.id),
                chapter_number: String(ch.number),
                chapter_title:  ch.title,
              });
            });
          });
        } catch (__) {}
      }

      setAllAssessmentVideos(videos);

      const savedStr = localStorage.getItem('active_simulation_video');
      if (savedStr) {
        try {
          const dv = JSON.parse(savedStr);
          setPinnedVideo(dv);
          setSelectedChapterFilter(String(dv.chapter_number || dv.chapter_id || 'all'));
          generateVideoQ(dv.title, dv.chapter_title || `Chapter ${dv.chapter_number}`);
          localStorage.removeItem('active_simulation_video');
        } catch (_) {}
      } else if (location.state?.targetChapterNumber) {
        setSelectedChapterFilter(String(location.state.targetChapterNumber));
      } else if (location.state?.targetChapterId) {
        setSelectedChapterFilter(String(location.state.targetChapterId));
      }
    };

    loadVideos();
  }, []);

  // ── Quiz timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!quizStarted || submitted || !questions.length || tab !== 'quiz') return;
    clearInterval(timerRef.current);
    setTimeLeft(questions[current]?.timer_seconds || 30);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleNext(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [current, questions, tab, submitted, quizStarted]);

  // ── Quiz helpers ───────────────────────────────────────────────────────────
  const beginQuizNow = () => {
    if (!questions.length) { toast.error('Quiz data is still loading. Please wait.'); return; }
    setQuizStarted(true);
    setTimeLeft(questions[current]?.timer_seconds || 30);
    toast.success('Quiz started! Good luck.');
  };

  const handleSelect = (optIdx) => {
    if (submitted) return;
    const opt = ['A', 'B', 'C'][optIdx];
    setAnswers(prev => ({
      ...prev,
      [current]: {
        question_id:  questions[current].id,
        answer_given: opt,
        time_taken:   (questions[current].timer_seconds || 30) - timeLeft,
      },
    }));
  };

  const handleNext = () => {
    clearInterval(timerRef.current);
    if (current < questions.length - 1) setCurrent(c => c + 1);
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    try {
      const { data } = await quizAPI.submitAttempt({ attempt_id: attemptId, answers: Object.values(answers) });
      setResult(data);
      setSubmitted(true);
      toast.success(`Quiz submitted! Score: ${data.score}/${data.total} (${data.percentage}%)`);
    } catch { toast.error('Submit failed'); }
  };

  const generateVideoQ = async (videoTitle, chapterTitle) => {
    setGenLoading(true);
    setVideoQ(null);
    try {
      const { data } = await aiAPI.generateVideoQuestion({ video_title: videoTitle, chapter_title: chapterTitle });
      setVideoQ(data.question);
    } catch { toast.error('Could not generate question'); }
    finally { setGenLoading(false); }
  };

  // ── Compute displayed videos ───────────────────────────────────────────────
  const displayedVideos = (() => {
    const f = String(selectedChapterFilter);
    const fromAPI = selectedChapterFilter === 'all'
      ? [...allAssessmentVideos]
      : allAssessmentVideos.filter(v =>
          String(v.chapter_number) === f || String(v.chapter_id) === f
        );
    if (!pinnedVideo) return fromAPI;
    const pinMatches =
      selectedChapterFilter === 'all' ||
      String(pinnedVideo.chapter_number) === f ||
      String(pinnedVideo.chapter_id)     === f;
    const alreadyIn = fromAPI.some(v => String(v.id) === String(pinnedVideo.id));
    return (pinMatches && !alreadyIn) ? [...fromAPI, pinnedVideo] : fromAPI;
  })();

  const q      = questions[current];
  const maxSec = q?.timer_seconds || 30;
  const pct    = Math.round((timeLeft / maxSec) * 100);

  return (
    <>
      {/* Theater modal — rendered outside normal flow */}
      {theaterVideo && (
        <TheaterModal video={theaterVideo} onClose={() => setTheaterVideo(null)} />
      )}

      <div>
        <h1 className="page-title">Take Assessment</h1>
        <p className="page-sub">Quiz · Activity files · AI-powered video questions</p>

        {/* Tab bar */}
        <div className="tab-row">
          {['quiz', 'files', 'video'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'quiz' ? '📝 Quiz' : t === 'files' ? '📎 Activity Files' : '🎬 Video Simulation'}
            </button>
          ))}
        </div>

        {/* ── QUIZ TAB ────────────────────────────────────────────────────── */}
        {tab === 'quiz' && (
          <div>
            {!quizStarted && !submitted && (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 500, margin: '20px auto' }}>
                <div style={{ fontSize: 48, marginBottom: 14 }}>📝</div>
                <h3 style={{ color: 'var(--wine)', marginBottom: 8 }}>Ready to Start the Quiz?</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                  This quiz is timed per question. Once you click start, the timer begins instantly.
                  Ensure your internet connection is stable.
                </p>
                <button className="btn btn-wine" style={{ fontSize: 14, padding: '10px 24px' }} onClick={beginQuizNow}>
                  🚀 Take Quiz Now
                </button>
              </div>
            )}

            {quizStarted && !submitted && q && (
              <div className="grid2">
                <div>
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--wine)' }}>Q{current + 1} of {questions.length}</span>
                      <span className="badge badge-wine">
                        Score: {Object.values(answers).filter(a => {
                          const qq = questions.find(x => x.id === a.question_id);
                          return qq && qq.correct_option === a.answer_given;
                        }).length * Math.floor(100 / questions.length)}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{ background: 'var(--wine)', color: '#f5f2ed', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        00:{String(timeLeft).padStart(2, '0')}
                      </div>
                      <div style={{ flex: 1, height: 5, background: 'var(--cream)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: pct > 50 ? 'var(--wine)' : pct > 20 ? '#c8973a' : 'var(--danger)', width: `${pct}%`, transition: 'width 1s linear' }} />
                      </div>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--wine)', marginBottom: 14 }}>{q.question}</p>
                    {[q.option_a, q.option_b, q.option_c].map((opt, i) => {
                      const optLetter = ['A', 'B', 'C'][i];
                      const isSelected = answers[current]?.answer_given === optLetter;
                      return (
                        <div key={i} className={`quiz-option ${isSelected ? 'selected' : ''}`} onClick={() => handleSelect(i)}>
                          {optLetter}. {opt}
                        </div>
                      );
                    })}
                    <div className="btn-row" style={{ justifyContent: 'space-between', marginTop: 16 }}>
                      <button className="btn btn-outline" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>← Prev</button>
                      {current < questions.length - 1
                        ? <button className="btn btn-wine" onClick={handleNext}>Next →</button>
                        : <button className="btn btn-green" onClick={handleSubmit}>Submit Quiz</button>
                      }
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">📊 Question Progress</div>
                  {questions.map((qz, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--cream)', cursor: 'pointer' }} onClick={() => setCurrent(i)}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: i === current ? 'var(--wine)' : answers[i] ? 'var(--green)' : 'var(--bg)', color: (i === current || answers[i]) ? '#fff' : 'var(--muted)' }}>
                        {i + 1}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{qz.question.substring(0, 50)}…</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {submitted && result && (
              <div className="card" style={{ textAlign: 'center', maxWidth: 500, margin: '20px auto' }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>{result.percentage >= 75 ? '🎉' : '📝'}</div>
                <h3 style={{ color: 'var(--wine)', marginBottom: 6 }}>Quiz Submitted!</h3>
                <div style={{ fontSize: 36, fontFamily: 'Playfair Display,serif', color: 'var(--wine)', fontWeight: 700 }}>{result.percentage}%</div>
                <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{result.score} / {result.total} correct</p>
                <button className="btn btn-wine" style={{ marginTop: 16 }} onClick={() => {
                  setSubmitted(false); setQuizStarted(false); setAnswers({}); setCurrent(0); setResult(null);
                  quizAPI.startAttempt().then(r => { setQuestions(r.data.questions || []); setAttemptId(r.data.attempt_id); });
                }}>
                  Retake Quiz
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── FILES TAB ───────────────────────────────────────────────────── */}
        {tab === 'files' && (
          <div className="card">
            <div className="card-title">📁 Downloadable Activity Files</div>
            <div className="table-wrap" style={{ marginTop: 14 }}>
              <table>
                <thead><tr><th>Resource Name</th><th>File Type</th><th>Size</th><th>Action</th></tr></thead>
                <tbody>
                  {activities.map(act => (
                    <tr key={act.id}>
                      <td style={{ fontWeight: 500, color: 'var(--wine)' }}>{act.title}</td>
                      <td><span className="badge badge-wine">{act.file_type.toUpperCase()}</span></td>
                      <td>{act.file_size_mb ? `${act.file_size_mb} MB` : 'N/A'}</td>
                      <td>
                        <a href={act.cloudinary_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none' }}>
                          📥 Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!activities.length && <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>No file uploads found.</div>}
            </div>
          </div>
        )}

        {/* ── VIDEO TAB ───────────────────────────────────────────────────── */}
        {tab === 'video' && (<div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div className="card-title">🎬 Video Interactive Simulation</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Watch assessment videos and generate AI-powered questions.</p>
              </div>
              <select
                value={selectedChapterFilter}
                onChange={e => setSelectedChapterFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--cream)', background: 'var(--bg)', color: 'var(--wine)', fontWeight: 600 }}
              >
                <option value="all">All Chapters</option>
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={String(num)}>Chapter {num}</option>
                ))}
              </select>
            </div>

            {/* FIX: Removed grid2 class, added max-width, and centered the section container */}
            <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
              <div>
                {displayedVideos.length > 0
                  ? displayedVideos.map(v => (
                      <div key={v.id} style={{ background: 'var(--bg)', border: '1px solid var(--cream)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--wine)', marginBottom: 4 }}>
                          CH {v.chapter_number || v.chapter_id} · {v.chapter_title || 'Video Resource'}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{v.title}</div>

                        {/* Video preview thumbnail — click to open theater */}
                        <div
                          onClick={() => setTheaterVideo(v)}
                          style={{
                            position: 'relative', width: '100%', aspectRatio: '16/9',
                            background: '#111', borderRadius: 6, marginBottom: 8,
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
                          {/* Play overlay */}
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
                            }}>▶</div>
                            <span style={{ fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 4 }}>
                              Click to open Theater Mode
                            </span>
                          </div>
                        </div>

                        <div className="btn-row">
                          {/* Theater mode button — primary action */}
                          <button
                            className="btn btn-wine"
                            style={{ fontSize: 11 }}
                            onClick={() => setTheaterVideo(v)}
                          >
                            🎭 Theater Mode
                          </button>
                        </div>
                      </div>
                    ))
                  : (
                      <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>
                        No videos found for {selectedChapterFilter === 'all' ? 'any chapter' : `Chapter ${selectedChapterFilter}`}.
                      </div>
                    )
                }
              </div>
            </div>
          </div>
          )}
      </div>
    </>
  );
}