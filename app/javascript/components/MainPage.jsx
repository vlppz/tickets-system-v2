import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import LoginPage from './LoginPage';

function MainPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [transitioning, setTransitioning] = useState(false);
  const [expandingPanel, setExpandingPanel] = useState(false);

  useEffect(() => {
    // Check if we just logged out from another page
    if (sessionStorage.getItem('justLoggedOut') === 'true') {
      setTransitioning(true);
      sessionStorage.removeItem('justLoggedOut');
      // Reset after animation completes (800ms for shrink animation)
      setTimeout(() => setTransitioning(false), 800);
    }
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      const data = await response.json();
      setUser(data.user);
      
      if (data.user) {
        fetchForms();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchForms = async () => {
    try {
      const response = await fetch('/api/forms/all', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
          setForms(data.forms || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    }
  };

  const handleLogout = async () => {
    setTransitioning(true);
    
    await fetch('/api/auth/logout', {
      credentials: 'include'
    });
    
    setTimeout(() => {
      setUser(null);
      setForms([]);
      setExpandingPanel(true);
    }, 600);
    
    setTimeout(() => {
      setExpandingPanel(false);
    }, 1500);
    
    setTimeout(() => {
      setTransitioning(false);
    }, 1600);
  };

  const handleLoginSuccess = (userData) => {
    setExpandingPanel(true);
    
    setTimeout(() => {
      setUser(userData);
      fetchForms();
    }, 900);
    
    setTimeout(() => {
      setExpandingPanel(false);
    }, 1000);
  };

  const handleViewForm = (formId) => {
    // TODO: Navigate to form view/fill page
    console.log('View form:', formId);
  };

  const handleNavigate = (page) => {
    if (page === 'forms') {
      window.location.href = '/forms/builder';
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <>
      {expandingPanel && (
        <div style={styles.expandingOverlay} className="expanding-overlay">
          <div style={styles.expandingContent}></div>
        </div>
      )}
      
      {!user ? (
        <>
          <LoginPage 
            onLoginSuccess={handleLoginSuccess} 
            isTransitioning={expandingPanel}
            isReversing={transitioning}
          />
        </>
      ) : (
        <div style={{
          ...styles.container,
          ...styles.pageTransition,
          opacity: (expandingPanel || transitioning) ? 0 : 1
        }}>
          <Navbar user={user} onLogout={handleLogout} currentPage="tickets" onNavigate={handleNavigate} />
          
          <main style={styles.main}>
            <div style={styles.content}>
              <h1 style={styles.pageTitle}>Доступные заявки</h1>
              
              {forms.length === 0 ? (
                <div style={styles.empty}>
                  <p>Нет доступных заявок</p>
                </div>
              ) : (
                <div style={styles.grid}>
                  {forms.map(form => (
                    <div key={form.id} style={styles.formCard}>
                      <h3 style={styles.formTitle}>{form.name}</h3>
                      <button 
                        style={styles.viewFormButton}
                        onClick={() => handleViewForm(form.id)}
                      >
                        Заполнить заявку
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  pageTransition: {
    transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  main: {
    padding: '40px 0'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px'
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '40px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    fontWeight: '500',
    color: '#6b7280'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s'
  },
  formTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px'
  },
  viewFormButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

export default MainPage;
