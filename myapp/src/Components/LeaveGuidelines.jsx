import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Info, Calculator, Rocket } from 'lucide-react';

const LeaveGuidelines = ({ balances }) => {
  const { systemRules, emergencyOverride } = useAppContext();

  return (
    <div className="erp-card" style={{ 
      borderLeft: `4px solid ${emergencyOverride ? 'var(--alis-danger)' : 'var(--alis-primary)'}` 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Info size={18} color={emergencyOverride ? 'var(--alis-danger)' : 'var(--alis-primary)'} />
        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Policy Guidelines</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {emergencyOverride && (
          <div style={{ 
            background: 'var(--alis-danger-bg)', color: 'var(--alis-danger)', 
            padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600 
          }}>
            🚨 SYSTEM EMERGENCY OVERRIDE ACTIVE
          </div>
        )}

        <div style={{ background: 'var(--alis-bg)', padding: '12px', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '10px' }}>
            <span style={{ fontWeight: 600 }}>Available Balances</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {Object.entries(balances || {})
              .filter(([key]) => !['user_id', 'last_updated', 'id'].includes(key))
              .map(([type, val]) => (
                <div key={type} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', borderRadius: '8px', 
                  background: 'var(--alis-bg-panel)', border: '1px solid var(--alis-border)'
                }}>
                  <span style={{ fontSize: '11px', textTransform: 'capitalize', fontWeight: 500, color: 'var(--alis-text-muted)' }}>
                    {type}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--alis-primary)' }}>{val}</span>
                </div>
              ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Calculator size={14} color="var(--alis-success)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600 }}>Smart Scoring</div>
            <p style={{ fontSize: '11px', color: 'var(--alis-text-muted)' }}>
              Apply <b>10+ days</b> ahead for a <b>+{systemRules.early_planning_bonus || 10}</b> bonus.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Rocket size={14} color="var(--alis-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600 }}>Auto-Approval</div>
            <p style={{ fontSize: '11px', color: 'var(--alis-text-muted)' }}>
              Score above <b>80</b> with no conflicts = fast-tracked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveGuidelines;
