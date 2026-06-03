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

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  const submittedForms = forms.filter(f => myAnswers[f.id]);
  const availableForms = forms.filter(f => !myAnswers[f.id]);
  const activeCommentsAnswer = commentsFormId ? myAnswers[commentsFormId] : null;
  const activeCommentsForm = commentsFormId
    ? forms.find((form) => String(form.id) === String(commentsFormId))
    : null;
  const activeComments = getAnswerComments(activeCommentsAnswer);
  const activeCommentsStatus = activeCommentsAnswer ? getAnswerStatusConfig(activeCommentsAnswer.status) : null;

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
            <div style={styles.commentsDialogHeader}>
              <div style={styles.commentsDialogTitleBlock}>
                <div style={styles.commentsDialogTitleRow}>
                  <MessageSquare size={18} style={styles.commentsDialogIcon} />
                  <h2 style={styles.commentsDialogTitle}>Комментарии</h2>
                </div>
                <p style={styles.commentsDialogSubtitle}>{activeCommentsForm.name}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseComments}
                style={styles.closeDialogButton}
                className="comments-close-button"
                aria-label="Закрыть комментарии"
              >
                <X size={18} />
              </button>
            </div>

            <div style={styles.commentsDialogBody}>
              {activeComments.length === 0 ? (
                <div style={styles.commentsEmptyState}>
                  <p style={styles.commentsEmptyTitle}>Обсуждение пока пустое</p>
                  <p style={styles.commentsEmptySubtitle}>Напишите администратору уточнение по этой заявке.</p>
                </div>
              ) : (
                <div style={styles.commentsThread}>
                  {activeComments.map((comment, index) => {
                    const body = typeof comment?.body === 'string' ? comment.body.trim() : '';
                    const isAdminComment = comment?.author_role === 'admin';

                    return (
                      <div
                        key={comment?.id || index}
                        style={{
                          ...styles.commentBubble,
                          ...(isAdminComment ? styles.commentBubbleAdmin : styles.commentBubbleUser)
                        }}
                      >
                        <div style={styles.commentBubbleHeader}>
                          <span style={styles.commentBubbleRole}>
                            {isAdminComment
                              ? getCommentRoleLabel('admin')
                              : (comment?.author_name || 'Пользователь')}
                          </span>
                          <span style={styles.commentBubbleDate}>{formatTicketDate(comment?.created_at)}</span>
                        </div>
                        <StatusChangePills statusChange={comment?.status_change} />
                        {body && <p style={styles.commentBubbleBody}>{body}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <form onSubmit={handleCommentReplySubmit} style={styles.commentReplyForm}>
              <textarea
                value={commentReply}
                onChange={(event) => setCommentReply(event.target.value)}
                placeholder="Напишите сообщение администратору"
                rows={3}
                maxLength={2000}
                style={styles.commentReplyTextarea}
              />
              <div style={styles.commentReplyFooter}>
                {commentError && <span style={styles.commentError}>{commentError}</span>}
                <span style={styles.commentLimit}>{commentReply.trim().length}/2000</span>
                <button
                  type="submit"
                  disabled={commentSubmitting || !commentReply.trim()}
                  style={{
                    ...styles.sendCommentButton,
                    ...((commentSubmitting || !commentReply.trim()) ? styles.sendCommentButtonDisabled : {})
                  }}
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
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
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
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
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
    padding: '24px',
    backgroundColor: 'rgba(17, 24, 39, 0.46)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  commentsDialog: {
    width: 'min(720px, 100%)',
    maxHeight: 'calc(100vh - 48px)',
    borderRadius: '18px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  commentsDialogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '20px 20px 14px',
    borderBottom: '1px solid #e5e7eb'
  },
  commentsDialogTitleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    minWidth: 0
  },
  commentsDialogTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  commentsDialogIcon: {
    color: '#3b82f6',
    flexShrink: 0
  },
  commentsDialogTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937'
  },
  commentsDialogSubtitle: {
    margin: 0,
    color: '#6b7280',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  closeDialogButton: {
    width: '34px',
    height: '34px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    color: '#4b5563',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease'
  },
  commentsDialogStatusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    padding: '14px 20px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb'
  },
  commentsDialogMeta: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '600'
  },
  commentsDialogBody: {
    overflowY: 'auto',
    padding: '18px 20px',
    backgroundColor: '#ffffff'
  },
  commentsEmptyState: {
    border: '1px dashed #d1d5db',
    borderRadius: '12px',
    padding: '24px 16px',
    textAlign: 'center',
    backgroundColor: '#f9fafb'
  },
  commentsEmptyTitle: {
    margin: '0 0 6px',
    color: '#1f2937',
    fontSize: '16px',
    fontWeight: '700'
  },
  commentsEmptySubtitle: {
    margin: 0,
    color: '#6b7280',
    fontSize: '14px'
  },
  commentsThread: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  commentBubble: {
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  commentBubbleAdmin: {
    backgroundColor: '#eff6ff'
  },
  commentBubbleUser: {
    backgroundColor: '#f9fafb'
  },
  commentBubbleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  commentBubbleRole: {
    fontSize: '13px',
    color: '#1f2937',
    fontWeight: '700'
  },
  commentBubbleDate: {
    fontSize: '12px',
    color: '#6b7280'
  },
  commentBubbleBody: {
    margin: 0,
    fontSize: '14px',
    color: '#1f2937',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  commentReplyForm: {
    padding: '16px 20px 20px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  commentReplyTextarea: {
    width: '100%',
    padding: '11px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    lineHeight: 1.45
  },
  commentReplyFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
    flexWrap: 'wrap'
  },
  commentError: {
    marginRight: 'auto',
    fontSize: '13px',
    color: '#dc2626',
    fontWeight: '600'
  },
  commentLimit: {
    color: '#6b7280',
    fontSize: '12px'
  },
  sendCommentButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '10px 14px',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease'
  },
  sendCommentButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  }
});

export default MainPage;
