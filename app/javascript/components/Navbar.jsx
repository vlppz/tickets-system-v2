import React from 'react';
import { LogOut, Menu, X } from 'lucide-react';

function Navbar({ user, onLogout, currentPage, onNavigate }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <nav style={styles.navbar}>
      <div style={styles.navContent}>
        <div style={styles.logoSection}>
          <img src="/logo.png" alt="Tickets System" style={styles.logoImage} />
          <span style={styles.logoText}>Tickets System</span>
        </div>
        
        {/* Desktop Navigation */}
        <div style={styles.navLinks} className="desktop-nav">
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

        <div style={styles.userSection} className="desktop-user">
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

        {/* Mobile Hamburger */}
        <button 
          style={styles.hamburger}
          className="mobile-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={styles.mobileMenuOverlay} className="mobile-menu-overlay">
          <div style={styles.mobileMenuContent}>
            <button
              onClick={() => {
                onNavigate('tickets');
                setMobileMenuOpen(false);
              }}
              style={{
                ...styles.mobileNavLink,
                ...(currentPage === 'tickets' ? styles.mobileNavLinkActive : {})
              }}
            >
              Заявки
            </button>
            
            {user.is_admin && (
              <button
                onClick={() => {
                  onNavigate('forms');
                  setMobileMenuOpen(false);
                }}
                style={{
                  ...styles.mobileNavLink,
                  ...(currentPage === 'forms' ? styles.mobileNavLinkActive : {})
                }}
              >
                Создать форму
              </button>
            )}

            <div style={styles.mobileUserInfo}>
              <span style={styles.mobileUserEmail}>{user.email}</span>
            </div>

            <button 
              onClick={() => {
                onLogout();
                setMobileMenuOpen(false);
              }}
              style={styles.mobileLogoutButton}
            >
              <LogOut size={18} />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav,
          .desktop-user {
            display: none !important;
          }
          .mobile-hamburger {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-hamburger {
            display: none !important;
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .mobile-menu-overlay {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
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
  },
  hamburger: {
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#374151',
    transition: 'background-color 0.2s'
  },
  mobileMenuOverlay: {
    position: 'fixed',
    top: '65px',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 999,
    overflowY: 'auto'
  },
  mobileMenuContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '24px',
    minHeight: '100%'
  },
  mobileMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb'
  },
  mobileNavLink: {
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    textAlign: 'left'
  },
  mobileNavLinkActive: {
    backgroundColor: '#f3f4f6',
    color: '#1f2937'
  },
  mobileUserInfo: {
    padding: '12px 16px',
    borderTop: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    marginTop: '8px',
    marginBottom: '8px'
  },
  mobileUserEmail: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  mobileLogoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#dbeafe',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e40af',
    transition: 'background-color 0.2s'
  }
};

export default Navbar;
