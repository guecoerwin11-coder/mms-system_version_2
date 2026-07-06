import React, { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';
// 1. ADDED: Import the SheetJS library for generating Excel sheets
import * as XLSX from 'xlsx';

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [section, setSection] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [availableSections, setAvailableSections] = useState([]);

  const handleDelete = async (student) => {
    const confirmed = window.confirm(
      `Delete "${student.name}"?\n\nThis removes:\n• Account\n• Quiz scores\n• Submissions\n• Progress\n• Peer evaluations\n\nCannot be undone.`
    );
    if (!confirmed) return;
    setDeleting(student.id);
    try {
      await userAPI.deleteStudent(student.id);
      toast.success(`"${student.name}" deleted`);
      setStudents(prev => prev.filter(s => s.id !== student.id));
      
      setAvailableSections(prev => {
        const remaining = students.filter(s => s.id !== student.id).map(s => s.section);
        return [...new Set(remaining)].filter(Boolean).sort();
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally { setDeleting(null); }
  };

  const load = (sec='') => {
    setLoading(true);
    userAPI.getStudents(sec ? { section: sec } : {})
      .then(r => {
        setStudents(r.data.students);
        if (!sec) {
          const uniqueSecs = [...new Set(r.data.students.map(s => s.section))]
            .filter(Boolean)
            .sort();
          setAvailableSections(uniqueSecs);
        }
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filterSection = sec => { setSection(sec); load(sec); };

  const updateScore = async (id, score) => {
    try {
      await userAPI.updateScore(id, { score });
      toast.success('Score updated!');
    } catch { toast.error('Update failed'); }
  };

  // 2. ADDED: Actual working Excel spreadsheet generation logic
  const exportExcel = () => {
    if (students.length === 0) {
      toast.error('No student data to export!');
      return;
    }

    // Format fields cleanly inside rows
    const formattedData = students.map(s => ({
      'Student Name': s.name,
      'Year Level': `${s.year} Year`,
      'Section': s.section ? s.section.toUpperCase() : 'N/A',
      'Email Address': s.email,
      'Average Quiz Score (%)': Math.round(s.avg_score || 0),
      'Total Submissions': s.submissions || 0
    }));

    // Create worksheet and workbook object structure
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    
    // Pick tab name dynamically based on selection
    const sheetName = section ? `Section ${section.toUpperCase()}` : 'All Students';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Pick file name dynamically based on selection
    const fileName = section 
      ? `Student_List_Section_${section.toUpperCase()}.xlsx` 
      : 'All_Students_List.xlsx';

    // Download file directly in the browser
    XLSX.writeFile(workbook, fileName);
    toast.success(`${sheetName} list exported!`);
  };

  return (
    <div>
      <h1 className="page-title">Student List</h1>
      <p className="page-sub">Manage enrolled students · Edit scores · Export per section</p>
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <div className="sec-filters">
            <button className={`sec-btn ${section === '' ? 'active' : ''}`} onClick={() => filterSection('')}>
              All Sections
            </button>
            {availableSections.map(s => (
              <button key={s} className={`sec-btn ${section === s ? 'active' : ''}`} onClick={() => filterSection(s)}>
                Section {s.toUpperCase()}
              </button>
            ))} 
          </div>
          <button className="btn btn-green" onClick={exportExcel}>📥 Export Excel</button>
        </div>

        {loading ? (
          <p style={{ textAlign:'center', color:'var(--muted)', padding:20 }}>Loading...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Year</th><th>Section</th><th>Email</th><th>Quiz Score</th><th>Progress</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight:500, color:'var(--wine)' }}>{s.name}</td>
                    <td>{s.year} Year</td>
                    <td><span className="badge badge-wine">Sec {s.section}</span></td>
                    <td style={{ fontSize:11, color:'var(--muted)' }}>{s.email}</td>
                    <td>
                      <input
                        type="number" min="0" max="100"
                        defaultValue={Math.round(s.avg_score||0)}
                        onBlur={e => updateScore(s.id, e.target.value)}
                        style={{ width:60, border:'1px solid var(--cream)', borderRadius:6, padding:'3px 6px', fontSize:12, background:'var(--bg)', color:'var(--wine)', fontWeight:600 }}
                      />
                    </td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:60 }}>
                          <div className="progress-wrap"><div className="progress-fill" style={{ width:(s.avg_score||0)+'%' }} /></div>
                        </div>
                        <span style={{ fontSize:10, color:'var(--muted)' }}>{Math.round(s.avg_score||0)}%</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline" style={{ fontSize:10, padding:'4px 10px' }}
                          onClick={() => toast('Student: '+s.name+' | Submissions: '+s.submissions)}>
                          View
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ fontSize:10, padding:'4px 10px' }}
                          disabled={deleting === s.id}
                          onClick={() => handleDelete(s)}
                        >
                          {deleting === s.id ? 'Deleting...' : '🗑 Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!students.length && <div style={{ padding:20, textAlign:'center', color:'var(--muted)', fontSize:13 }}>No students found.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
