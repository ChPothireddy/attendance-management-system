import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function MySubjects() {
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    API.get('/student/subjects').then(r => setSubjects(r.data)).catch(() => {});
  }, []);

  return (
    <div className="page-container">
      <div className="page-header"><h1>My Subjects</h1><p>Subjects for your current semester</p></div>
      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Subject</th><th>Code</th><th>Semester</th><th>Credits</th></tr></thead>
            <tbody>
              {subjects.length === 0 ? <tr><td colSpan="4" style={{textAlign:'center',padding:'40px',color:'var(--gray-400)'}}>No subjects found</td></tr> :
              subjects.map(s => (
                <tr key={s.code}>
                  <td style={{fontWeight:600}}>{s.name}</td>
                  <td><span className="badge badge-info">{s.code}</span></td>
                  <td>Sem {s.semester}</td>
                  <td>{s.credits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
