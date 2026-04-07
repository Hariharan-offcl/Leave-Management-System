import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Calendar, Download, Search, HelpCircle, Sparkles } from 'lucide-react';
import LeaveWizard from '../components/LeaveWizard';
import LeaveGuidelines from '../components/LeaveGuidelines';
import StatusTimeline from '../components/StatusTimeline';
import BadgeDisplay from '../components/BadgeDisplay';
import api from '../services/api';

const StudentDashboard = () => {
  const { currentUser, submitLeave, getMyLeaves, leaveTypes, capacityData, badges } = useAppContext();
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    api.get('/ai/recommendations').then(r => setRecommendations(r.data.recommendations || [])).catch(() => {});
  }, []);

  const myLeaves = getMyLeaves().filter(l =>
    l.leave_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.status?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const balances = currentUser?.leaveInventory || {};

  const handleApplyLeave = async (formData) => {
    await submitLeave(formData);
  };

  const exportCSV = () => {
    const headers = ['Type,Start Date,End Date,Status,Score\n'];
    const rows = myLeaves.map(l =>
      `${l.leave_type},${l.start_date},${l.end_date},${l.status},${l.priority_score?.toFixed(0) || 0}\n`
    );
    const blob = new Blob([headers, ...rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `leave_history_${currentUser.name}.csv`; a.click();
  };

  return (
    <div className="erp-dashboard-grid">
      <div className="erp-col-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Student Leave Portal</h1>
          <p style={{ color: 'var(--alis-text-muted)', fontSize: '13px' }}>
            Department: <strong>{currentUser?.department}</strong> · Flow: Student → Staff → HOD
          </p>
        </div>
        <button className="erp-btn erp-btn-outline" onClick={exportCSV}>
          <Download size={14} /> Export
        </button>
      </div>

      {/* Main */}
      <div className="erp-col-8">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <LeaveWizard onSubmit={handleApplyLeave} leaveTypes={['Casual', 'Sick', 'Medical', 'Academic']} capacityData={capacityData} />

          {/* AI Recommendations */}
          {recommendations.length > 0 && (
            <div className="erp-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Sparkles size={16} color="var(--alis-accent)" />
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Recommended Leave Dates</h3>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {recommendations.map((r, i) => (
                  <div key={i} style={{
                    padding: '10px 14px', borderRadius: '10px',
                    background: r.score === 'excellent' ? 'var(--alis-success-bg)' : 'var(--alis-warning-bg)',
                    border: `1px solid ${r.score === 'excellent' ? 'var(--alis-success)' : 'var(--alis-warning)'}`,
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: 600 }}>{r.dayName}, {r.date}</div>
                    <div style={{ color: 'var(--alis-text-muted)', fontSize: '11px' }}>
                      Team load: {r.loadPercentage}% · {r.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          <div className="erp-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--alis-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>My Applications</h3>
              <div style={{ position: 'relative', width: '180px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--alis-text-muted)' }} />
                <input className="erp-input" placeholder="Search..." style={{ paddingLeft: '30px', height: '34px', fontSize: '12px' }}
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '350px' }}>
              {myLeaves.map(leave => (
                <div key={leave.id} onClick={() => setSelectedLeave(leave)}
                  style={{ padding: '14px 20px', borderBottom: '1px solid var(--alis-border-subtle)', cursor: 'pointer',
                    background: selectedLeave?.id === leave.id ? 'var(--alis-primary-bg)' : 'transparent', transition: 'background 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{leave.leave_type} Leave</span>
                    <span className={`erp-badge erp-badge-${leave.status?.toLowerCase().replace(/_/g, '_')}`}>{leave.status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--alis-text-muted)' }}>
                    <span>{leave.start_date?.split('T')[0]} → {leave.end_date?.split('T')[0]}</span>
                    <span>Score: {leave.priority_score?.toFixed(0)}</span>
                  </div>
                </div>
              ))}
              {myLeaves.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--alis-text-muted)' }}>No records found.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="erp-col-4">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <LeaveGuidelines balances={balances} />
          <BadgeDisplay badges={badges} />
          <StatusTimeline leave={selectedLeave} />

          <div className="erp-card" style={{ borderLeft: '4px solid var(--alis-info)' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <HelpCircle size={18} color="var(--alis-info)" />
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600 }}>How it works</h4>
                <p style={{ fontSize: '11px', color: 'var(--alis-text-muted)', marginTop: '4px', lineHeight: '1.5' }}>
                  1. Submit application → routed to your department's Staff<br/>
                  2. Staff verifies → forwards to department HOD<br/>
                  3. HOD reviews → sends to Principal for final approval
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
