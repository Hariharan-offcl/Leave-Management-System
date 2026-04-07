import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Users, Search, Mail, Shield, Building } from 'lucide-react';
import DepartmentSelector from '../components/DepartmentSelector';

const Directory = () => {
  const { currentUser, users, departments } = useAppContext();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Role-based visibility
  let visibleUsers = users;
  if (currentUser?.role === 'STAFF') {
    visibleUsers = users.filter(u => u.role === 'STUDENT' && u.department_id === currentUser.department_id);
  } else if (currentUser?.role === 'HOD') {
    visibleUsers = users.filter(u => u.department_id === currentUser.department_id);
  } else if (currentUser?.role === 'STUDENT') {
    visibleUsers = [];
  }

  // Filter based on search and department selection (for Principal)
  const filteredUsers = visibleUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesDept = !deptFilter || u.department_id === parseInt(deptFilter);
    return matchesSearch && matchesDept;
  });

  return (
    <div className="erp-dashboard-grid">
      <div className="erp-col-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Institutional Directory</h1>
          <p style={{ color: 'var(--alis-text-muted)', fontSize: '13px' }}>Manage and coordinate personnel</p>
        </div>
      </div>

      <div className="erp-col-12">
        <div className="erp-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--alis-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} color="var(--alis-primary)" />
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Personnel Records</h3>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentUser?.role === 'PRINCIPAL' && (
                <div style={{ width: '200px' }}>
                  <DepartmentSelector value={deptFilter} onChange={setDeptFilter} showAll={true} />
                </div>
              )}
              <div style={{ position: 'relative', width: '250px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--alis-text-muted)' }} />
                <input 
                  className="erp-input" 
                  placeholder="Search name, email..." 
                  style={{ paddingLeft: '34px', height: '36px', fontSize: '13px' }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div style={{ overflowX: 'auto', minHeight: '400px' }}>
            {filteredUsers.length > 0 ? (
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Personnel</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Contact</th>
                    <th>System Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, var(--alis-primary), #7c3aed)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{user.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--alis-text-muted)' }}>ID: {user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`alis-badge-role alis-badge-${user.role.toLowerCase()}`}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', fontWeight: 500 }}>
                        {user.department_name || user.department || 'Administration'}
                      </td>
                      <td>
                        <a href={`mailto:${user.email}`} style={{ color: 'var(--alis-text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <Mail size={14} color="var(--alis-primary)"/> {user.email}
                        </a>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500 }}>
                          <div className={`erp-indicator ${user.is_active ? 'erp-indicator-online' : 'erp-indicator-offline'}`} /> 
                          {user.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--alis-text-muted)' }}>
                <Users size={40} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <p style={{ fontSize: '14px', fontWeight: 500 }}>No personnel match your search criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Directory;
