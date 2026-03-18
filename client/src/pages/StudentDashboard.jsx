import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { HiOutlineBookOpen, HiOutlineCalendar, HiOutlineChartBar, HiOutlineClipboardList, HiOutlineAcademicCap, HiOutlineTrendingUp, HiOutlineCheckCircle, HiOutlineExclamation } from 'react-icons/hi';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [attSummary, setAttSummary] = useState([]);

  useEffect(() => {
    API.get('/student/stats').then(r => setStats(r.data)).catch(() => {});
    API.get('/student/attendance/summary').then(r => setAttSummary(r.data)).catch(() => {});
  }, []);

  const overallPie = [
    { name: 'Present', value: stats.present || 0 },
    { name: 'Late', value: Math.max(0, (stats.total_classes || 0) - (stats.present || 0) - Math.max(0, (stats.total_classes||0) - (stats.present||0))) },
    { name: 'Absent', value: Math.max(0, (stats.total_classes || 0) - (stats.present || 0)) },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome, {user?.name?.split(' ')[0]}!</h1>
        <p>Here's your academic overview — Semester {user?.section_name ? `Section ${user.section_name}` : ''}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple"><HiOutlineBookOpen /></div>
          <div className="stat-info"><h3>{stats.subjects || 0}</h3><p>Subjects</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><HiOutlineCalendar /></div>
          <div className="stat-info"><h3>{stats.total_classes || 0}</h3><p>Total Classes</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><HiOutlineChartBar /></div>
          <div className="stat-info"><h3>{stats.attendance_percentage || 0}%</h3><p>Attendance</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink"><HiOutlineTrendingUp /></div>
          <div className="stat-info"><h3>{stats.avg_marks || 0}%</h3><p>Avg. Marks</p></div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
        <div className="card">
          <h2 style={{fontSize:'1.1rem',fontWeight:700,marginBottom:'16px',color:'var(--gray-900)'}}>Attendance Overview</h2>
          {stats.total_classes > 0 ? (
            <div style={{display:'flex',alignItems:'center',gap:'20px'}}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={overallPie} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" strokeWidth={0}>
                    {overallPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div>
                <div style={{fontSize:'2rem',fontWeight:800,color:'var(--gray-900)'}}>{stats.attendance_percentage}%</div>
                <div style={{fontSize:'0.85rem',color:'var(--gray-500)'}}>Overall Attendance</div>
                <div style={{fontSize:'0.8rem',color: stats.attendance_percentage >= 75 ? 'var(--success-600)' : 'var(--danger-600)',marginTop:'4px',fontWeight:600}}>
                  {stats.attendance_percentage >= 75 ? <><HiOutlineCheckCircle style={{verticalAlign:'middle'}} /> Above 75% threshold</> : <><HiOutlineExclamation style={{verticalAlign:'middle'}} /> Below 75% threshold</>}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state"><p>No attendance data yet</p></div>
          )}
        </div>

        <div className="card">
          <h2 style={{fontSize:'1.1rem',fontWeight:700,marginBottom:'16px',color:'var(--gray-900)'}}>Subject-wise Attendance</h2>
          {attSummary.length > 0 ? (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {attSummary.map(s => (
                <div key={s.subject_id} style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'0.85rem',fontWeight:600,color:'var(--gray-800)',marginBottom:'4px'}}>{s.subject_code}</div>
                    <div className="percent-bar" style={{width:'100%'}}>
                      <div className={`percent-bar-fill ${s.percentage >= 75 ? 'high' : s.percentage >= 50 ? 'mid' : 'low'}`} style={{width:`${s.percentage}%`}} />
                    </div>
                  </div>
                  <div style={{fontSize:'0.85rem',fontWeight:700,color: s.percentage >= 75 ? 'var(--success-600)' : 'var(--danger-600)',minWidth:'45px',textAlign:'right'}}>
                    {s.percentage}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><p>No subjects found</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
