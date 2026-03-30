import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle, Clock, FileText, User, XCircle } from 'lucide-react';
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

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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

function getUserEmail(user) {
  return user?.email || null;
}

function getStatusConfig(status) {
  if (status === 'approved') {
    return {
      label: 'Подтверждено',
      icon: CheckCircle,
      badgeStyle: { backgroundColor: '#d1fae5', color: '#065f46' }
    };
  }

  if (status === 'edits_required') {
    return {
      label: 'Нужны правки',
      icon: XCircle,
      badgeStyle: { backgroundColor: '#fee2e2', color: '#991b1b' }
    };
  }

  return {
    label: 'Ожидает проверки',
    icon: Clock,
    badgeStyle: { backgroundColor: '#f3f4f6', color: '#374151' }
  };
}

function getFieldTypeLabel(type) {
  const map = {
    text: 'Текст',
    textarea: 'Многострочный',
    number: 'Число',
    checkbox: 'Флажок',
    select: 'Выбор'
  };
  return map[type] || type;
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

  const formFields = useMemo(() => {
    return parseFormContent(form?.content);
  }, [form]);

  const fieldMap = useMemo(() => {
    const map = {};
    formFields.forEach((field) => {
      if (field?.id) {
        map[field.id] = field;
      }
    });
    return map;
  }, [formFields]);

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

  const statusConfig = answer ? getStatusConfig(answer.status) : null;
  const StatusIcon = statusConfig?.icon;
  const userFullName = answer
    ? [answer.user?.surname, answer.user?.name, answer.user?.second_name].filter(Boolean).join(' ').trim() || null
    : null;
  const userEmail = answer ? getUserEmail(answer.user) : null;

  return (
    <div style={styles.container}>
      <Navbar user={user} onLogout={handleLogout} currentPage="answers" onNavigate={handleNavigate} />

      <main style={styles.main}>
        <div style={styles.content} className="answer-details-content">
          <button
            onClick={handleBackToAnswers}
            style={styles.backButton}
            data-hover="gray"
          >
            <ArrowLeft size={16} />
            <span>К списку ответов</span>
          </button>

          {answerLoading ? (
            <div style={styles.loadingAnswer}>
              <div style={styles.loadingSpinner} />
              <p style={styles.loadingText}>Загрузка ответа...</p>
            </div>
          ) : answerError ? (
            <div style={styles.errorCard}>
              <XCircle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
              <p style={styles.errorText}>{answerError}</p>
            </div>
          ) : (
            <>
              <div style={styles.topRow}>
                <div style={styles.titleBlock}>
                  <div style={styles.titleLine}>
                    <FileText size={20} style={styles.titleIcon} />
                    <h1 style={styles.pageTitle}>{form?.name || `Форма #${answer.form_id}`}</h1>
                  </div>
                  <p style={styles.answerIdLabel}>Ответ #{answerId}</p>
                </div>

                <span style={{ ...styles.statusBadge, ...statusConfig?.badgeStyle }}>
                  {StatusIcon && <StatusIcon size={13} />}
                  {statusConfig?.label}
                </span>
              </div>

              <div style={styles.metaCards}>
                <div style={styles.metaCard}>
                  <User size={15} style={styles.metaIcon} />
                  <div style={styles.metaCardBody}>
                    <span style={styles.metaCardLabel}>Пользователь</span>
                    <span style={styles.metaCardValue}>{userFullName || userEmail || `#${answer.user_id}`}</span>
                    {userFullName && userEmail && (
                      <span style={styles.metaCardSub}>{userEmail}</span>
                    )}
                  </div>
                </div>

                <div style={styles.metaCard}>
                  <Calendar size={15} style={styles.metaIcon} />
                  <div style={styles.metaCardBody}>
                    <span style={styles.metaCardLabel}>Создан</span>
                    <span style={styles.metaCardValue}>{formatDateTime(answer.created_at)}</span>
                  </div>
                </div>

                <div style={styles.metaCard}>
                  <Clock size={15} style={styles.metaIcon} />
                  <div style={styles.metaCardBody}>
                    <span style={styles.metaCardLabel}>Обновлён</span>
                    <span style={styles.metaCardValue}>{formatDateTime(answer.updated_at)}</span>
                  </div>
                </div>
              </div>

              <div style={styles.fieldsCard}>
                <h2 style={styles.fieldsTitle}>Данные ответа</h2>

                {answerEntries.length === 0 ? (
                  <p style={styles.emptyText}>Нет данных ответа</p>
                ) : (
                  <div style={styles.fieldsList}>
                    {answerEntries.map(([fieldId, value], index) => {
                      const fieldDef = fieldMap[fieldId];
                      const label = fieldDef?.label || fieldId;
                      const typeLabel = fieldDef ? getFieldTypeLabel(fieldDef.type) : null;
                      const isBoolean = typeof value === 'boolean';
                      const isLast = index === answerEntries.length - 1;

                      return (
                        <div key={fieldId} style={{ ...styles.fieldItem, ...(isLast ? { borderBottom: 'none' } : {}) }}>
                          <div style={styles.fieldMeta}>
                            <span style={styles.fieldLabel}>{label}</span>
                          </div>
                          <div style={isBoolean ? styles.fieldValueBool : styles.fieldValue}>
                            {isBoolean ? (
                              value ? (
                                <span style={styles.boolYes}>
                                  <CheckCircle size={14} />
                                  Да
                                </span>
                              ) : (
                                <span style={styles.boolNo}>
                                  <XCircle size={14} />
                                  Нет
                                </span>
                              )
                            ) : (
                              formatAnswerValue(value)
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .answer-details-content, .answer-details-content * {
          user-select: text !important;
          -webkit-user-select: text !important;
        }
      `}</style>
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
    maxWidth: '860px',
    margin: '0 auto',
    width: '100%',
    padding: '0 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
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
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap'
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  titleLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  titleIcon: {
    color: '#3b82f6',
    flexShrink: 0
  },
  pageTitle: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  },
  answerIdLabel: {
    fontSize: '13px',
    color: '#9ca3af',
    paddingLeft: '30px'
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '600',
    borderRadius: '999px',
    padding: '6px 12px',
    whiteSpace: 'nowrap',
    flexShrink: 0
  },
  metaCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px'
  },
  metaCard: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    padding: '14px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    backgroundColor: '#ffffff'
  },
  metaIcon: {
    color: '#9ca3af',
    flexShrink: 0
  },
  metaCardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: '0'
  },
  metaCardLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  metaCardValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937',
    wordBreak: 'break-word',
    userSelect: 'text'
  },
  metaCardSub: {
    fontSize: '12px',
    color: '#6b7280',
    userSelect: 'text'
  },
  fieldsCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    padding: '20px 20px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  fieldsTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#374151',
    margin: 0
  },
  fieldsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0px'
  },
  fieldItem: {
    display: 'grid',
    gridTemplateColumns: 'minmax(160px, 240px) minmax(0, 1fr)',
    gap: '16px',
    alignItems: 'start',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6'
  },
  fieldMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px'
  },
  fieldLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 1.4
  },
  fieldType: {
    fontSize: '11px',
    color: '#9ca3af',
    fontWeight: '500'
  },
  fieldValue: {
    fontSize: '14px',
    color: '#374151',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.5,
    userSelect: 'text'
  },
  fieldValueBool: {
    fontSize: '14px',
    color: '#374151',
    userSelect: 'text'
  },
  boolYes: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    color: '#065f46',
    fontWeight: '600',
    fontSize: '13px'
  },
  boolNo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: '13px'
  },
  emptyText: {
    fontSize: '14px',
    color: '#9ca3af'
  },
  loadingAnswer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
    padding: '48px 24px',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#ffffff'
  },
  loadingSpinner: {
    width: '28px',
    height: '28px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    fontSize: '14px',
    color: '#6b7280'
  },
  errorCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    backgroundColor: '#fee2e2'
  },
  errorText: {
    color: '#991b1b',
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
