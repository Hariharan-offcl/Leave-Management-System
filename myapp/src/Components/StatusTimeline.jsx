import React from 'react';
import { CheckCircle, Clock, XCircle, AlertTriangle, ArrowRight, User } from 'lucide-react';
import AIInsightsPanel from './AIInsightsPanel';

const StatusTimeline = ({ leave }) => {
  if (!leave) {
    return (
      <div className="erp-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <AlertTriangle size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
        <p style={{ fontSize: '13px', color: 'var(--alis-text-muted)' }}>Select an application to view workflow</p>
      </div>
    );
  }

  const STAGES = {
    'PENDING_STAFF': { progress: 25, label: 'Staff Review', current: true },
    'PENDING_HOD': { progress: 50, label: 'HOD Review', current: true },
    'PENDING_PRINCIPAL': { progress: 75, label: 'Principal Final', current: true },
    'APPROVED': { progress: 100, label: 'Approved', current: true, success: true },
    'REJECTED': { progress: 100, label: 'Rejected', current: true, error: true },
    'ESCALATED': { progress: 80, label: 'Escalated to Bypass', current: true, warning: true },
    'RISKY': { progress: 100, label: 'Flagged Risk', current: true, error: true },
  };

  const getStageColor = (s) => {
    if (s?.includes('PENDING')) return 'var(--alis-warning)';
    if (s === 'APPROVED') return 'var(--alis-success)';
    if (s === 'REJECTED' || s === 'RISKY') return 'var(--alis-danger)';
    if (s === 'ESCALATED') return 'var(--alis-info)';
    return 'var(--alis-primary)';
  };

  const getStageIcon = (s) => {
    if (s?.includes('PENDING')) return <Clock size={16} color="white" />;
    if (s === 'APPROVED') return <CheckCircle size={16} color="white" />;
    if (s === 'REJECTED' || s === 'RISKY') return <XCircle size={16} color="white" />;
    return <AlertTriangle size={16} color="white" />;
  };

  const currentStage = STAGES[leave.status] || { progress: 0, label: leave.status };
  const explanationArray = typeof leave.explanation === 'string' ? JSON.parse(leave.explanation || '[]') : (leave.explanation || []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="erp-card">
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '24px' }}>Approval Workflow</h3>
        
        {/* Progress Bar */}
        <div style={{ marginBottom: '24px', padding: '0 12px' }}>
          <div className="alis-progress">
            <div className="alis-progress-bar" style={{ width: `${currentStage.progress}%`, background: getStageColor(leave.status) }}></div>
          </div>
        </div>

        <div style={{ position: 'relative', paddingLeft: '24px' }}>
          {/* Timeline Line */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '11px', width: '2px', background: 'var(--alis-border)' }}></div>

          {/* Submission Node */}
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <div style={{ position: 'absolute', left: '-22px', top: '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--alis-bg)', border: `2px solid var(--alis-primary)`, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--alis-primary)' }}></div>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Application Lodged</div>
            <div style={{ fontSize: '11px', color: 'var(--alis-text-muted)' }}>{new Date(leave.submitted_at || Date.now()).toLocaleString()}</div>
          </div>

          {/* Current Status Node */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '-24px', top: 0, width: '24px', height: '24px', borderRadius: '50%', background: getStageColor(leave.status), border: '2px solid var(--alis-bg-panel)', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getStageIcon(leave.status)}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: getStageColor(leave.status) }}>{currentStage.label}</div>
            {leave.reviewer_comment && (
              <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--alis-bg)', borderRadius: '8px', borderLeft: `2px solid ${getStageColor(leave.status)}`, fontSize: '12px' }}>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: '2px', color: 'var(--alis-text-muted)' }}><User size={10} style={{ display: 'inline', marginRight: '4px' }}/>{leave.reviewerName || 'Authority'} says:</span>
                "{leave.reviewer_comment}"
              </div>
            )}
          </div>
        </div>
      </div>

      {leave.priority_score !== undefined && (
        <AIInsightsPanel 
          priorityScore={leave.priority_score} 
          impactScore={leave.impact_score || 0} 
          riskScore={leave.risk_score || 0} 
          explanation={explanationArray}
        />
      )}
    </div>
  );
};

export default StatusTimeline;
