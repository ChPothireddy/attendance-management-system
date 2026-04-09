import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function AllUsers() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => { load(); }, [roleFilter]);

  const load = () => {
    const url = roleFilter ? `/admin/users?role=${roleFilter}` : '/admin/users';
    API.get(url).then(r => setUsers(r.data)).catch(() => {});
  };

  const roleBadge = (role) => {
    const map = {
      super_admin: 'badge-info',
      dept_admin: 'badge-warning',
      faculty: 'badge-success',
      student: 'badge-present',
    };
    return map[role] || 'badge-info';
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>All Users</h1><p>View all users in the system</p></div>
      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <select className="form-control" style={{width:'180px'}} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="dept_admin">Dept Admin</option>
              <option value="faculty">Faculty</option>
              <option value="student">Student</option>
            </select>
          </div>
          <span style={{fontSize:'0.85rem',color:'var(--gray-500)'}}>{users.length} users</span>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>College</th><th>Branch</th><th>Joined</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{fontWeight:600}}>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className={`badge ${roleBadge(u.role)}`}>{u.role.replace('_',' ')}</span></td>
                  <td>{u.college_name || '—'}</td>
                  <td>{u.branch_name || '—'}</td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
