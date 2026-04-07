import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Users, Clock, CheckCircle, Download, Brain, AlertTriangle } from 'lucide-react';
import LeaveWizard from '../components/LeaveWizard';
import LeaveGuidelines from '../components/LeaveGuidelines';
import StatusTimeline from '../components/StatusTimeline';
import Heatmap from '../components/Heatmap';
import BadgeDisplay from '../components/BadgeDisplay';

const StaffDashboard = () => {
  const { currentUser, updateLeaveStatus, addUser, submitLeave, getMyLeaves, getWhosOutToday,
    users, leaves, capacityData, heatmapData, badges } = useAppContext();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentInfo, setNewStudentInfo] = useState({ name: '', email: '', password: '' });
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [reviewComment, setReviewComment] = useState('');

  // Department-scoped: only see same-department PENDING_STAFF
  const students = users.filter(u => u.role === 'STUDENT');
  const reviewableLeaves = leaves.filter(l => l.status === 'PENDING_STAFF' && l.user_id !== currentUser.id);
  const myLeaves = getMyLeaves();
  const whosOut = getWhosOutToday();

  const handleAddStudent = (e) => {
    e.preventDefault();
    addUser({ ...newStudentInfo, department: currentUser.department, role: 'STUDENT' });
    setShowAddModal(false);
    setNewStudentInfo({ name: '', email: '', password: '' });
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
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'staff_audit.csv'; a.click();
  };

  return (
    <div className="erp-dashboard-grid">
      <div className="erp-col-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Staff Command Center</h1>
          <p style={{ color: 'var(--alis-text-muted)', fontSize: '13px' }}>
            {currentUser.department} Department · Student verification portal
          </p>
        </div>
        <button className="erp-btn erp-btn-primary" onClick={() => setShowAddModal(true)}>
          <Users size={14} /> Register Student
        </button>
      </div>

      {/* KPI Row */}
      <div className="erp-col-3">
        <div className="alis-stat-card">
          <div className="alis-stat-icon" style={{ background: 'var(--alis-primary-bg)', color: 'var(--alis-primary)' }}>👥</div>
          <div className="alis-stat-value">{students.length}</div>
          <div className="alis-stat-label">My Students</div>
        </div>
      </div>
      <div className="erp-col-3">
        <div className="alis-stat-card">
          <div className="alis-stat-icon" style={{ background: 'var(--alis-warning-bg)', color: 'var(--alis-warning)' }}>⏳</div>
          <div className="alis-stat-value">{reviewableLeaves.length}</div>
          <div className="alis-stat-label">Pending Reviews</div>
        </div>
      </div>
      <div className="erp-col-3">
        <div className="alis-stat-card">
          <div className="alis-stat-icon" style={{ background: 'var(--alis-danger-bg)', color: 'var(--alis-danger)' }}>🏖️</div>
          <div className="alis-stat-value">{whosOut.length}</div>
          <div className="alis-stat-label">On Leave Today</div>
        </div>
      </div>
      <div className="erp-col-3">
        <div className="alis-stat-card">
          <div className="alis-stat-icon" style={{ background: 'var(--alis-success-bg)', color: 'var(--alis-success)' }}>✅</div>
          <div className="alis-stat-value">{myLeaves.filter(l => l.status === 'APPROVED').length}</div>
          <div className="alis-stat-label">My Approved</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="erp-col-8">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Review Table */}
          <div className="erp-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--alis-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Student Verifications</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button className="erp-btn erp-btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={exportCSV}>
                  <Download size={12} /> CSV
                </button>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--alis-primary)' }}>Student → Staff (Verify)</span>
              </div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '350px' }}>
              {reviewableLeaves.map(l => (
                <div key={l.id} onClick={() => setSelectedLeave(l)}
                  style={{ padding: '14px 20px', borderBottom: '1px solid var(--alis-border-subtle)', cursor: 'pointer',
                    background: selectedLeave?.id === l.id ? 'var(--alis-primary-bg)' : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{l.userName}</span>
                      <span style={{ fontSize: '11px', color: 'var(--alis-text-muted)' }}>{l.dept_name || l.department}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`alis-score-${l.priority_score >= 70 ? 'high' : l.priority_score >= 40 ? 'medium' : 'low'}`}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                        {l.priority_score?.toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--alis-text-muted)' }}>{l.start_date?.split('T')[0]} to {l.end_date?.split('T')[0]} · {l.leave_type}</p>
                  {selectedLeave?.id === l.id && l.status === 'PENDING_STAFF' && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                      <input className="erp-input" placeholder="Comment..." style={{ height: '34px', flex: 1, fontSize: '12px' }}
                        value={reviewComment} onChange={e => setReviewComment(e.target.value)} />
                      <button className="erp-btn erp-btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}
                        onClick={() => handleStatusUpdate(l.id, 'APPROVED')}>Verify & Forward</button>
                      <button className="erp-btn erp-btn-outline" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--alis-danger)' }}
                        onClick={() => handleStatusUpdate(l.id, 'REJECTED')}>Reject</button>
                    </div>
                  )}
                </div>
              ))}
              {reviewableLeaves.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--alis-text-muted)', fontSize: '13px' }}>No student requests pending in {currentUser.department}.</div>}
            </div>
          </div>

          {/* My Leave Application */}
          <div className="erp-card">
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>My Leave Application (Staff → HOD)</h3>
            <LeaveWizard onSubmit={(f) => submitLeave(f)} leaveTypes={['Casual', 'Sick', 'Earned', 'Duty Leave']} capacityData={capacityData} />
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="erp-col-4">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Heatmap data={heatmapData} title="Dept Leave Heatmap" subtitle={currentUser.department} />
          <StatusTimeline leave={selectedLeave} />
          <LeaveGuidelines balances={currentUser?.leaveInventory} />
          <BadgeDisplay badges={badges} />
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="alis-modal-overlay">
          <div className="alis-modal">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Register Student — {currentUser.department}</h2>
            <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>Full Name</label><input required className="erp-input" value={newStudentInfo.name} onChange={e => setNewStudentInfo({...newStudentInfo, name: e.target.value})} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>Email</label><input required type="email" className="erp-input" value={newStudentInfo.email} onChange={e => setNewStudentInfo({...newStudentInfo, email: e.target.value})} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>Password</label><input required type="password" className="erp-input" value={newStudentInfo.password} onChange={e => setNewStudentInfo({...newStudentInfo, password: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="erp-btn erp-btn-outline" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="erp-btn erp-btn-primary" style={{ flex: 1 }}>Register</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
