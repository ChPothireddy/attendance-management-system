import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function MarksReport() {
  const [allocations, setAllocations] = useState([]);
  const [selectedAlloc, setSelectedAlloc] = useState(null);
  const [report, setReport] = useState([]);

  useEffect(() => {
    API.get('/faculty/allocations').then(r => setAllocations(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedAlloc) return;
    API.get(`/faculty/marks/report?subject_code=${selectedAlloc.subject_code}&section_id=${selectedAlloc.section_id}`)
      .then(r => setReport(r.data)).catch(() => {});
  }, [selectedAlloc]);

  const examTypes = [...new Set(report.flatMap(r => Object.keys(r.marks)))];

  return (
    <div className="page-container">
      <div className="page-header"><h1>Marks Report</h1><p>View marks distribution and analysis</p></div>

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
          <div className="card">
            <h2 style={{fontSize:'1.1rem',fontWeight:700,marginBottom:'16px'}}>Detailed Marks</h2>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Enrollment</th>
                    <th>Name</th>
                    {examTypes.map(e => <th key={e} style={{textTransform:'uppercase'}}>{e}</th>)}
                    <th>Total</th>
                    <th>Overall %</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map(r => (
                    <tr key={r.student_id}>
                      <td><span className="badge badge-info">{r.enrollment_no}</span></td>
                      <td style={{fontWeight:600}}>{r.student_name}</td>
                      {examTypes.map(e => (
                        <td key={e}>
                          {r.marks[e] ? (
                            <span>{r.marks[e].obtained}/{r.marks[e].max}</span>
                          ) : '—'}
                        </td>
                      ))}
                      <td style={{fontWeight:600}}>{r.total_obtained}/{r.total_max}</td>
                      <td>
                        <span style={{fontWeight:700,color:r.overall_percentage >= 60 ? 'var(--success-600)' : 'var(--danger-600)'}}>
                          {r.overall_percentage}%
                        </span>
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
