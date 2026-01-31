import React from 'react';
import { LogOut } from 'lucide-react';

function Navbar({ user, onLogout, currentPage, onNavigate }) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <nav style={styles.navbar}>
      <div style={styles.navContent}>
        <div style={styles.logoSection}>
          <img src="/logo.png" alt="Tickets System" style={styles.logoImage} />
          <span style={styles.logoText}>Tickets System</span>
        </div>
        
        <div style={styles.navLinks}>
          <button
            onClick={() => onNavigate('tickets')}
            style={{
              ...styles.navLink,
              ...(currentPage === 'tickets' ? styles.navLinkActive : {})
            }}
          >
            Заявки
          </button>
          
          {user.is_admin && (
            <button
              onClick={() => onNavigate('forms')}
              style={{
                ...styles.navLink,
                ...(currentPage === 'forms' ? styles.navLinkActive : {})
              }}
            >
              Создать форму
            </button>
          )}
        </div>

        <div style={styles.userSection}>
          <span style={styles.userName}>{user.email}</span>
          <button 
            onClick={onLogout} 
            className="logout-btn"
            style={{
              ...styles.logoutButton,
              ...(isHovered ? styles.logoutButtonHover : {})
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <LogOut size={18} />
            <span>Выйти</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px 0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoImage: {
    height: '32px',
    width: 'auto'
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937'
  },
  navLinks: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    justifyContent: 'center'
  },
  navLink: {
    padding: '8px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s',
    fontFamily: 'inherit'
  },
  navLinkActive: {
    backgroundColor: '#f3f4f6',
    color: '#1f2937'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  userName: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#dbeafe',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e40af',
    transition: 'background-color 0.2s'
  },
  logoutButtonHover: {
    backgroundColor: '#bfdbfe'
  }
};

export default Navbar;
