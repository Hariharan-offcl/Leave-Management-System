import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react';

const AIInsightsPanel = ({ priorityScore, impactScore, riskScore, explanation = [], compact = false }) => {
  const getScoreClass = (score) => {
    if (score >= 70) return 'alis-score-high';
    if (score >= 40) return 'alis-score-medium';
    return 'alis-score-low';
  };

  const getScoreLabel = (score) => {
    if (score >= 70) return 'Excellent';
    if (score >= 40) return 'Moderate';
    return 'Low';
  };

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className={getScoreClass(priorityScore)} style={{
          width: '36px', height: '36px', borderRadius: '50%', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700
        }}>
          {Math.round(priorityScore)}
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600 }}>Priority: {getScoreLabel(priorityScore)}</div>
          <div style={{ fontSize: '11px', color: 'var(--alis-text-muted)' }}>
            Impact: {Math.round(impactScore || 0)}% · Risk: {Math.round(riskScore || 0)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="erp-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--alis-primary), #7c3aed)', padding: '6px', borderRadius: '8px' }}>
          <Zap size={16} color="white" />
        </div>
        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Intelligence Analysis</h3>
      </div>

      {/* Score Rings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div className={getScoreClass(priorityScore)} style={{
            width: '52px', height: '52px', borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, margin: '0 auto'
          }}>
            {Math.round(priorityScore || 0)}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--alis-text-muted)', marginTop: '6px', fontWeight: 600 }}>PRIORITY</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className={getScoreClass(100 - (impactScore || 0))} style={{
            width: '52px', height: '52px', borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, margin: '0 auto'
          }}>
            {Math.round(impactScore || 0)}%
          </div>
          <div style={{ fontSize: '10px', color: 'var(--alis-text-muted)', marginTop: '6px', fontWeight: 600 }}>IMPACT</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className={getScoreClass(100 - (riskScore || 0))} style={{
            width: '52px', height: '52px', borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, margin: '0 auto'
          }}>
            {Math.round(riskScore || 0)}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--alis-text-muted)', marginTop: '6px', fontWeight: 600 }}>RISK</div>
        </div>
      </div>

      {/* XAI Explanations */}
      {explanation.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--alis-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Scoring Factors
          </h4>
          {explanation.map((e, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', background: 'var(--alis-bg)', borderRadius: '8px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {e.impact?.startsWith('+') ? (
                  <TrendingUp size={14} color="var(--alis-success)" />
                ) : (
                  <TrendingDown size={14} color="var(--alis-danger)" />
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>{e.factor}</div>
                  <div style={{ fontSize: '11px', color: 'var(--alis-text-muted)' }}>{e.detail}</div>
                </div>
              </div>
              <span style={{
                fontWeight: 700, fontSize: '13px',
                color: e.impact?.startsWith('+') ? 'var(--alis-success)' : 'var(--alis-danger)'
              }}>
                {e.impact}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIInsightsPanel;
