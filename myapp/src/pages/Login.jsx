import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Brain, Sun, Moon, ArrowRight, UserPlus, Shield } from 'lucide-react';
import styles from './Login.module.css';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, registerPrincipal, principalExists, theme, toggleTheme } = useAppContext();
  const navigate = useNavigate();

  const handleAction = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      let success = false;
      if (isRegistering) {
        success = await registerPrincipal(formData);
      } else {
        success = await login(formData.email, formData.password);
      }

      if (success) {
        navigate('/');
      } else {
        setError(isRegistering 
          ? 'Registration failed. System may already have a Principal.' 
          : 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('Connection to ALIS server failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <button className={styles.themeToggle} onClick={toggleTheme}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className={styles.loginCard}>
        <div className={styles.logoContainer}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <Brain size={40} color="var(--alis-primary)" style={{ filter: 'drop-shadow(0 0 8px var(--alis-primary-glow))' }} />
          </div>
          <h1>{isRegistering ? 'System Setup' : 'A.L.I.S'}</h1>
          <p>{isRegistering ? 'Initialize Principal Account' : 'Adaptive Leave Intelligence System'}</p>
        </div>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <form onSubmit={handleAction} className={styles.loginForm}>
          {isRegistering && (
            <div className={styles.formGroup}>
              <label>Full Name</label>
              <input 
                required type="text" className="erp-input"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Principal Name" disabled={isSubmitting}
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Email Address</label>
            <input 
              required type="email" className="erp-input"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="admin@institution.edu" disabled={isSubmitting}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Password</label>
            <input 
              required type="password" className="erp-input"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="••••••••" disabled={isSubmitting}
            />
          </div>

          <button type="submit" className="erp-btn erp-btn-primary" 
            style={{ width: '100%', marginTop: '8px', padding: '12px' }} disabled={isSubmitting}>
            {isSubmitting ? 'Authenticating...' : (isRegistering ? 'Initialize System' : 'Access Command Center')}
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>

        {!principalExists && !isRegistering && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button onClick={() => setIsRegistering(true)}
              className="erp-btn erp-btn-outline" style={{ width: '100%' }}>
              <UserPlus size={16} /> New System? Register Principal
            </button>
          </div>
        )}

        {isRegistering && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button type="button" onClick={() => setIsRegistering(false)}
              className="erp-btn" style={{ fontSize: '13px', color: 'var(--alis-text-muted)' }}>
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
