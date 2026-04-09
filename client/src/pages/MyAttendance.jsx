import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function MyAttendance() {
  const [summary, setSummary] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    API.get('/student/attendance/summary').then(r => setSummary(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedSubject) {
      API.get('/student/attendance').then(r => setRecords(r.data)).catch(() => {});
    } else {
      API.get(`/student/attendance?subject_code=${selectedSubject}`).then(r => setRecords(r.data)).catch(() => {});
    }
  }, [selectedSubject]);

  return (
    <div className="page-container">
      <div className="page-header"><h1>My Attendance</h1><p>View your attendance across all subjects</p></div>

      <div className="card" style={{marginBottom:'20px'}}>
        <h2 style={{fontSize:'1.1rem',fontWeight:700,marginBottom:'16px'}}>Subject-wise Summary</h2>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Subject</th><th>Code</th><th>Total</th><th>Present</th><th>Absent</th><th>Percentage</th></tr></thead>
            <tbody>
              {summary.length === 0 ? <tr><td colSpan="6" style={{textAlign:'center',padding:'40px',color:'var(--gray-400)'}}>No attendance data</td></tr> :
              summary.map(s => (
                <tr key={s.subject_code} style={{cursor:'pointer'}} onClick={() => setSelectedSubject(s.subject_code)}>
                  <td style={{fontWeight:600}}>{s.subject_name}</td>
                  <td><span className="badge badge-info">{s.subject_code}</span></td>
                  <td>{s.total}</td>
                  <td><span className="badge badge-present">{s.present}</span></td>
                  <td><span className="badge badge-absent">{s.absent}</span></td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <div className="percent-bar" style={{width:'60px'}}>
                        <div className={`percent-bar-fill ${s.percentage >= 75 ? 'high' : s.percentage >= 50 ? 'mid' : 'low'}`} style={{width:`${s.percentage}%`}} />
                      </div>
                      <span style={{fontWeight:700,fontSize:'0.85rem',color:s.percentage >= 75 ? 'var(--success-600)' : 'var(--danger-600)'}}>{s.percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <h2>Recent Records</h2>
          {selectedSubject && <button className="btn btn-secondary btn-sm" onClick={() => setSelectedSubject(null)}>Show All</button>}
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Subject</th><th>Status</th></tr></thead>
            <tbody>
              {records.length === 0 ? <tr><td colSpan="3" style={{textAlign:'center',padding:'40px',color:'var(--gray-400)'}}>No records</td></tr> :
              records.slice(0, 50).map(r => (
                <tr key={`${r.session_id}-${r.student_id}`}>
                  <td>{new Date(r.date).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'})}</td>
                  <td>{r.subject_code}</td>
                  <td><span className={`badge badge-${r.status === 'present' ? 'present' : 'absent'}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
