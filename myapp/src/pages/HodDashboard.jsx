import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Users, Clock, Download, Brain, BarChart3, AlertTriangle } from 'lucide-react';
import Heatmap from '../components/Heatmap';
import LeaveWizard from '../components/LeaveWizard';
import LeaveGuidelines from '../components/LeaveGuidelines';
import StatusTimeline from '../components/StatusTimeline';
import BadgeDisplay from '../components/BadgeDisplay';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const HodDashboard = () => {
  const { currentUser, updateLeaveStatus, addUser, submitLeave, getMyLeaves, getWhosOutToday,
    users, leaves, capacityData, heatmapData, badges, departmentHealth } = useAppContext();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaffInfo, setNewStaffInfo] = useState({ name: '', email: '', password: '' });
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [reviewComment, setReviewComment] = useState('');

  const staff = users.filter(u => u.role === 'STAFF');
  const reviewableLeaves = leaves.filter(l => l.status === 'PENDING_HOD' && l.user_id !== currentUser.id);
  const myLeaves = getMyLeaves();
  const whosOut = getWhosOutToday();

  // Dept analytics
  const myDeptHealth = departmentHealth.find(d => d.departmentName === currentUser.department);
  const deptLeaves = leaves.filter(l => l.department_id === currentUser.department_id || l.dept_name === currentUser.department);
  const approvedCount = deptLeaves.filter(l => l.status === 'APPROVED').length;
  const avgScore = deptLeaves.length > 0 ? deptLeaves.reduce((s, l) => s + (l.priority_score || 0), 0) / deptLeaves.length : 0;

  const handleAddStaff = (e) => {
    e.preventDefault();
    addUser({ ...newStaffInfo, department: currentUser.department, role: 'STAFF' });
    setShowAddModal(false);
    setNewStaffInfo({ name: '', email: '', password: '' });
  };

  const handleStatusUpdate = async (id, status) => {
    await updateLeaveStatus(id, status, reviewComment);
    setReviewComment('');
    setSelectedLeave(null);
  };

  const exportCSV = () => {
    const headers = ['Name,Type,Start,End,Score,Status\n'];
    const rows = reviewableLeaves.map(l => `"${l.userName}","${l.leave_type}","${l.start_date}","${l.end_date}",${l.priority_score?.toFixed(0)},"${l.status}"\n`);
    const blob = new Blob([headers, ...rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'hod_audit.csv'; a.click();
  };

  return (
    <div className="erp-dashboard-grid">
      <div className="erp-col-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>{currentUser.department} — HOD Command Center</h1>
          <p style={{ color: 'var(--alis-text-muted)', fontSize: '13px' }}>Departmental hierarchy & Staff review portal</p>
        </div>
        <button className="erp-btn erp-btn-primary" onClick={() => setShowAddModal(true)}>
          <Users size={14} /> Add Staff
        </button>
      </div>

      {/* KPI Row */}
      <div className="erp-col-3">
        <div className="alis-stat-card">
          <div className="alis-stat-icon" style={{ background: 'var(--alis-primary-bg)', color: 'var(--alis-primary)' }}>👩‍🏫</div>
          <div className="alis-stat-value">{staff.length}</div>
          <div className="alis-stat-label">Department Staff</div>
        </div>
      </div>
      <div className="erp-col-3">
        <div className="alis-stat-card">
          <div className="alis-stat-icon" style={{ background: 'var(--alis-warning-bg)', color: 'var(--alis-warning)' }}>⏳</div>
          <div className="alis-stat-value">{reviewableLeaves.length}</div>
          <div className="alis-stat-label">Pending Review</div>
        </div>
      </div>
      <div className="erp-col-3">
        <div className="alis-stat-card">
          <div className="alis-stat-icon" style={{ background: 'var(--alis-success-bg)', color: 'var(--alis-success)' }}>📊</div>
          <div className="alis-stat-value">{avgScore.toFixed(0)}</div>
          <div className="alis-stat-label">Avg Priority Score</div>
        </div>
      </div>
      <div className="erp-col-3">
        <div className="alis-gradient-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <AlertTriangle size={16} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Availability</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>{myDeptHealth?.availabilityRate || 100}%</div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>{whosOut.length} on leave today</div>
        </div>
      </div>

      {/* Main */}
      <div className="erp-col-8">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Review Table */}
          <div className="erp-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--alis-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Staff Recommendations ({currentUser.department})</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button className="erp-btn erp-btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={exportCSV}><Download size={12} /> CSV</button>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--alis-primary)' }}>Staff → HOD</span>
              </div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '350px' }}>
              {reviewableLeaves.map(l => (
                <div key={l.id} onClick={() => setSelectedLeave(l)}
                  style={{ padding: '14px 20px', borderBottom: '1px solid var(--alis-border-subtle)', cursor: 'pointer',
                    background: selectedLeave?.id === l.id ? 'var(--alis-primary-bg)' : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{l.userName}</span>
                    <span className={`alis-score-${l.priority_score >= 70 ? 'high' : l.priority_score >= 40 ? 'medium' : 'low'}`}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                      {l.priority_score?.toFixed(0)}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--alis-text-muted)' }}>{l.start_date?.split('T')[0]} to {l.end_date?.split('T')[0]} · {l.leave_type}</p>
                  {selectedLeave?.id === l.id && l.status === 'PENDING_HOD' && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                      <input className="erp-input" placeholder="Comment..." style={{ height: '34px', flex: 1, fontSize: '12px' }}
                        value={reviewComment} onChange={e => setReviewComment(e.target.value)} />
                      <button className="erp-btn erp-btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}
                        onClick={() => handleStatusUpdate(l.id, 'APPROVED')}>Forward to Principal</button>
                      <button className="erp-btn erp-btn-outline" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--alis-danger)' }}
                        onClick={() => handleStatusUpdate(l.id, 'REJECTED')}>Reject</button>
                    </div>
                  )}
                </div>
              ))}
              {reviewableLeaves.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--alis-text-muted)', fontSize: '13px' }}>No requests pending in {currentUser.department}.</div>}
            </div>
          </div>

          {/* My Leave */}
          <div className="erp-card">
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>My Leave Application (HOD → Principal)</h3>
            <LeaveWizard onSubmit={(f) => submitLeave(f)} leaveTypes={['Casual', 'Sick', 'Duty Leave']} capacityData={capacityData} />
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="erp-col-4">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Heatmap data={heatmapData} title="Department Heatmap" subtitle={currentUser.department} />
          <StatusTimeline leave={selectedLeave} />
          <LeaveGuidelines balances={currentUser?.leaveInventory} />
          <BadgeDisplay badges={badges} />

          {/* Personal History */}
          <div className="erp-card" style={{ padding: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--alis-border)' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>My History</h3>
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {myLeaves.map(l => (
                <div key={l.id} onClick={() => setSelectedLeave(l)} style={{ padding: '10px 18px', borderBottom: '1px solid var(--alis-border-subtle)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{l.leave_type}</span>
                    <span className={`erp-badge erp-badge-${l.status?.toLowerCase()}`} style={{ fontSize: '10px' }}>{l.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="alis-modal-overlay">
          <div className="alis-modal">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Register Staff — {currentUser.department}</h2>
            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>Full Name</label><input required className="erp-input" value={newStaffInfo.name} onChange={e => setNewStaffInfo({...newStaffInfo, name: e.target.value})} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>Email</label><input required type="email" className="erp-input" value={newStaffInfo.email} onChange={e => setNewStaffInfo({...newStaffInfo, email: e.target.value})} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>Password</label><input required type="password" className="erp-input" value={newStaffInfo.password} onChange={e => setNewStaffInfo({...newStaffInfo, password: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="erp-btn erp-btn-outline" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="erp-btn erp-btn-primary" style={{ flex: 1 }}>Save Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodDashboard;
