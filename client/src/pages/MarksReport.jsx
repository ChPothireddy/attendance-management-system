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

  return (
    <div className="page-container">
      <div className="page-header"><h1>Marks Report</h1><p>View marks distribution and analysis</p></div>

      <div className="card" style={{marginBottom:'20px'}}>
        <div className="form-group">
          <label>Select Class</label>
          <select className="form-control" style={{maxWidth:'400px'}} value={selectedAlloc ? allocations.indexOf(selectedAlloc) : ''} onChange={e => setSelectedAlloc(allocations[+e.target.value] || null)}>
            <option value="">Choose section & subject</option>
            {allocations.map((a, i) => (
              <option key={a.id} value={i}>Section {a.section_name} - {a.subject_code} ({a.subject_name})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedAlloc && report.length > 0 && (
        <div className="card">
          <h2 style={{fontSize:'1.1rem',fontWeight:700,marginBottom:'16px'}}>Detailed Marks</h2>
          <div className="data-table-wrapper">
            <table className="data-table" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Mid-1</th>
                  <th>Mid-2</th>
                  <th>Best of Two</th>
                  <th>Continuous Assignment</th>
                  <th>Total / 30</th>
                  <th>Total in Words</th>
                </tr>
              </thead>
              <tbody>
                {report.map(r => (
                  <tr key={r.student_id}>
                    <td><span className="badge badge-info">{r.roll_no || r.enrollment_no}</span></td>
                    <td style={{fontWeight:600}}>{r.student_name}</td>
                    <td>{r.mid1}</td>
                    <td>{r.mid2}</td>
                    <td>{r.best_mid}</td>
                    <td>{r.continuous_assignment}</td>
                    <td style={{fontWeight:700}}>{r.total_obtained}/{r.total_max}</td>
                    <td>{r.total_words}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
