import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle, Clock, FileText, MessageSquare, Save, User, XCircle } from 'lucide-react';
import Navbar from './Navbar';
import LoginPage from './LoginPage';
import Footer from './Footer';
import StatusChangePills from './StatusChangePills';
import { csrfHeaders, updateCsrfToken } from '../lib/csrf';
import { themeStyles } from '../lib/theme';
import {
  ANSWER_STATUS_OPTIONS,
  formatTicketDate,
  getAnswerComments,
  getAnswerStatusConfig,
  getCommentRoleLabel
} from '../lib/ticketWorkflow';

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

function getUserFullName(user) {
  return [user?.surname, user?.name, user?.second_name]
    .filter((part) => typeof part === 'string' && part.trim())
    .map((part) => part.trim())
    .join(' ');
}

function getCommentAuthorLabel(comment, isAdminComment, answer) {
  if (isAdminComment) {
    return getCommentRoleLabel('admin');
  }

  const authorName = typeof comment?.author_name === 'string' ? comment.author_name.trim() : '';
  return authorName || getUserFullName(answer?.user) || answer?.user?.email || 'Пользователь';
}

function getCommentInitial(authorLabel, isAdminComment) {
  if (isAdminComment) return 'А';
  return authorLabel ? authorLabel.charAt(0).toUpperCase() : 'П';
}

function getStatusConfig(status) {
  const base = getAnswerStatusConfig(status);
  let icon = Clock;

  if (status === 'approved') {
    icon = CheckCircle;
  }

  if (status === 'edits_required' || status === 'declined') {
    icon = XCircle;
  }

  return {
    ...base,
    icon,
    badgeStyle: { backgroundColor: base.bg, color: base.color }
  };
}

function AdminAnswerDetailsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answerLoading, setAnswerLoading] = useState(true);
  const [answerError, setAnswerError] = useState('');
  const [answer, setAnswer] = useState(null);
  const [form, setForm] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('waiting');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState('');

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

  useEffect(() => {
    if (answer?.status) {
      setReviewStatus(answer.status);
    }
  }, [answer?.status]);

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

    const response = await fetch('/api/auth/logout', {
      method: 'DELETE',
      headers: csrfHeaders(),
      credentials: 'include'
    });
    if (response.ok) {
      const data = await response.json().catch(() => null);
      updateCsrfToken(data?.csrf_token);
    }

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

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (!answer) {
      return;
    }

    const trimmedComment = reviewComment.trim();
    if (reviewStatus === answer.status && !trimmedComment) {
      setReviewError('Измените статус или добавьте комментарий');
      return;
    }

    setReviewSaving(true);
    setReviewError('');

    try {
      const response = await fetch('/api/forms/answers/status', {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          answer_id: answer.id,
          status: reviewStatus,
          comment: trimmedComment
        })
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error' || !data.answer) {
        setReviewError(data.detail || 'Не удалось сохранить решение');
        return;
      }

      setAnswer(data.answer);
      setReviewComment('');
    } catch (error) {
      console.error('Failed to update answer status:', error);
      setReviewError('Ошибка сети при сохранении решения');
    } finally {
      setReviewSaving(false);
    }
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
  const comments = getAnswerComments(answer);
  const hasReviewChanges = Boolean(answer) && (reviewStatus !== answer.status || reviewComment.trim().length > 0);
  const userFullName = answer ? getUserFullName(answer.user) || null : null;
  const userEmail = answer ? getUserEmail(answer.user) : null;
  const filledFieldsCount = answerEntries.filter(([, value]) => formatAnswerValue(value) !== '—').length;

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
              <section style={styles.pageHeader} className="answer-page-header">
                <div style={styles.titleBlock}>
                  <div style={styles.titleLine}>
                    <FileText size={20} style={styles.titleIcon} />
                    <h1 style={styles.pageTitle}>{form?.name || `Форма #${answer.form_id}`}</h1>
                  </div>
                  <p style={styles.answerIdLabel}>Ответ #{answerId} · форма #{answer.form_id}</p>
                </div>

                <span style={{ ...styles.statusBadge, ...statusConfig?.badgeStyle }}>
                  {StatusIcon && <StatusIcon size={13} />}
                  {statusConfig?.label}
                </span>
              </section>

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

                <div style={styles.metaCard}>
                  <MessageSquare size={15} style={styles.metaIcon} />
                  <div style={styles.metaCardBody}>
                    <span style={styles.metaCardLabel}>Обсуждение</span>
                    <span style={styles.metaCardValue}>{comments.length}</span>
                  </div>
                </div>
              </div>

              <div style={styles.detailsGrid} className="answer-details-grid">
                <section style={styles.fieldsCard}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <h2 style={styles.fieldsTitle}>Данные ответа</h2>
                      <p style={styles.sectionSubtitle}>
                        Заполнено {filledFieldsCount} из {answerEntries.length}
                      </p>
                    </div>
                  </div>

                  {answerEntries.length === 0 ? (
                    <p style={styles.emptyText}>Нет данных ответа</p>
                  ) : (
                    <div style={styles.fieldsList}>
                      {answerEntries.map(([fieldId, value], index) => {
                        const fieldDef = fieldMap[fieldId];
                        const label = fieldDef?.label || fieldId;
                        const isBoolean = typeof value === 'boolean';
                        const isLast = index === answerEntries.length - 1;

                        return (
                          <div
                            key={fieldId}
                            style={{ ...styles.fieldItem, ...(isLast ? { borderBottom: 'none' } : {}) }}
                            className="answer-field-item"
                          >
                            <div style={styles.fieldMeta}>
                              <span style={styles.fieldLabel}>{label}</span>
                              <div style={styles.fieldBadges}>
                                {fieldDef?.required && <span style={styles.requiredBadge}>Обязательно</span>}
                              </div>
                              {fieldDef?.description && (
                                <span style={styles.fieldDescription}>{fieldDef.description}</span>
                              )}
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
                </section>

                <aside style={styles.sideColumn} className="answer-side-column">
                  <section style={styles.reviewCard}>
                    <div style={styles.reviewHeader}>
                      <div>
                        <h2 style={styles.reviewTitle}>Решение</h2>
                        <p style={styles.reviewSubtitle}>Выберите статус и оставьте комментарий.</p>
                      </div>
                    </div>

                    <form onSubmit={handleReviewSubmit} style={styles.reviewForm}>
                      <div style={styles.reviewControls}>
                        <div style={styles.reviewFieldLabel}>
                          <span>Статус</span>
                          <div style={styles.statusOptionGrid} role="radiogroup" aria-label="Статус ответа">
                            {ANSWER_STATUS_OPTIONS.map((statusOption) => {
                              const optionConfig = getStatusConfig(statusOption.value);
                              const OptionIcon = optionConfig.icon;
                              const selected = reviewStatus === statusOption.value;

                              return (
                                <button
                                  key={statusOption.value}
                                  type="button"
                                  className="status-option-button"
                                  role="radio"
                                  aria-checked={selected}
                                  onClick={() => setReviewStatus(statusOption.value)}
                                  style={{
                                    ...styles.statusOptionButton,
                                    ...(selected ? styles.statusOptionButtonSelected : {}),
                                    borderColor: selected ? optionConfig.color : 'var(--color-border)',
                                    backgroundColor: selected ? optionConfig.bg : 'var(--color-surface)',
                                    color: selected ? optionConfig.color : 'var(--color-text-secondary)'
                                  }}
                                >
                                  <OptionIcon size={14} />
                                  <span>{statusOption.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <label style={styles.reviewFieldLabel}>
                          Комментарий
                          <textarea
                            value={reviewComment}
                            onChange={(event) => setReviewComment(event.target.value)}
                            placeholder="Например: приложите недостающие данные"
                            rows={4}
                            maxLength={2000}
                            style={styles.reviewTextarea}
                          />
                        </label>
                      </div>

                      {reviewError && <p style={styles.reviewError}>{reviewError}</p>}

                      <div style={styles.reviewActions}>
                        <button
                          type="submit"
                          disabled={reviewSaving || !hasReviewChanges}
                          style={{
                            ...styles.saveReviewButton,
                            ...((reviewSaving || !hasReviewChanges) ? styles.saveReviewButtonDisabled : {})
                          }}
                          data-hover="blue"
                        >
                          <Save size={15} />
                          <span>{reviewSaving ? 'Сохранение...' : 'Сохранить'}</span>
                        </button>
                        <span style={styles.commentLimit}>{reviewComment.trim().length}/2000</span>
                      </div>
                    </form>
                  </section>

                  <section style={styles.commentsCard}>
                    <div style={styles.commentsHeader}>
                      <div style={styles.commentsTitleBlock}>
                        <MessageSquare size={16} style={styles.commentsIcon} />
                        <h2 style={styles.commentsTitle}>Обсуждение</h2>
                      </div>
                      <span style={styles.commentsCount}>{comments.length}</span>
                    </div>

                    {comments.length === 0 ? (
                      <div style={styles.commentsEmptyState}>
                        <MessageSquare size={18} style={styles.commentsEmptyIcon} />
                        <p style={styles.emptyText}>Комментариев пока нет</p>
                      </div>
                    ) : (
                      <div style={styles.commentsList}>
                        {comments.map((comment, index) => {
                          const body = typeof comment?.body === 'string' ? comment.body.trim() : '';
                          const isAdminComment = comment?.author_role === 'admin';
                          const authorLabel = getCommentAuthorLabel(comment, isAdminComment, answer);

                          return (
                            <div key={comment?.id || index} style={styles.commentRow}>
                              <span
                                style={{
                                  ...styles.commentAvatar,
                                  ...(isAdminComment ? styles.adminCommentAvatar : styles.userCommentAvatar)
                                }}
                                aria-hidden="true"
                              >
                                {getCommentInitial(authorLabel, isAdminComment)}
                              </span>
                              <div
                                style={{
                                  ...styles.commentItem,
                                  ...(isAdminComment ? styles.adminCommentItem : styles.userCommentItem)
                                }}
                              >
                                <div style={styles.commentHeader}>
                                  <span style={styles.commentRole}>{authorLabel}</span>
                                  <span style={styles.commentDate}>{formatTicketDate(comment?.created_at)}</span>
                                </div>

                                <StatusChangePills statusChange={comment?.status_change} />

                                {body && <p style={styles.commentBody}>{body}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </aside>
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

        .status-option-button:hover {
          border-color: var(--color-brand) !important;
          box-shadow: 0 0 0 3px var(--color-brand-ring) !important;
        }

        .status-option-button:focus-visible,
        .answer-details-content button:focus-visible {
          box-shadow: 0 0 0 3px var(--color-brand-ring) !important;
        }

        @media (max-width: 1080px) {
          .answer-details-grid {
            grid-template-columns: 1fr !important;
          }

          .answer-side-column {
            position: static !important;
          }
        }

        @media (max-width: 720px) {
          .answer-details-content {
            padding: 0 16px !important;
          }

          .answer-page-header {
            padding: 16px !important;
          }

          .answer-field-item {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
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
    padding: '28px 0 36px'
  },
  content: {
    maxWidth: '1260px',
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
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '18px',
    flexWrap: 'wrap',
    padding: '20px',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: 0
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
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
    lineHeight: 1.2
  },
  answerIdLabel: {
    fontSize: '13px',
    color: '#9ca3af',
    paddingLeft: '30px',
    margin: 0
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '12px'
  },
  metaCard: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    padding: '13px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
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
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 380px',
    alignItems: 'start',
    gap: '18px'
  },
  sideColumn: {
    position: 'sticky',
    top: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: 0
  },
  reviewCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px'
  },
  reviewTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  },
  reviewSubtitle: {
    fontSize: '13px',
    color: '#4b5563',
    margin: '4px 0 0'
  },
  reviewForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  reviewControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  reviewFieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151'
  },
  statusOptionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px'
  },
  statusOptionButton: {
    minHeight: '38px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '7px',
    padding: '8px 10px',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-secondary)',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease'
  },
  statusOptionButtonSelected: {
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  },
  reviewTextarea: {
    width: '100%',
    minHeight: '118px',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    lineHeight: 1.45
  },
  reviewError: {
    margin: 0,
    fontSize: '13px',
    color: '#dc2626',
    fontWeight: '600'
  },
  reviewActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap'
  },
  saveReviewButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minHeight: '38px',
    padding: '9px 13px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  saveReviewButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  },
  commentLimit: {
    fontSize: '12px',
    color: '#6b7280'
  },
  commentsCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  },
  commentsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px'
  },
  commentsTitleBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  commentsIcon: {
    color: '#3b82f6'
  },
  commentsTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#374151',
    margin: 0
  },
  commentsCount: {
    minWidth: '24px',
    height: '24px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 7px',
    borderRadius: '999px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    fontSize: '12px',
    fontWeight: '700'
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  commentsEmptyState: {
    minHeight: '92px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '8px',
    border: '1px dashed #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
    padding: '16px'
  },
  commentsEmptyIcon: {
    color: '#9ca3af'
  },
  commentRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px'
  },
  commentAvatar: {
    width: '28px',
    height: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '2px',
    borderRadius: '999px',
    border: '1px solid #e5e7eb',
    fontSize: '11px',
    fontWeight: '800',
    lineHeight: 1
  },
  adminCommentAvatar: {
    backgroundColor: '#eff6ff',
    color: '#3b82f6'
  },
  userCommentAvatar: {
    backgroundColor: '#f3f4f6',
    color: '#374151'
  },
  commentItem: {
    minWidth: 0,
    flex: 1,
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px 11px',
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  },
  adminCommentItem: {
    backgroundColor: '#eff6ff'
  },
  userCommentItem: {
    backgroundColor: '#f9fafb'
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  commentRole: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#1f2937'
  },
  commentDate: {
    fontSize: '11px',
    color: '#9ca3af',
    marginLeft: 'auto'
  },
  commentBody: {
    margin: 0,
    color: '#1f2937',
    fontSize: '13px',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    userSelect: 'text'
  },
  fieldsCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    padding: '18px 20px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px'
  },
  fieldsTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  },
  sectionSubtitle: {
    margin: '4px 0 0',
    color: '#6b7280',
    fontSize: '13px'
  },
  fieldsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0px'
  },
  fieldItem: {
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 270px) minmax(0, 1fr)',
    gap: '20px',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: '1px solid #f3f4f6'
  },
  fieldMeta: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '3px'
  },
  fieldLabel: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 1.4
  },
  fieldBadges: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px'
  },
  requiredBadge: {
    fontSize: '11px',
    color: '#92400e',
    fontWeight: '700',
    padding: '3px 7px',
    borderRadius: '999px',
    backgroundColor: '#fef3c7'
  },
  fieldDescription: {
    color: '#6b7280',
    fontSize: '12px',
    lineHeight: 1.4
  },
  fieldValue: {
    fontSize: '14px',
    color: '#1f2937',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.5,
    userSelect: 'text',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
    border: '1px solid #f3f4f6'
  },
  fieldValueBool: {
    fontSize: '14px',
    color: '#374151',
    userSelect: 'text',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
    border: '1px solid #f3f4f6'
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
    margin: 0,
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
