import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';
import Navbar from './Navbar';
import LoginPage from './LoginPage';
import Footer from './Footer';
import { themeStyles } from '../lib/theme';

const EMPTY_FILTERS = {
  status: '',
  search: '',
  dateFrom: '',
  dateTo: ''
};

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

function getUserFio(user, userId) {
  if (!user) {
    return `Пользователь #${userId}`;
  }

  const fullName = [user.surname, user.name, user.second_name].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;

  return user.email || `Пользователь #${userId}`;
}

function getUserMeta(user, userId) {
  if (!user) {
    return `ID пользователя: ${userId}`;
  }

  if (user.email) {
    return user.email;
  }

  return `ID пользователя: ${userId}`;
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

function parseFormContent(content) {
  if (Array.isArray(content)) return content;
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

function AdminAnswersPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [formFields, setFormFields] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [meta, setMeta] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    per_page: 10
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [fieldFilterRows, setFieldFilterRows] = useState([]);
  const [appliedFieldFilters, setAppliedFieldFilters] = useState([]);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!selectedFormId) {
      setAnswers([]);
      setFormFields([]);
      setMeta({
        current_page: 1,
        total_pages: 1,
        total_count: 0,
        per_page: limit
      });
      return;
    }

    fetchFormFields(selectedFormId);
    fetchAnswers();
  }, [selectedFormId, page, limit, appliedFilters, appliedFieldFilters]);

  useEffect(() => {
    if (!selectedFormId) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('form_id', selectedFormId);
    window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
  }, [selectedFormId]);

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
      if (data.status !== 'ok') {
        return;
      }

      const fetchedForms = data.forms || [];
      setForms(fetchedForms);

      const url = new URL(window.location.href);
      const requestedFormId = url.searchParams.get('form_id');

      const hasRequestedForm = fetchedForms.some((form) => String(form.id) === String(requestedFormId));
      if (hasRequestedForm) {
        setSelectedFormId(String(requestedFormId));
      } else if (fetchedForms[0]) {
        setSelectedFormId(String(fetchedForms[0].id));
      }
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    }
  };

  const fetchFormFields = async (formId) => {
    try {
      const response = await fetch(`/api/forms/one?id=${encodeURIComponent(formId)}`, {
        credentials: 'include'
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.status !== 'ok' || !data.form) return;
      const fields = parseFormContent(data.form.content);
      setFormFields(fields);
    } catch (error) {
      console.error('Failed to fetch form fields:', error);
    }
  };

  const fetchAnswers = async () => {
    if (!selectedFormId) {
      return;
    }

    setLoadingAnswers(true);
    setFetchError('');

    const payload = {
      form_id: Number(selectedFormId),
      page,
      limit
    };

    if (appliedFilters.status) {
      payload.status = appliedFilters.status;
    }

    if (appliedFilters.search) {
      payload.search = appliedFilters.search;
    }

    if (appliedFilters.dateFrom) {
      payload.date_from = appliedFilters.dateFrom;
    }

    if (appliedFilters.dateTo) {
      payload.date_to = appliedFilters.dateTo;
    }

    const validFieldFilters = appliedFieldFilters.filter((row) => row.fieldId && row.value !== '');
    if (validFieldFilters.length > 0) {
      const fieldFiltersObj = {};
      validFieldFilters.forEach((row) => {
        fieldFiltersObj[row.fieldId] = row.value;
      });
      payload.field_filters = fieldFiltersObj;
    }

    try {
      const response = await fetch('/api/forms/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error') {
        setAnswers([]);
        setFetchError(data.detail || 'Не удалось загрузить ответы');
        return;
      }

      setAnswers(Array.isArray(data.answers) ? data.answers : []);
      setMeta({
        current_page: data.meta?.current_page || page,
        total_pages: data.meta?.total_pages || 1,
        total_count: data.meta?.total_count || 0,
        per_page: data.meta?.per_page || limit
      });
    } catch (error) {
      console.error('Failed to fetch answers:', error);
      setAnswers([]);
      setFetchError('Ошибка сети при загрузке ответов');
    } finally {
      setLoadingAnswers(false);
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
      return;
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      status: filters.status,
      search: filters.search.trim(),
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo
    });
    setAppliedFieldFilters(fieldFilterRows.filter((row) => row.fieldId && row.value !== ''));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setFieldFilterRows([]);
    setAppliedFieldFilters([]);
    setPage(1);
  };

  const addFieldFilterRow = () => {
    setFieldFilterRows((prev) => [...prev, { id: Date.now(), fieldId: '', value: '' }]);
  };

  const removeFieldFilterRow = (rowId) => {
    setFieldFilterRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const updateFieldFilterRow = (rowId, key, value) => {
    setFieldFilterRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [key]: value } : row))
    );
  };

  const currentPage = meta.current_page || page;
  const totalPages = Math.max(meta.total_pages || 1, 1);

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
          <div style={styles.headerRow}>
            <div>
              <h1 style={styles.pageTitle}>Ответы по формам</h1>
              <p style={styles.pageSubtitle}>Фильтрация и постраничный просмотр ответов администратором</p>
            </div>
          </div>

          <section style={styles.filtersCard}>
            <div style={styles.filtersHeader}>
              <SlidersHorizontal size={16} />
              <h2 style={styles.filtersTitle}>Фильтры</h2>
            </div>

            <div style={styles.filtersGrid}>
              <label style={styles.inputLabel}>
                Форма
                <select
                  value={selectedFormId}
                  onChange={(event) => {
                    setSelectedFormId(event.target.value);
                    setFieldFilterRows([]);
                    setAppliedFieldFilters([]);
                    setPage(1);
                  }}
                  style={styles.selectInput}
                >
                  {forms.length === 0 && <option value="">Нет форм</option>}
                  {forms.map((form) => (
                    <option key={form.id} value={String(form.id)}>
                      {form.name || `Форма #${form.id}`}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.inputLabel}>
                Статус
                <select
                  value={filters.status}
                  onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                  style={styles.selectInput}
                >
                  <option value="">Все статусы</option>
                  <option value="waiting">Ожидает проверки</option>
                  <option value="approved">Подтверждено</option>
                  <option value="edits_required">Нужны правки</option>
                </select>
              </label>

              <label style={styles.inputLabel}>
                Поиск по ответам
                <div style={styles.inputWithIcon}>
                  <Search size={15} style={styles.inputIcon} />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                    placeholder="Текст из ответа, email или ФИО"
                    style={styles.textInput}
                  />
                </div>
              </label>

              <label style={styles.inputLabel}>
                Дата от
                <div style={styles.inputWithIcon}>
                  <Calendar size={15} style={styles.inputIcon} />
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
                    style={styles.textInput}
                  />
                </div>
              </label>

              <label style={styles.inputLabel}>
                Дата до
                <div style={styles.inputWithIcon}>
                  <Calendar size={15} style={styles.inputIcon} />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
                    style={styles.textInput}
                  />
                </div>
              </label>
            </div>

            {selectedFormId && formFields.length > 0 && (
              <div style={styles.fieldFiltersSection}>
                <div style={styles.fieldFiltersHeader}>
                  <Filter size={14} style={{ color: '#6b7280' }} />
                  <span style={styles.fieldFiltersTitle}>Фильтры по полям</span>
                  <button
                    type="button"
                    onClick={addFieldFilterRow}
                    style={styles.addFieldFilterBtn}
                    data-hover="soft-brand"
                  >
                    <Plus size={13} />
                    <span>Добавить</span>
                  </button>
                </div>

                {fieldFilterRows.length === 0 ? (
                  <p style={styles.fieldFiltersEmpty}>
                    Нажмите «Добавить», чтобы фильтровать по значению поля
                  </p>
                ) : (
                  <div style={styles.fieldFilterRows}>
                    {fieldFilterRows.map((row) => (
                      <div key={row.id} style={styles.fieldFilterRow}>
                        <select
                          value={row.fieldId}
                          onChange={(e) => updateFieldFilterRow(row.id, 'fieldId', e.target.value)}
                          style={styles.fieldFilterSelect}
                        >
                          <option value="">Выберите поле</option>
                          {formFields.map((field) => (
                            <option key={field.id} value={field.id}>
                              {field.label || field.id}
                            </option>
                          ))}
                        </select>

                        {(() => {
                          const field = formFields.find((f) => f.id === row.fieldId);
                          if (!field) {
                            return (
                              <input
                                type="text"
                                value={row.value}
                                onChange={(e) => updateFieldFilterRow(row.id, 'value', e.target.value)}
                                placeholder="Значение"
                                style={styles.fieldFilterValue}
                              />
                            );
                          }
                          if (field.type === 'checkbox') {
                            return (
                              <select
                                value={row.value}
                                onChange={(e) => updateFieldFilterRow(row.id, 'value', e.target.value)}
                                style={styles.fieldFilterValue}
                              >
                                <option value="">Любое</option>
                                <option value="true">Да</option>
                                <option value="false">Нет</option>
                              </select>
                            );
                          }
                          if (field.type === 'select' && Array.isArray(field.options) && field.options.length > 0) {
                            return (
                              <select
                                value={row.value}
                                onChange={(e) => updateFieldFilterRow(row.id, 'value', e.target.value)}
                                style={styles.fieldFilterValue}
                              >
                                <option value="">Любое</option>
                                {field.options.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            );
                          }
                          return (
                            <input
                              type={field.type === 'number' ? 'number' : 'text'}
                              value={row.value}
                              onChange={(e) => updateFieldFilterRow(row.id, 'value', e.target.value)}
                              placeholder="Значение"
                              style={styles.fieldFilterValue}
                            />
                          );
                        })()}

                        <button
                          type="button"
                          onClick={() => removeFieldFilterRow(row.id)}
                          style={styles.removeFieldFilterBtn}
                          data-hover="red"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={styles.filtersActions}>
              <label style={styles.perPageLabel}>
                На страницу
                <select
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setPage(1);
                  }}
                  style={styles.perPageSelect}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>

              <button onClick={handleApplyFilters} style={styles.primaryAction} data-hover="blue">
                <Filter size={15} />
                <span>Применить фильтры</span>
              </button>

              <button onClick={handleResetFilters} style={styles.secondaryAction} data-hover="gray">
                Сбросить
              </button>
            </div>
          </section>

          <section style={styles.answersCard}>
            <div style={styles.answersHeader}>
              <p style={styles.resultsCount}>Найдено ответов: {meta.total_count || 0}</p>
              <p style={styles.paginationHint}>
                Страница {currentPage} из {totalPages}
              </p>
            </div>

            {fetchError && <p style={styles.errorText}>{fetchError}</p>}

            {loadingAnswers ? (
              <div style={styles.loadingAnswers}>Загрузка ответов...</div>
            ) : answers.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyTitle}>Ответов пока нет</p>
                <p style={styles.emptySubtitle}>Измените фильтры или выберите другую форму</p>
              </div>
            ) : (
              <div style={styles.answersList}>
                {answers.map((answerItem) => {
                  return (
                    <button
                      key={answerItem.id}
                      type="button"
                      className="answer-clickable-card"
                      onClick={() => {
                        window.open(
                          `/admin/answers/view?answer_id=${answerItem.id}&form_id=${answerItem.form_id}`,
                          '_blank',
                          'noopener,noreferrer'
                        );
                      }}
                      style={styles.answerItem}
                    >
                      <div style={styles.answerHeader}>
                        <div>
                          <h3 style={styles.answerTitle}>{getUserFio(answerItem.user, answerItem.user_id)}</h3>
                          <p style={styles.answerUser}>{getUserMeta(answerItem.user, answerItem.user_id)}</p>
                        </div>

                        <span style={{ ...styles.statusBadge, ...styles[`status_${answerItem.status}`] }}>
                          {getStatusLabel(answerItem.status)}
                        </span>
                      </div>

                      <p style={styles.answerMeta}>Создан: {formatDateTime(answerItem.created_at)}</p>
                    </button>
                  );
                })}
              </div>
            )}

            <div style={styles.paginationRow}>
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                style={styles.paginationButton}
                data-hover="gray"
                disabled={loadingAnswers || currentPage <= 1}
              >
                <ChevronLeft size={16} />
                <span>Назад</span>
              </button>

              <span style={styles.paginationInfo}>
                Страница {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                style={styles.paginationButton}
                data-hover="gray"
                disabled={loadingAnswers || currentPage >= totalPages}
              >
                <span>Вперед</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
      <style>{`
        @media (hover: hover) {
          .answer-clickable-card:hover {
            background-color: var(--color-brand-surface) !important;
            border-color: var(--color-brand) !important;
            box-shadow: 0 8px 20px var(--shadow-soft) !important;
          }
        }
        .answer-clickable-card:focus-visible {
          border-color: var(--color-brand) !important;
          box-shadow: 0 0 0 3px var(--color-brand-ring) !important;
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
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
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
  filtersCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  filtersHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#374151'
  },
  filtersTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px'
  },
  inputLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    color: '#374151',
    fontWeight: '500'
  },
  selectInput: {
    width: '100%',
    padding: '9px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    fontSize: '14px'
  },
  inputWithIcon: {
    position: 'relative'
  },
  inputIcon: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af'
  },
  textInput: {
    width: '100%',
    padding: '9px 10px 9px 34px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    fontSize: '14px'
  },
  fieldFiltersSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  fieldFiltersHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  fieldFiltersTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    flex: 1
  },
  addFieldFilterBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 10px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  fieldFiltersEmpty: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  fieldFilterRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  fieldFilterRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  fieldFilterSelect: {
    flex: '1 1 180px',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    fontSize: '13px',
    minWidth: '0'
  },
  fieldFilterValue: {
    flex: '1 1 160px',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    fontSize: '13px',
    minWidth: '0'
  },
  removeFieldFilterBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#9ca3af',
    cursor: 'pointer',
    flexShrink: 0
  },
  filtersActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center'
  },
  perPageLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#374151',
    fontWeight: '500'
  },
  perPageSelect: {
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '8px 10px',
    backgroundColor: '#ffffff',
    fontSize: '14px'
  },
  primaryAction: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '9px 14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  secondaryAction: {
    padding: '9px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  answersCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  answersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  resultsCount: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937'
  },
  paginationHint: {
    fontSize: '13px',
    color: '#6b7280'
  },
  answersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  answerItem: {
    textAlign: 'left',
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '14px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  },
  answerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start'
  },
  answerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px'
  },
  answerUser: {
    fontSize: '13px',
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
  answerMeta: {
    fontSize: '12px',
    color: '#6b7280'
  },
  paginationRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '12px'
  },
  paginationButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  paginationInfo: {
    fontSize: '13px',
    color: '#6b7280'
  },
  loadingAnswers: {
    padding: '30px 16px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b7280'
  },
  emptyState: {
    border: '1px dashed #d1d5db',
    borderRadius: '10px',
    padding: '26px 16px',
    textAlign: 'center'
  },
  emptyTitle: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '8px'
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#6b7280'
  },
  errorText: {
    color: '#dc2626',
    fontSize: '13px',
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

export default AdminAnswersPage;
