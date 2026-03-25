import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Navbar from './Navbar';
import LoginPage from './LoginPage';
import Footer from './Footer';
import { themeStyles } from '../lib/theme';

function parseFormContent(content) {
  if (Array.isArray(content)) {
    return content;
  }

  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function formatDateTime(rawDate) {
  if (!rawDate) {
    return '—';
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('ru-RU');
}

function formatAnswerValue(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет';
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '—';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function getUserLabel(user, userId) {
  if (!user) {
    return `Пользователь #${userId}`;
  }

  const fullName = [user.surname, user.name, user.second_name].filter(Boolean).join(' ').trim();
  if (fullName) {
    return user.email ? `${fullName} (${user.email})` : fullName;
  }

  return user.email || `Пользователь #${userId}`;
}

function getStatusLabel(status) {
  if (status === 'approved') {
    return 'Подтверждено';
  }

  if (status === 'edits_required') {
    return 'Нужны правки';
  }

  return 'Ожидает проверки';
}

function AdminAnswerDetailsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answerLoading, setAnswerLoading] = useState(true);
  const [answerError, setAnswerError] = useState('');
  const [answer, setAnswer] = useState(null);
  const [form, setForm] = useState(null);

  const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const answerId = queryParams.get('answer_id');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user?.is_admin) {
      return;
    }

    fetchAnswerDetails();
  }, [user]);

  const fieldLabels = useMemo(() => {
    const labels = {};
    parseFormContent(form?.content).forEach((field) => {
      if (!field?.id) {
        return;
      }

      labels[field.id] = field.label || field.id;
    });

    return labels;
  }, [form]);

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
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnswerDetails = async () => {
    if (!answerId) {
      setAnswerError('Не передан answer_id');
      setAnswerLoading(false);
      return;
    }

    setAnswerLoading(true);
    setAnswerError('');

    try {
      const response = await fetch(`/api/forms/answers/one?answer_id=${encodeURIComponent(answerId)}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (!response.ok || data.status === 'error' || !data.answer) {
        setAnswerError(data.detail || 'Не удалось загрузить ответ');
        setAnswerLoading(false);
        return;
      }

      setAnswer(data.answer);

      const formResponse = await fetch(`/api/forms/one?id=${data.answer.form_id}`, {
        credentials: 'include'
      });

      if (formResponse.ok) {
        const formData = await formResponse.json();
        if (formData.status === 'ok') {
          setForm(formData.form);
        }
      }
    } catch (error) {
      console.error('Failed to fetch answer details:', error);
      setAnswerError('Ошибка сети при загрузке ответа');
    } finally {
      setAnswerLoading(false);
    }
  };

  const handleLogout = async () => {
    sessionStorage.setItem('justLoggedOut', 'true');

    await fetch('/api/auth/logout', {
      credentials: 'include'
    });

    window.location.href = '/';
  };

  const handleLoginSuccess = (userData) => {
    if (!userData?.is_admin) {
      window.location.href = '/';
      return;
    }

    setUser(userData);
  };

  const handleNavigate = (pageName) => {
    if (pageName === 'tickets') {
      window.location.href = '/';
      return;
    }

    if (pageName === 'all_forms') {
      window.location.href = '/admin/forms';
      return;
    }

    if (pageName === 'answers') {
      window.location.href = '/admin/answers';
    }
  };

  const handleBackToAnswers = () => {
    const fallbackUrl = form ? `/admin/answers?form_id=${form.id}` : '/admin/answers';

    window.close();

    window.setTimeout(() => {
      if (!window.closed) {
        window.location.href = fallbackUrl;
      }
    }, 120);
  };

  const answerEntries =
    answer?.answer && typeof answer.answer === 'object'
      ? Object.entries(answer.answer)
      : [];

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
      <Navbar user={user} onLogout={handleLogout} currentPage="answers" onNavigate={handleNavigate} />

      <main style={styles.main}>
        <div style={styles.content}>
          <button
            onClick={handleBackToAnswers}
            style={styles.backButton}
            data-hover="gray"
          >
            <ArrowLeft size={16} />
            <span>К списку ответов</span>
          </button>

          <h1 style={styles.pageTitle}>Ответ #{answerId || '—'}</h1>

          {answerLoading ? (
            <div style={styles.loadingAnswer}>Загрузка ответа...</div>
          ) : answerError ? (
            <p style={styles.errorText}>{answerError}</p>
          ) : (
            <article style={styles.answerCard}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>{form?.name || `Форма #${answer.form_id}`}</h2>
                  <p style={styles.cardSubTitle}>{getUserLabel(answer.user, answer.user_id)}</p>
                </div>
                <span style={{ ...styles.statusBadge, ...styles[`status_${answer.status}`] }}>
                  {getStatusLabel(answer.status)}
                </span>
              </div>

              <p style={styles.metaText}>Создан: {formatDateTime(answer.created_at)}</p>
              <p style={styles.metaText}>Обновлен: {formatDateTime(answer.updated_at)}</p>

              <div style={styles.detailsBlock}>
                {answerEntries.length === 0 ? (
                  <p style={styles.emptyText}>Нет данных ответа</p>
                ) : (
                  answerEntries.map(([fieldId, value]) => (
                    <div key={fieldId} style={styles.detailRow}>
                      <span style={styles.detailLabel}>{fieldLabels[fieldId] || fieldId}</span>
                      <span style={styles.detailValue}>{formatAnswerValue(value)}</span>
                    </div>
                  ))
                )}
              </div>
            </article>
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
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
    padding: '0 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    alignSelf: 'flex-start'
  },
  pageTitle: {
    fontSize: '30px',
    fontWeight: '700',
    color: '#1f2937'
  },
  answerCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    backgroundColor: '#ffffff',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start'
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '4px'
  },
  cardSubTitle: {
    fontSize: '14px',
    color: '#6b7280'
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '999px',
    padding: '5px 10px',
    whiteSpace: 'nowrap'
  },
  status_waiting: {
    backgroundColor: '#f3f4f6',
    color: '#374151'
  },
  status_approved: {
    backgroundColor: '#d1fae5',
    color: '#065f46'
  },
  status_edits_required: {
    backgroundColor: '#fee2e2',
    color: '#991b1b'
  },
  metaText: {
    fontSize: '13px',
    color: '#6b7280'
  },
  detailsBlock: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '9px'
  },
  detailRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 250px) minmax(0, 1fr)',
    gap: '10px',
    alignItems: 'start'
  },
  detailLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1f2937'
  },
  detailValue: {
    fontSize: '13px',
    color: '#374151',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  emptyText: {
    fontSize: '14px',
    color: '#9ca3af'
  },
  loadingAnswer: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280'
  },
  errorText: {
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '500'
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

export default AdminAnswerDetailsPage;
