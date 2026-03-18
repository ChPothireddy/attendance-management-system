import { useState, useEffect } from 'react';
import API from '../api/axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS_BAR = ['#10b981', '#f59e0b', '#ef4444'];

export default function AttendanceReport() {
  const [allocations, setAllocations] = useState([]);
  const [selectedAlloc, setSelectedAlloc] = useState(null);
  const [report, setReport] = useState([]);

  useEffect(() => {
    API.get('/faculty/allocations').then(r => setAllocations(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedAlloc) return;
    API.get(`/faculty/attendance/report?subject_id=${selectedAlloc.subject_id}&section_id=${selectedAlloc.section_id}`)
      .then(r => setReport(r.data)).catch(() => {});
  }, [selectedAlloc]);

  return (
    <div className="page-container">
      <div className="page-header"><h1>Attendance Report</h1><p>View detailed attendance statistics</p></div>

      <div className="card" style={{marginBottom:'20px'}}>
        <div className="form-group">
          <label>Select Class</label>
          <select className="form-control" style={{maxWidth:'400px'}} value={selectedAlloc ? allocations.indexOf(selectedAlloc) : ''} onChange={e => setSelectedAlloc(allocations[+e.target.value] || null)}>
            <option value="">Choose section & subject</option>
            {allocations.map((a, i) => (
              <option key={a.id} value={i}>Section {a.section_name} — {a.subject_code} ({a.subject_name})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedAlloc && report.length > 0 && (
        <>
          <div className="card" style={{marginBottom:'20px'}}>
            <h2 style={{fontSize:'1.1rem',fontWeight:700,marginBottom:'16px'}}>Attendance Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report} margin={{top:5,right:20,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="enrollment_no" fontSize={11} tick={{fill:'var(--gray-500)'}} />
                <YAxis domain={[0, 100]} fontSize={12} tick={{fill:'var(--gray-500)'}} />
                <Tooltip contentStyle={{borderRadius:'8px',border:'none',boxShadow:'var(--shadow-lg)'}} />
                <Bar dataKey="percentage" radius={[4,4,0,0]} name="Attendance %">
                  {report.map((entry, i) => (
                    <Cell key={i} fill={entry.percentage >= 75 ? '#10b981' : entry.percentage >= 50 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 style={{fontSize:'1.1rem',fontWeight:700,marginBottom:'16px'}}>Detailed Report</h2>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead><tr><th>Enrollment</th><th>Name</th><th>Total</th><th>Present</th><th>Late</th><th>Absent</th><th>Percentage</th></tr></thead>
                <tbody>
                  {report.map(r => (
                    <tr key={r.student_id}>
                      <td><span className="badge badge-info">{r.enrollment_no}</span></td>
                      <td style={{fontWeight:600}}>{r.student_name}</td>
                      <td>{r.total_classes}</td>
                      <td><span className="badge badge-present">{r.present}</span></td>
                      <td><span className="badge badge-late">{r.late}</span></td>
                      <td><span className="badge badge-absent">{r.absent}</span></td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <div className="percent-bar" style={{width:'60px'}}>
                            <div className={`percent-bar-fill ${r.percentage >= 75 ? 'high' : r.percentage >= 50 ? 'mid' : 'low'}`} style={{width:`${r.percentage}%`}} />
                          </div>
                          <span style={{fontWeight:700,fontSize:'0.85rem',color:r.percentage >= 75 ? 'var(--success-600)' : 'var(--danger-600)'}}>{r.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
