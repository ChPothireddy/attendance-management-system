import { useState, useEffect } from 'react';
import API from '../api/axios';
import { HiOutlineDocumentText } from 'react-icons/hi';

export default function MyMarks() {
  const [summary, setSummary] = useState([]);

  useEffect(() => {
    API.get('/student/marks/summary').then(r => setSummary(r.data)).catch(() => {});
  }, []);

  const allExams = [...new Set(summary.flatMap(s => Object.keys(s.marks)))];

  return (
    <div className="page-container">
      <div className="page-header"><h1>My Marks</h1><p>View your marks across all subjects and exams</p></div>

      {summary.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="icon"><HiOutlineDocumentText /></div><p>No marks data available</p></div></div>
      ) : (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'16px',marginBottom:'20px'}}>
            {summary.map(s => (
              <div key={s.subject_id} className="card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                  <div>
                    <h3 style={{fontSize:'1rem',fontWeight:700,color:'var(--gray-900)'}}>{s.subject_name}</h3>
                    <span className="badge badge-info">{s.subject_code}</span>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'1.5rem',fontWeight:800,color:s.overall_percentage >= 60 ? 'var(--success-600)' : s.overall_percentage >= 33 ? 'var(--warning-500)' : 'var(--danger-600)'}}>
                      {s.overall_percentage}%
                    </div>
                    <div style={{fontSize:'0.75rem',color:'var(--gray-500)'}}>{s.total_obtained}/{s.total_max}</div>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {Object.entries(s.marks).map(([exam, data]) => (
                    <div key={exam} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:'0.8rem',color:'var(--gray-600)',textTransform:'uppercase',fontWeight:500}}>{exam}</span>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <div className="percent-bar" style={{width:'50px'}}>
                          <div className={`percent-bar-fill ${data.percentage >= 60 ? 'high' : data.percentage >= 33 ? 'mid' : 'low'}`} style={{width:`${data.percentage}%`}} />
                        </div>
                        <span style={{fontSize:'0.8rem',fontWeight:600,color:'var(--gray-700)',minWidth:'50px',textAlign:'right'}}>{data.obtained}/{data.max}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 style={{fontSize:'1.1rem',fontWeight:700,marginBottom:'16px'}}>All Marks Table</h2>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    {allExams.map(e => <th key={e} style={{textTransform:'uppercase'}}>{e}</th>)}
                    <th>Total</th>
                    <th>Overall %</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map(s => (
                    <tr key={s.subject_id}>
                      <td style={{fontWeight:600}}>{s.subject_name}</td>
                      {allExams.map(e => (
                        <td key={e}>{s.marks[e] ? `${s.marks[e].obtained}/${s.marks[e].max}` : '—'}</td>
                      ))}
                      <td style={{fontWeight:600}}>{s.total_obtained}/{s.total_max}</td>
                      <td>
                        <span style={{fontWeight:700,color:s.overall_percentage >= 60 ? 'var(--success-600)' : 'var(--danger-600)'}}>
                          {s.overall_percentage}%
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
