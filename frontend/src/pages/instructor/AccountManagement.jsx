import React, { useState } from 'react';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';
// 1. Import the new PDF libraries
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function AccountManagement() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!file) { toast.error('Choose an Excel file'); return; }
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await userAPI.importStudents(fd);
      setPreview(data.students);
      toast.success(data.message);
    } catch (err) { toast.error(err.response?.data?.message || 'Import failed'); }
    finally { setImporting(false); }
  };

  // 2. Add the actual PDF generation logic
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add Title Header
      doc.setFontSize(18);
      doc.text('Generated Student Credentials', 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 26);

      // Map preview state array to match PDF table rows
      const tableRows = preview.map(s => [
        s.name,
        s.email,
        `Sec ${s.section}`,
        s.defaultPassword || 'ccs2024!'
      ]);

      // Create PDF Table Layout
      doc.autoTable({
        startY: 32,
        head: [['Name', 'Email', 'Section', 'Default Password']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [128, 0, 32] } // Wine color matching your theme
      });

      // Save and prompt download file browser
      doc.save('student-credentials.pdf');
      toast.success('Credentials PDF downloaded!');
    } catch (error) {
      toast.error('Could not generate PDF. Please try again.');
    }
  };

  return (
    <div>
      <h1 className="page-title">Account Management</h1>
      <p className="page-sub">Import Excel roster · Auto-generate student accounts with default passwords</p>
      <div className="grid2">
        <div className="card">
          <div className="card-title">Import Student Roster</div>
          <div style={{ background:'var(--bg)', borderRadius:8, padding:12, marginBottom:12, fontSize:11, color:'var(--muted)' }}>
            Required Excel columns: <strong>Name, Email, Year, Section</strong><br/>
            Accounts will be created with default password: <strong>ccs2024!</strong>
          </div>
          <div className="upload-zone" style={{ marginBottom:12 }} onClick={() => document.getElementById('excel-file').click()}>
            {file ? <p style={{ color:'var(--wine)', fontWeight:500 }}> {file.name}</p> : <><p>Click to upload .xlsx file</p><p className="limit">Excel only · Read-only format</p></>}
          </div>
          <input id="excel-file" type="file" style={{ display:'none' }} accept=".xlsx,.xls" onChange={e => setFile(e.target.files[0])} />
          <div className="btn-row">
            <button className="btn btn-wine" onClick={() => document.getElementById('excel-file').click()}>Choose File</button>
            <button className="btn btn-green" onClick={handleImport} disabled={importing}>{importing?'Importing...':'Import & Generate'}</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">👥 Generated Accounts {preview.length ? `(${preview.length})` : ''}</div>
          {preview.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Section</th><th>Password</th></tr></thead>
                <tbody>
                  {preview.map((s,i) => (
                    <tr key={i}>
                      <td>{s.name}</td>
                      <td style={{ fontSize:11 }}>{s.email}</td>
                      <td>Sec {s.section}</td>
                      <td><span className="badge badge-amber">{s.defaultPassword || 'ccs2024!'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color:'var(--muted)', fontSize:13 }}>Import an Excel file to see generated accounts here.</p>
          )}
          {preview.length > 0 && (
            <div className="btn-row" style={{ marginTop:12 }}>
              {/* 3. Link button click trigger to your new function */}
              <button className="btn btn-outline" onClick={handleExportPDF}>Export Credentials PDF</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
