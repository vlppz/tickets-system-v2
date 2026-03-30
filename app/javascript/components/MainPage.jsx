import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import LoginPage from './LoginPage';
import FormRenderer from './FormRenderer';
import Footer from './Footer';
import { themeStyles } from '../lib/theme';

const STATUS_CONFIG = {
  approved: { label: 'Подтверждено', color: '#065f46', bg: '#d1fae5' },
  edits_required: { label: 'Нужны правки', color: '#991b1b', bg: '#fee2e2' },
  waiting: { label: 'Ожидает проверки', color: '#374151', bg: '#f3f4f6' }
};

function MainPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [myAnswers, setMyAnswers] = useState({});
  const [transitioning, setTransitioning] = useState(false);
  const [expandingPanel, setExpandingPanel] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [expandingToForm, setExpandingToForm] = useState(false);
  const [shrinkingFromForm, setShrinkingFromForm] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('justLoggedOut') === 'true') {
      setTransitioning(true);
      sessionStorage.removeItem('justLoggedOut');
      setTimeout(() => setTransitioning(false), 800);
    }
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await response.json();
      setUser(data.user);
      if (data.user) {
        await fetchForms();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchForms = async () => {
    try {
      const response = await fetch('/api/forms/all', { credentials: 'include' });
      if (!response.ok) return;
      const data = await response.json();
      if (data.status !== 'ok') return;

      const fetchedForms = data.forms || [];
      setForms(fetchedForms);

      const answerResults = await Promise.all(
        fetchedForms.map(form =>
          fetch(`/api/forms/answers/my?form_id=${form.id}`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => ({ formId: form.id, answer: d.id ? d : null }))
            .catch(() => ({ formId: form.id, answer: null }))
        )
      );

      const answersMap = {};
      answerResults.forEach(({ formId, answer }) => {
        if (answer) answersMap[formId] = answer;
      });
      setMyAnswers(answersMap);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    }
  };

  const handleLogout = async () => {
    setTransitioning(true);
    await fetch('/api/auth/logout', { credentials: 'include' });
    setTimeout(() => {
      setUser(null);
      setForms([]);
      setMyAnswers({});
      setExpandingPanel(true);
    }, 600);
    setTimeout(() => setExpandingPanel(false), 1500);
    setTimeout(() => setTransitioning(false), 1600);
  };

  const handleLoginSuccess = (userData) => {
    setExpandingPanel(true);
    setTimeout(() => {
      setUser(userData);
      fetchForms();
    }, 900);
    setTimeout(() => setExpandingPanel(false), 1000);
  };

  const handleViewForm = (formId) => {
    setExpandingToForm(true);
    setTimeout(() => setSelectedFormId(formId), 500);
  };

  const handleFormReady = () => {
    setExpandingToForm(false);
  };

  const handleBackFromForm = () => {
    setShrinkingFromForm(true);
    setTimeout(() => {
      setSelectedFormId(null);
      fetchForms();
    }, 300);
    setTimeout(() => setShrinkingFromForm(false), 700);
  };

  const handleNavigate = (page) => {
    if (page === 'all_forms') window.location.href = '/admin/forms';
    if (page === 'answers') window.location.href = '/admin/answers';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  const submittedForms = forms.filter(f => myAnswers[f.id]);
  const availableForms = forms.filter(f => !myAnswers[f.id]);

  return (
    <>
      {expandingPanel && (
        <div style={styles.expandingOverlay} className="expanding-overlay">
          <div style={styles.expandingContent}></div>
        </div>
      )}

      {expandingToForm && (
        <div style={{ ...styles.expandingOverlay, backgroundColor: 'var(--color-surface)' }} className="expanding-overlay">
          <div style={styles.expandingContent}></div>
        </div>
      )}

      {!user ? (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          isTransitioning={expandingPanel}
          isReversing={transitioning}
        />
      ) : selectedFormId ? (
        <FormRenderer
          formId={selectedFormId}
          onBack={handleBackFromForm}
          onReady={handleFormReady}
          isTransitioning={expandingToForm}
          isReversing={shrinkingFromForm}
        />
      ) : (
        <div style={{
          ...styles.container,
          ...styles.pageTransition,
          opacity: (expandingPanel || transitioning || expandingToForm || shrinkingFromForm) ? 0 : 1
        }}>
          <Navbar user={user} onLogout={handleLogout} currentPage="tickets" onNavigate={handleNavigate} />

          <main style={styles.main}>
            <div style={styles.content}>

              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Доступные заявки</h2>
                {availableForms.length === 0 ? (
                  <div style={styles.empty}>
                    <p>Нет доступных заявок</p>
                  </div>
                ) : (
                  <div style={styles.grid}>
                    {availableForms.map(form => (
                      <div key={form.id} style={styles.formCard}>
                        <div style={styles.cardTop}>
                          <h3 style={styles.formName}>{form.name}</h3>
                        </div>
                        <button
                          style={styles.viewFormButton}
                          onClick={() => handleViewForm(form.id)}
                          data-hover="blue"
                        >
                          Заполнить заявку
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {submittedForms.length > 0 && (
                <section style={styles.section}>
                  <h2 style={styles.sectionTitle}>Заполненные заявки</h2>
                  <div style={styles.grid}>
                    {submittedForms.map(form => {
                      const ans = myAnswers[form.id];
                      const sc = STATUS_CONFIG[ans.status] || STATUS_CONFIG.waiting;
                      return (
                        <div key={form.id} style={styles.formCard}>
                          <div style={styles.cardTop}>
                            <h3 style={styles.formName}>{form.name}</h3>
                            <span style={{ ...styles.statusBadge, backgroundColor: sc.bg, color: sc.color }}>
                              {sc.label}
                            </span>
                          </div>
                          <button
                            style={styles.editButton}
                            onClick={() => handleViewForm(form.id)}
                            data-hover="gray"
                          >
                            Редактировать
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

            </div>
          </main>

          <Footer />
        </div>
      )}
    </>
  );
}

const styles = themeStyles({
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column'
  },
  pageTransition: {
    transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  main: {
    padding: '40px 0',
    flex: 1
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '40px'
  },
  section: {},
  sectionTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
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
    padding: '40px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    color: '#6b7280',
    fontSize: '14px'
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  cardTop: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: 1
  },
  formName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  statusBadge: {
    display: 'inline-flex',
    alignSelf: 'flex-start',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '600'
  },
  viewFormButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  editButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  }
});

export default MainPage;
