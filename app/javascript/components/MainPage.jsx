import React, { useRef, useState, useEffect } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import Navbar from './Navbar';
import LoginPage from './LoginPage';
import FormRenderer from './FormRenderer';
import Footer from './Footer';
import StatusChangePills from './StatusChangePills';
import { csrfHeaders, updateCsrfToken } from '../lib/csrf';
import { themeStyles } from '../lib/theme';
import { formatTicketDate, getAnswerComments, getAnswerStatusConfig, getCommentRoleLabel } from '../lib/ticketWorkflow';

function getSubmittedButtonLabel(status) {
  if (status === 'edits_required') return 'Исправить заявку';
  if (status === 'approved') return 'Открыть заявку';
  return 'Редактировать';
}

function getUserFullName(user) {
  const fullName = [user?.surname, user?.name, user?.second_name]
    .filter((part) => typeof part === 'string' && part.trim())
    .map((part) => part.trim())
    .join(' ');

  return fullName || user?.email || '';
}

function getCommentAuthorLabel(comment, isAdminComment, answer, fallbackUser) {
  if (isAdminComment) {
    return getCommentRoleLabel('admin');
  }

  const authorName = typeof comment?.author_name === 'string' ? comment.author_name.trim() : '';
  return authorName || getUserFullName(answer?.user) || getUserFullName(fallbackUser) || 'Пользователь';
}

