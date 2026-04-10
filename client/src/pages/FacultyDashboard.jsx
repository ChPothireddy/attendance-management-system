import { useState, useEffect } from 'react';
import API from '../api/axios';
import { HiOutlineClipboardList, HiOutlineUserGroup, HiOutlineBookOpen, HiOutlineCalendar, HiOutlineChartBar, HiOutlinePencilAlt, HiOutlineClipboardCheck, HiOutlineDocumentReport, HiOutlineDocumentAdd, HiOutlineTable } from 'react-icons/hi';

export default function FacultyDashboard() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    API.get('/faculty/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Faculty Dashboard</h1>
        <p>Mark attendance, enter marks, and view reports</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple"><HiOutlineBookOpen /></div>
          <div className="stat-info"><h3>{stats.subjects || 0}</h3><p>Subjects</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><HiOutlineClipboardList /></div>
          <div className="stat-info"><h3>{stats.sections || 0}</h3><p>Sections</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><HiOutlineUserGroup /></div>
          <div className="stat-info"><h3>{stats.total_students || 0}</h3><p>Total Students</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink"><HiOutlineCalendar /></div>
          <div className="stat-info"><h3>{stats.today_attendance || 0}</h3><p>Today's Records</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><HiOutlineChartBar /></div>
          <div className="stat-info"><h3>{stats.allocations || 0}</h3><p>Allocations</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><HiOutlineDocumentAdd /></div>
          <div className="stat-info"><h3>{stats.assignments || 0}</h3><p>Assignments</p></div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'20px'}}>
        <a href="/mark-attendance" className="card" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:'16px',cursor:'pointer'}}>
          <div style={{fontSize:'1.8rem',color:'var(--success-600)'}}><HiOutlineClipboardCheck /></div>
          <div>
            <h3 style={{fontSize:'1rem',fontWeight:600,color:'var(--gray-900)'}}>Mark Attendance</h3>
            <p style={{fontSize:'0.8rem',color:'var(--gray-500)'}}>Mark today's attendance for your classes</p>
          </div>
        </a>
        <a href="/enter-marks" className="card" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:'16px',cursor:'pointer'}}>
          <div style={{fontSize:'1.8rem',color:'var(--primary-600)'}}><HiOutlinePencilAlt /></div>
          <div>
            <h3 style={{fontSize:'1rem',fontWeight:600,color:'var(--gray-900)'}}>Enter Marks</h3>
            <p style={{fontSize:'0.8rem',color:'var(--gray-500)'}}>Enter exam and assignment marks</p>
          </div>
        </a>
        <a href="/attendance-report" className="card" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:'16px',cursor:'pointer'}}>
          <div style={{fontSize:'1.8rem',color:'var(--warning-500)'}}><HiOutlineChartBar /></div>
          <div>
            <h3 style={{fontSize:'1rem',fontWeight:600,color:'var(--gray-900)'}}>Attendance Report</h3>
            <p style={{fontSize:'0.8rem',color:'var(--gray-500)'}}>View detailed attendance analytics</p>
          </div>
        </a>
        <a href="/marks-report" className="card" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:'16px',cursor:'pointer'}}>
          <div style={{fontSize:'1.8rem',color:'var(--accent-600)'}}><HiOutlineDocumentReport /></div>
          <div>
            <h3 style={{fontSize:'1rem',fontWeight:600,color:'var(--gray-900)'}}>Marks Report</h3>
            <p style={{fontSize:'0.8rem',color:'var(--gray-500)'}}>View marks distribution and analysis</p>
          </div>
        </a>
        <a href="/faculty-assignments" className="card" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:'16px',cursor:'pointer'}}>
          <div style={{fontSize:'1.8rem',color:'var(--danger-500)'}}><HiOutlineDocumentAdd /></div>
          <div>
            <h3 style={{fontSize:'1rem',fontWeight:600,color:'var(--gray-900)'}}>Assignments</h3>
            <p style={{fontSize:'0.8rem',color:'var(--gray-500)'}}>Create assignments and review student submissions</p>
          </div>
        </a>
        <a href="/faculty-timetable" className="card" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:'16px',cursor:'pointer'}}>
          <div style={{fontSize:'1.8rem',color:'var(--gray-700)'}}><HiOutlineTable /></div>
          <div>
            <h3 style={{fontSize:'1rem',fontWeight:600,color:'var(--gray-900)'}}>My Timetable</h3>
            <p style={{fontSize:'0.8rem',color:'var(--gray-500)'}}>View your weekly class schedule and follow section timings</p>
          </div>
        </a>
      </div>
    </div>
  );
}
