import { useState, useEffect } from 'react';
import API from '../api/axios';
import { HiOutlineViewGrid, HiOutlineBookOpen, HiOutlineAcademicCap, HiOutlineUserGroup, HiOutlineCog, HiOutlineClipboardList } from 'react-icons/hi';

export default function DeptAdminDashboard() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    API.get('/department/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Department Dashboard</h1>
        <p>Manage your department's sections, subjects, and people</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple"><HiOutlineViewGrid /></div>
          <div className="stat-info"><h3>{stats.sections || 0}</h3><p>Sections</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><HiOutlineBookOpen /></div>
          <div className="stat-info"><h3>{stats.subjects || 0}</h3><p>Subjects</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><HiOutlineAcademicCap /></div>
          <div className="stat-info"><h3>{stats.faculty || 0}</h3><p>Faculty</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink"><HiOutlineUserGroup /></div>
          <div className="stat-info"><h3>{stats.students || 0}</h3><p>Students</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><HiOutlineCog /></div>
          <div className="stat-info"><h3>{stats.allocations || 0}</h3><p>Allocations</p></div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'20px'}}>
        <QuickAction title="Manage Sections" desc="Create and manage class sections" to="/sections" Icon={HiOutlineClipboardList} color="var(--primary-600)" />
        <QuickAction title="Manage Subjects" desc="Add subjects for your department" to="/subjects" Icon={HiOutlineBookOpen} color="var(--success-600)" />
        <QuickAction title="Manage Faculty" desc="Add and manage faculty members" to="/manage-faculty" Icon={HiOutlineAcademicCap} color="var(--warning-500)" />
        <QuickAction title="Manage Students" desc="Add and manage students" to="/manage-students" Icon={HiOutlineUserGroup} color="var(--accent-600)" />
        <QuickAction title="Faculty Allocations" desc="Assign faculty to sections & subjects" to="/allocations" Icon={HiOutlineCog} color="var(--gray-600)" />
      </div>
    </div>
  );
}

function QuickAction({ title, desc, to, Icon, color }) {
  return (
    <a href={to} className="card" style={{textDecoration:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'16px'}}>
      <div style={{fontSize:'1.8rem',flexShrink:0,color:color||'var(--primary-600)'}}><Icon /></div>
      <div>
        <h3 style={{fontSize:'1rem',fontWeight:600,color:'var(--gray-900)',marginBottom:'2px'}}>{title}</h3>
        <p style={{fontSize:'0.8rem',color:'var(--gray-500)'}}>{desc}</p>
      </div>
    </a>
  );
}
