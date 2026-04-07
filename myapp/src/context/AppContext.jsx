import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [badges, setBadges] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('alis_theme') || 'dark');
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('alis_theme_color') || '#6366f1');
  const [density, setDensity] = useState(() => localStorage.getItem('alis_density') || 'comfortable');
  const [zenMode, setZenMode] = useState(false);
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [systemRules, setSystemRules] = useState({});
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState(null);
  const [principalExists, setPrincipalExists] = useState(true);
  const [capacityData, setCapacityData] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [departmentHealth, setDepartmentHealth] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);

  // Authentication & Initial Load
  useEffect(() => {
    const initApp = async () => {
      try {
        const pRes = await api.get('/users/check-principal');
        setPrincipalExists(pRes.data.exists);
      } catch (e) {
        console.error("Setup check failed");
      }

      const token = localStorage.getItem('alis_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setCurrentUser(res.data);
          setBadges(res.data.badges || []);
          await refreshData(res.data);
        } catch (err) {
          localStorage.removeItem('alis_token');
        }
      }
      setLoading(false);
    };
    initApp();
  }, []);

  const refreshData = async (user) => {
    const u = user || currentUser;
    if (!u) return;
    
    const isPrincipal = u?.role === 'PRINCIPAL';
    const isHOD = u?.role === 'HOD';

    // Helper to fetch and set state safely
    const safeFetch = async (endpoint, setter, label) => {
      try {
        const res = await api.get(endpoint);
        setter(res.data);
      } catch (err) {
        console.warn(`⚠️ Partial Load Failure [${label}]:`, err.message);
      }
    };

    // Parallel but independent fetches
    await Promise.all([
      safeFetch('/leaves', setLeaves, 'Leaves'),
      safeFetch('/users/subordinates', setUsers, 'Subordinates'),
      safeFetch('/analytics/predictions', setPredictions, 'Predictions'),
      safeFetch('/analytics/capacity', setCapacityData, 'Capacity'),
      safeFetch('/departments', setDepartments, 'Departments'),
      safeFetch('/badges', setBadges, 'Badges'),
      safeFetch('/analytics/heatmap', setHeatmapData, 'Heatmap'),
      isPrincipal ? safeFetch('/analytics/comparison', setComparisonData, 'Comparison') : Promise.resolve(),
      (isPrincipal || isHOD) ? safeFetch('/ai/department-health', setDepartmentHealth, 'Health') : Promise.resolve(),
    ]);

    // Fetch Global Settings separately
    try {
      const [settingsRes, rulesRes] = await Promise.all([
        api.get('/admin/settings'),
        isPrincipal ? api.get('/admin/rules') : Promise.resolve({ data: [] })
      ]);
      setEmergencyOverride(settingsRes.data.emergency_override || false);
      if (Array.isArray(rulesRes.data)) {
        const rulesObj = rulesRes.data.reduce((acc, r) => ({ ...acc, [r.rule_key]: r.rule_value }), {});
        setSystemRules(rulesObj);
      }
    } catch (e) {
      console.warn("⚠️ Settings/Rules Load Failure:", e.message);
    }
  };

  useEffect(() => {
    localStorage.setItem('alis_theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('alis_theme_color', themeColor);
    document.documentElement.style.setProperty('--alis-primary', themeColor);
    document.documentElement.style.setProperty('--erp-primary', themeColor);
  }, [themeColor]);

  useEffect(() => {
    localStorage.setItem('alis_density', density);
    if (density === 'compact') document.documentElement.classList.add('compact');
    else document.documentElement.classList.remove('compact');
  }, [density]);

  useEffect(() => {
    if (zenMode) document.documentElement.classList.add('zen-mode');
    else document.documentElement.classList.remove('zen-mode');
  }, [zenMode]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('alis_token', res.data.token);
      setCurrentUser(res.data.user);
      setBadges(res.data.user.badges || []);
      await refreshData(res.data.user);
      return true;
    } catch (err) {
      console.error('Login failed:', err);
      return false;
    }
  };

  const registerPrincipal = async (userData) => {
    try {
      const res = await api.post('/auth/register-principal', userData);
      localStorage.setItem('alis_token', res.data.token);
      setCurrentUser(res.data.user);
      setPrincipalExists(true);
      await refreshData(res.data.user);
      return true;
    } catch (err) {
      console.error('Registration failed:', err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('alis_token');
    setCurrentUser(null);
    setLeaves([]);
    setUsers([]);
    setBadges([]);
  };

  const addUser = async (userData) => {
    try {
      await api.post('/users', userData);
      await refreshData();
    } catch (err) {
      console.error('Error adding user:', err);
      throw err;
    }
  };

  const submitLeave = async (leaveData) => {
    try {
      const submitRes = await api.post('/leaves', leaveData);
      await refreshData();
      return submitRes.data;
    } catch (err) {
      console.error('Error submitting leave:', err);
    }
  };

  const updateLeaveStatus = async (leaveId, status, comment) => {
    try {
      await api.patch(`/leaves/${leaveId}`, { status, comment });
      await refreshData();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const toggleEmergencyOverride = async (val) => {
    try {
      await api.patch('/admin/settings', { key: 'emergency_override', value: val });
      setEmergencyOverride(val);
    } catch (err) {
      console.error("Failed to update emergency override", err);
    }
  };

  // Helper functions
  const getSubordinates = () => users;
  const getSubordinateLeaves = () => leaves.filter(l => l.user_id !== currentUser?.id);
  const getMyLeaves = () => leaves.filter(l => l.user_id === currentUser?.id);
  const getWhosOutToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return leaves.filter(l => l.status === 'APPROVED' && today >= l.start_date?.split('T')[0] && today <= l.end_date?.split('T')[0]);
  };

  const leaveTypes = ['Casual', 'Sick', 'Earned', 'Medical', 'Emergency'];

  return (
    <AppContext.Provider value={{
      theme, themeColor, setThemeColor, density, setDensity,
      zenMode, setZenMode,
      emergencyOverride, toggleEmergencyOverride, systemRules,
      toggleTheme,
      users, leaves, currentUser, loading,
      predictions, principalExists,
      departments, badges, departmentHealth, heatmapData,
      login, logout, registerPrincipal,
      addUser, submitLeave, updateLeaveStatus,
      getSubordinates, getSubordinateLeaves, getMyLeaves, getWhosOutToday,
      leaveTypes, refreshData,
      capacityData, comparisonData
    }}>
      {!loading && children}
    </AppContext.Provider>
  );
};
