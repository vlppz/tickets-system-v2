import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from './Navbar';
import LoginPage from './LoginPage';
import Footer from './Footer';
import { themeStyles } from '../lib/theme';

const TOAST_MESSAGES = {
  form_saved: 'Форма успешно сохранена!',
  form_updated: 'Форма обновлена!'
};

function AdminFormsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toastKey = params.get('toast');
    if (toastKey && TOAST_MESSAGES[toastKey]) {
      toast.success(TOAST_MESSAGES[toastKey]);
      params.delete('toast');
      const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.user && !data.user.is_admin) {
        window.location.href = '/';
        return;
      }

      setUser(data.user);

      if (data.user?.is_admin) {
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
      const response = await fetch('/api/forms/all', {
        credentials: 'include'
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (data.status === 'ok') {
        setForms(data.forms || []);
      }
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    }
  };

  const handleLogout = async () => {
    sessionStorage.setItem('justLoggedOut', 'true');

    await fetch('/api/auth/logout', {
      credentials: 'include'
    });

    window.location.href = '/';
  };

  const handleLoginSuccess = async (userData) => {
    if (!userData?.is_admin) {
      window.location.href = '/';
      return;
    }

    setUser(userData);
    await fetchForms();
  };

  const handleNavigate = (page) => {
    if (page === 'tickets') {
      window.location.href = '/';
      return;
    }

    if (page === 'all_forms') {
      return;
    }

    if (page === 'answers') {
      window.location.href = '/admin/answers';
    }
  };

  const filteredForms = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return forms;
    }

    return forms.filter((form) => {
      const name = (form.name || '').toLowerCase();
      return name.includes(normalizedSearch);
    });
  }, [forms, search]);

  const handleCreateForm = () => {
    window.location.href = '/forms/builder';
  };

  const handleEditForm = (formId) => {
    window.location.href = `/forms/builder?form_id=${formId}`;
  };

  const handleViewAnswers = (formId) => {
    window.location.href = `/admin/answers?form_id=${formId}`;
  };

  const formatDate = (rawDate) => {
    if (!rawDate) {
      return '—';
    }

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleString('ru-RU');
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={styles.container}>
      <Navbar user={user} onLogout={handleLogout} currentPage="all_forms" onNavigate={handleNavigate} />

      <main style={styles.main}>
        <div style={styles.content}>
          <div style={styles.headerRow}>
            <div>
              <h1 style={styles.pageTitle}>Все формы</h1>
              <p style={styles.pageSubtitle}>Выберите форму для редактирования или просмотра ответов</p>
            </div>

            <button onClick={handleCreateForm} style={styles.primaryButton} data-hover="blue">
              <Plus size={16} />
              <span>Создать форму</span>
            </button>
          </div>

          <div style={styles.toolbar}>
            <div style={styles.searchWrapper}>
              <Search size={16} style={styles.searchIcon} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по названию формы"
                style={styles.searchInput}
              />
            </div>
          </div>

          {filteredForms.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyTitle}>Формы не найдены</p>
              <p style={styles.emptySubtitle}>Измените фильтр или создайте новую форму</p>
            </div>
          ) : (
            <div style={styles.formsGrid}>
              {filteredForms.map((form) => (
                <article key={form.id} style={styles.formCard}>
                  <div style={styles.formCardHeader}>
                    <h2 style={styles.formName}>{form.name || 'Без названия'}</h2>
                  </div>

                  <p style={styles.formMeta}>Обновлено: {formatDate(form.updated_at)}</p>

                  <div style={styles.formActions}>
                    <button
                      onClick={() => handleEditForm(form.id)}
                      style={styles.actionButton}
                      data-hover="gray"
                    >
                      <Pencil size={15} />
                      <span>Редактировать</span>
                    </button>

                    <button
                      onClick={() => handleViewAnswers(form.id)}
                      style={styles.actionButtonPrimary}
                      data-hover="blue"
                    >
                      <Eye size={15} />
                      <span>Ответы</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
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
  main: {
    flex: 1,
    padding: '32px 0'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap'
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px'
  },
  pageSubtitle: {
    fontSize: '15px',
    color: '#6b7280'
  },
  toolbar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  searchWrapper: {
    flex: 1,
    minWidth: '260px',
    position: 'relative'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af'
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 38px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    fontSize: '14px'
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  formsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
    gap: '16px'
  },
  formCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  formCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start'
  },
  formName: {
    fontSize: '17px',
    color: '#1f2937',
    fontWeight: '600',
    lineHeight: '1.35'
  },
  formId: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    borderRadius: '999px',
    padding: '4px 8px',
    whiteSpace: 'nowrap'
  },
  formMeta: {
    fontSize: '13px',
    color: '#6b7280'
  },
  formActions: {
    marginTop: 'auto',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    flex: 1
  },
  actionButtonPrimary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    padding: '9px 12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    flex: 1
  },
  emptyState: {
    border: '1px dashed #d1d5db',
    borderRadius: '12px',
    padding: '32px 20px',
    textAlign: 'center',
    backgroundColor: '#ffffff'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '8px'
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#6b7280'
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
  }
});

export default AdminFormsPage;
