import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  LayoutDashboard, Users, FileText, LogOut, Bell, Menu,
  Sun, Moon, Settings as SettingsIcon, Minimize2, Maximize2, Brain
} from 'lucide-react';
import styles from './Layout.module.css';
import clsx from 'clsx';
import BadgeDisplay from './BadgeDisplay';

const Layout = () => {
  const { currentUser, logout, theme, toggleTheme, zenMode, setZenMode, badges } = useAppContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavLinks = () => {
    const role = currentUser?.role;
    const links = [
      { path: `/dashboard/${role?.toLowerCase()}`, icon: LayoutDashboard, label: 'Command Center' }
    ];

    if (['PRINCIPAL', 'HOD', 'STAFF'].includes(role)) {
      links.push({ path: '/dashboard/directory', icon: Users, label: 'Directory' });
    }

    links.push({ path: '/dashboard/history', icon: FileText, label: 'Leave History' });

    if (role === 'PRINCIPAL') {
      links.push({ path: '/dashboard/settings', icon: SettingsIcon, label: 'System Config' });
    }

    return links;
  };

  return (
    <div className={styles.layout}>
      <aside className={clsx(styles.sidebar, 'alis-sidebar')}>
        <div className={styles.brand}>
          <Brain className={styles.brandIcon} size={28} />
          <h2>
            ALIS
            <span>Adaptive Leave Intelligence</span>
          </h2>
        </div>
        
        <nav className={styles.nav}>
          {getNavLinks().map((link, idx) => (
            <NavLink 
              key={idx} 
              to={link.path}
              className={({ isActive }) => clsx(styles.navLink, isActive && styles.active)}
            >
              <link.icon size={18} />
              <span className="nav-label">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {badges.length > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <BadgeDisplay badges={badges} compact />
          </div>
        )}

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} />
            <span className="sidebar-footer-text">Sign Out</span>
          </button>
        </div>
      </aside>

      <div className={clsx(styles.mainContent, 'alis-main')}>
        <header className={styles.header}>
          <div className={styles.mobileTrigger}>
            <Menu size={24} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentUser?.department && currentUser.department !== 'Administration' && (
              <span className={styles.deptBadge}>{currentUser.department}</span>
            )}
          </div>

          <div className={styles.headerRight}>
            <button onClick={() => setZenMode(!zenMode)} className={styles.iconBtn} title="Zen Mode">
              {zenMode ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button onClick={toggleTheme} className={styles.iconBtn} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className={styles.iconBtn}>
              <Bell size={16} />
            </button>
            <div className={styles.userProfile}>
              <div className={styles.avatar}>
                {currentUser?.name?.charAt(0)}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{currentUser?.name}</span>
                <span className={styles.userRole}>{currentUser?.role}</span>
              </div>
            </div>
          </div>
        </header>

        <main className={styles.pageContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