function getCommentInitial(authorLabel, isAdminComment) {
  if (isAdminComment) return 'А';
  return authorLabel ? authorLabel.charAt(0).toUpperCase() : 'П';
}

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
  const [commentsFormId, setCommentsFormId] = useState(null);
  const [commentReply, setCommentReply] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentsClosing, setCommentsClosing] = useState(false);
  const commentsCloseTimerRef = useRef(null);
  const commentTextareaRef = useRef(null);
  const commentsBodyRef = useRef(null);

  useEffect(() => {
    if (sessionStorage.getItem('justLoggedOut') === 'true') {
      setTransitioning(true);
      sessionStorage.removeItem('justLoggedOut');
      setTimeout(() => setTransitioning(false), 800);
    }
    checkAuth();
  }, []);

  useEffect(() => {
    return () => {
      if (commentsCloseTimerRef.current) {
        window.clearTimeout(commentsCloseTimerRef.current);
      }
    };
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
    const response = await fetch('/api/auth/logout', {
      method: 'DELETE',
      headers: csrfHeaders(),
      credentials: 'include'
    });
    if (response.ok) {
      const data = await response.json().catch(() => null);
      updateCsrfToken(data?.csrf_token);
    }
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

  const handleOpenComments = (formId) => {
    if (commentsCloseTimerRef.current) {
      window.clearTimeout(commentsCloseTimerRef.current);
      commentsCloseTimerRef.current = null;
    }

    setCommentsClosing(false);
    setCommentsFormId(formId);
    setCommentReply('');
    setCommentError('');
  };

  const handleCloseComments = () => {
    if (commentSubmitting) return;

    setCommentsClosing(true);
    commentsCloseTimerRef.current = window.setTimeout(() => {
      setCommentsFormId(null);
      setCommentReply('');
      setCommentError('');
      setCommentsClosing(false);
      commentsCloseTimerRef.current = null;
    }, 190);
  };

  const handleCommentReplySubmit = async (event) => {
    event.preventDefault();

    const trimmedReply = commentReply.trim();
    const answer = myAnswers[commentsFormId];

    if (!answer || !trimmedReply) {
      return;
    }

    setCommentSubmitting(true);
    setCommentError('');

    try {
      const response = await fetch('/api/forms/answers/reply', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          answer_id: answer.id,
          comment: trimmedReply
        })
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error' || !data.answer) {
        setCommentError(data.detail || 'Не удалось отправить комментарий');
        return;
      }

      setMyAnswers((prev) => ({
        ...prev,
        [commentsFormId]: data.answer
      }));
      setCommentReply('');
    } catch (error) {
      console.error('Failed to send ticket comment:', error);
      setCommentError('Ошибка сети при отправке комментария');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const submittedForms = forms.filter(f => myAnswers[f.id]);
  const availableForms = forms.filter(f => !myAnswers[f.id]);
  const activeCommentsAnswer = commentsFormId ? myAnswers[commentsFormId] : null;
  const activeCommentsForm = commentsFormId
    ? forms.find((form) => String(form.id) === String(commentsFormId))
    : null;
  const activeComments = getAnswerComments(activeCommentsAnswer);

  useEffect(() => {
    if (!commentsFormId || commentsClosing) return undefined;

    const focusTimer = window.setTimeout(() => {
      commentTextareaRef.current?.focus();

      if (commentsBodyRef.current) {
        commentsBodyRef.current.scrollTop = commentsBodyRef.current.scrollHeight;
      }
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [commentsFormId, commentsClosing]);

  useEffect(() => {
    if (!commentsFormId || commentsClosing || !commentsBodyRef.current) return;

    commentsBodyRef.current.scrollTo({
      top: commentsBodyRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [commentsFormId, commentsClosing, activeComments.length]);

  useEffect(() => {
    if (!commentsFormId || commentsClosing) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleCloseComments();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commentsFormId, commentsClosing, commentSubmitting]);

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
                      const sc = getAnswerStatusConfig(ans.status);
                      const commentsCount = getAnswerComments(ans).length;
                      return (
                        <div key={form.id} style={styles.formCard}>
                          <div style={styles.cardTop}>
                            <div style={styles.cardTitleRow}>
                              <h3 style={styles.formName}>{form.name}</h3>
                              <span style={{ ...styles.statusBadge, backgroundColor: sc.bg, color: sc.color }}>
                                {sc.label}
                              </span>
                            </div>
                          </div>
                          <div style={styles.cardActions}>
                            <button
                              style={styles.editButton}
                              onClick={() => handleViewForm(form.id)}
                              data-hover="gray"
                            >
                              {getSubmittedButtonLabel(ans.status)}
                            </button>
                            <button
                              type="button"
                              style={styles.commentsButton}
                              onClick={() => handleOpenComments(form.id)}
                              data-hover="blue"
                            >
                              <MessageSquare size={15} />
                              <span>Комментарии</span>
                              {commentsCount > 0 && <span style={styles.commentsCountBadge}>{commentsCount}</span>}
                            </button>
                          </div>
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

      {activeCommentsAnswer && activeCommentsForm && (
        <div
          style={styles.commentsOverlay}
          className={commentsClosing ? 'comments-overlay comments-overlay-closing' : 'comments-overlay'}
          onClick={handleCloseComments}
        >
          <section
            style={styles.commentsDialog}
            className={commentsClosing ? 'comments-dialog comments-dialog-closing' : 'comments-dialog'}
            role="dialog"
            aria-modal="true"
            aria-label="Комментарии к заявке"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={styles.commentsDialogHeader} className="comments-dialog-header">
              <div style={styles.commentsDialogTitleBlock}>
                <div style={styles.commentsDialogTitleRow}>
                  <span style={styles.commentsDialogIconWrap} aria-hidden="true">
                    <MessageSquare size={18} style={styles.commentsDialogIcon} />
                  </span>
                  <h2 style={styles.commentsDialogTitle}>Обсуждение заявки</h2>
                  <span style={styles.commentsDialogSubtitle}>{activeCommentsForm.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseComments}
                disabled={commentSubmitting}
                style={styles.closeDialogButton}
                className="comments-close-button"
                aria-label="Закрыть комментарии"
              >
                <X size={18} />
              </button>
            </div>

            <div ref={commentsBodyRef} style={styles.commentsDialogBody} className="comments-dialog-body">
              {activeComments.length === 0 ? (
                <div style={styles.commentsEmptyState}>
                  <span style={styles.commentsEmptyIcon} aria-hidden="true">
                    <MessageSquare size={20} />
                  </span>
                  <p style={styles.commentsEmptyTitle}>Пока нет сообщений</p>
                  <p style={styles.commentsEmptySubtitle}>Первое сообщение появится здесь сразу после отправки.</p>
                </div>
              ) : (
                <div style={styles.commentsThread}>
                  {activeComments.map((comment, index) => {
                    const body = typeof comment?.body === 'string' ? comment.body.trim() : '';
                    const isAdminComment = comment?.author_role === 'admin';
                    const authorLabel = getCommentAuthorLabel(comment, isAdminComment, activeCommentsAnswer, user);

                    return (
                      <div
                        key={comment?.id || index}
                        style={{
                          ...styles.commentRow,
                          ...(isAdminComment ? styles.commentRowAdmin : styles.commentRowUser)
                        }}
                        className={isAdminComment ? 'comment-row comment-row-admin' : 'comment-row comment-row-user'}
                      >
                        <span
                          style={{
                            ...styles.commentAvatar,
                            ...(isAdminComment ? styles.commentAvatarAdmin : styles.commentAvatarUser)
                          }}
                          aria-hidden="true"
                        >
                          {getCommentInitial(authorLabel, isAdminComment)}
                        </span>
                        <div
                          style={{
                            ...styles.commentBubble,
                            ...(isAdminComment ? styles.commentBubbleAdmin : styles.commentBubbleUser)
                          }}
                          className="comment-bubble"
                        >
                          <div style={styles.commentBubbleHeader}>
                            <span style={styles.commentBubbleRole}>{authorLabel}</span>
                            <span style={styles.commentBubbleDate}>{formatTicketDate(comment?.created_at)}</span>
                          </div>
                          <StatusChangePills statusChange={comment?.status_change} />
                          {body && <p style={styles.commentBubbleBody}>{body}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <form onSubmit={handleCommentReplySubmit} style={styles.commentReplyForm} className="comment-reply-form">
              <div style={styles.commentComposerTop}>
                <label htmlFor="ticket-comment-reply" style={styles.commentReplyLabel}>Новое сообщение</label>
                <span style={styles.commentLimit}>{commentReply.trim().length}/2000</span>
              </div>
              <textarea
                ref={commentTextareaRef}
                id="ticket-comment-reply"
                value={commentReply}
                onChange={(event) => setCommentReply(event.target.value)}
                placeholder="Напишите сообщение администратору"
                rows={3}
                maxLength={2000}
                style={styles.commentReplyTextarea}
                className="comment-reply-textarea"
                aria-invalid={Boolean(commentError)}
                aria-describedby={commentError ? 'ticket-comment-error' : undefined}
              />
              <div style={styles.commentReplyFooter} className="comment-reply-footer">
                {commentError && (
                  <span id="ticket-comment-error" role="alert" style={styles.commentError}>
                    {commentError}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={commentSubmitting || !commentReply.trim()}
                  style={{
                    ...styles.sendCommentButton,
                    ...((commentSubmitting || !commentReply.trim()) ? styles.sendCommentButtonDisabled : {})
                  }}
                  className="comments-send-button"
                  data-hover="blue"
                >
                  <Send size={15} />
                  <span>{commentSubmitting ? 'Отправка...' : 'Отправить'}</span>
                </button>
              </div>
            </form>
          </section>
          <style>{`
            @keyframes commentsOverlayIn {
              from {
                opacity: 0;
                backdrop-filter: blur(0px);
                -webkit-backdrop-filter: blur(0px);
              }
              to {
                opacity: 1;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
              }
            }

            @keyframes commentsDialogIn {
              from {
                opacity: 0;
                transform: translateY(18px) scale(0.97);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            @keyframes commentsOverlayOut {
              from {
                opacity: 1;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
              }
              to {
                opacity: 0;
                backdrop-filter: blur(0px);
                -webkit-backdrop-filter: blur(0px);
              }
            }

            @keyframes commentsDialogOut {
              from {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
              to {
                opacity: 0;
                transform: translateY(14px) scale(0.98);
              }
            }

            .comments-overlay {
              animation: commentsOverlayIn 0.22s ease-out both;
            }

            .comments-dialog {
              animation: commentsDialogIn 0.24s cubic-bezier(0.16, 1, 0.3, 1) both;
            }

            .comments-overlay-closing {
              animation: commentsOverlayOut 0.18s ease-in both;
            }

            .comments-dialog-closing {
              animation: commentsDialogOut 0.18s ease-in both;
            }

            .comments-close-button:hover:not(:disabled) {
              color: var(--color-danger) !important;
              border-color: var(--color-danger-border) !important;
              background-color: var(--color-danger-surface) !important;
            }

            .comments-close-button:focus-visible,
            .comments-send-button:focus-visible {
              box-shadow: 0 0 0 3px var(--color-brand-ring) !important;
            }

            .comment-reply-textarea::placeholder {
              color: var(--color-text-dim);
            }

            .comments-dialog-body {
              scrollbar-gutter: stable;
            }

            @media (max-width: 640px) {
              .comments-overlay {
                align-items: flex-end !important;
                padding: 0 !important;
              }

              .comments-dialog {
                width: 100% !important;
                height: min(94vh, 820px) !important;
                max-height: calc(100vh - 20px) !important;
                border-radius: 16px 16px 0 0 !important;
                border-inline: none !important;
                border-bottom: none !important;
              }

              .comments-dialog-header {
                padding: 14px 14px 12px !important;
              }

              .comments-dialog-body {
                padding: 12px 14px 14px !important;
              }

              .comment-reply-form {
                padding: 12px 14px 14px !important;
              }

              .comment-row {
                gap: 8px !important;
              }

              .comment-bubble {
                max-width: calc(100% - 40px) !important;
              }
            }

            @media (max-width: 420px) {
              .comment-reply-footer {
                align-items: stretch !important;
              }

              .comments-send-button {
                width: 100% !important;
                justify-content: center !important;
              }
            }

            @media (prefers-reduced-motion: reduce) {
              .comments-overlay,
              .comments-dialog {
                animation: none;
              }
            }
          `}</style>
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 320px))',
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
  cardTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '10px'
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
  cardActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
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
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease'
  },
  commentsButton: {
    width: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    padding: '10px 12px',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease'
  },
  commentsCountBadge: {
    minWidth: '20px',
    height: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
    borderRadius: '999px',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    color: 'inherit',
    fontSize: '12px',
    fontWeight: '700'
  },
  commentsOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    backgroundColor: 'var(--overlay)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  commentsDialog: {
    width: 'min(920px, 100%)',
    height: 'min(760px, calc(100vh - 32px))',
    borderRadius: '12px',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    boxShadow: '0 24px 80px var(--shadow-strong)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  commentsDialogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px 18px 14px',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)'
  },
  commentsDialogTitleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
    flex: 1
  },
  commentsDialogTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
    width: '100%'
  },
  commentsDialogIconWrap: {
    width: '30px',
    height: '30px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-brand-surface)',
    color: 'var(--color-primary)',
    flexShrink: 0
  },
  commentsDialogIcon: {
    color: 'currentColor',
    flexShrink: 0
  },
  commentsDialogTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--color-text-strong)',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    flexShrink: 0
  },
  commentsDialogSubtitle: {
    margin: 0,
    color: 'var(--color-text-muted)',
    fontSize: '13px',
    lineHeight: 1.35,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
    paddingLeft: '10px',
    borderLeft: '1px solid var(--color-border)'
  },
  closeDialogButton: {
    width: '30px',
    height: '30px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
  },
  commentsDialogBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 18px 16px',
    backgroundColor: 'var(--color-surface)'
  },
  commentsEmptyState: {
    minHeight: '170px',
    border: '1px dashed var(--color-border-strong)',
    borderRadius: '8px',
    padding: '22px 16px',
    textAlign: 'center',
    backgroundColor: 'var(--color-surface-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '10px'
  },
  commentsEmptyIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-brand-surface)',
    color: 'var(--color-primary)',
    border: '1px solid var(--color-border)'
  },
  commentsEmptyTitle: {
    margin: 0,
    color: 'var(--color-text-strong)',
    fontSize: '15px',
    fontWeight: '700'
  },
  commentsEmptySubtitle: {
    margin: 0,
    color: 'var(--color-text-muted)',
    fontSize: '13px',
    lineHeight: 1.45,
    maxWidth: '320px'
  },
  commentsThread: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  commentRow: {
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px'
  },
  commentRowAdmin: {
    justifyContent: 'flex-start'
  },
  commentRowUser: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start'
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
    border: '1px solid var(--color-border)',
    fontSize: '11px',
    fontWeight: '800',
    lineHeight: 1
  },
  commentAvatarAdmin: {
    backgroundColor: 'var(--color-brand-surface)',
    color: 'var(--color-primary)'
  },
  commentAvatarUser: {
    backgroundColor: 'var(--color-surface-subtle)',
    color: 'var(--color-text-secondary)'
  },
  commentBubble: {
    maxWidth: 'min(680px, calc(100% - 36px))',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxShadow: '0 1px 2px var(--shadow-soft)'
  },
  commentBubbleAdmin: {
    backgroundColor: 'var(--color-brand-surface)'
  },
  commentBubbleUser: {
    backgroundColor: 'var(--color-surface-muted)'
  },
  commentBubbleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  commentBubbleRole: {
    fontSize: '12px',
    color: 'var(--color-text-strong)',
    fontWeight: '700'
  },
  commentBubbleDate: {
    fontSize: '11px',
    color: 'var(--color-text-muted)'
  },
  commentBubbleBody: {
    margin: 0,
    fontSize: '13px',
    color: 'var(--color-text-primary)',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  commentReplyForm: {
    padding: '12px 18px 16px',
    borderTop: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-muted)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  commentComposerTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },
  commentReplyLabel: {
    color: 'var(--color-text-strong)',
    fontSize: '12px',
    fontWeight: '700'
  },
  commentReplyTextarea: {
    width: '100%',
    minHeight: '76px',
    padding: '10px 11px',
    border: '1px solid var(--color-border-strong)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    resize: 'vertical',
    lineHeight: 1.45,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
  },
  commentReplyFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    flexWrap: 'wrap'
  },
  commentError: {
    marginRight: 'auto',
    fontSize: '12px',
    color: 'var(--color-danger)',
    fontWeight: '600'
  },
  commentLimit: {
    color: 'var(--color-text-muted)',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  sendCommentButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    minHeight: '36px',
    padding: '8px 13px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
  },
  sendCommentButtonDisabled: {
    backgroundColor: 'var(--color-text-dim)',
    cursor: 'not-allowed'
  }
});

export default MainPage;
