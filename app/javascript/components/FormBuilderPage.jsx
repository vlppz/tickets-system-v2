import React, { useState, useEffect } from 'react';
import { GripVertical, Plus, Trash2, Save, Type, Hash, ChevronDown, CheckSquare, AlignLeft, Settings, X, ChevronUp, ChevronDown as ChevronDownIcon } from 'lucide-react';
import Navbar from './Navbar';
import LoginPage from './LoginPage';
import Footer from './Footer';
import { themeStyles, themeValue } from '../lib/theme';

function parseBuilderContent(content) {
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

function normalizeBuilderField(field, index) {
  return {
    id: field?.id || `field_${Date.now()}_${index}`,
    label: field?.label || '',
    type: field?.type || 'text',
    required: Boolean(field?.required),
    description: field?.description || '',
    options: Array.isArray(field?.options) ? field.options : [],
    requirementCondition: field?.requirementCondition || null
  };
}

function FormBuilderPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [expandingPanel, setExpandingPanel] = useState(false);
  const [formName, setFormName] = useState('');
  const [fields, setFields] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(null);
  const [isDraggingNew, setIsDraggingNew] = useState(false);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState(null);
  const [selectedFields, setSelectedFields] = useState(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [showComponentsSidebar, setShowComponentsSidebar] = useState(false);
  const [showPropertiesSidebar, setShowPropertiesSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [editingFormId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('form_id');
  });
  const isEditMode = Boolean(editingFormId);

  useEffect(() => {
    // Add custom checkbox styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = themeValue(`
      .custom-checkbox-input-builder {
        position: absolute;
        opacity: 0;
        cursor: pointer;
      }
      .custom-checkbox-builder {
        position: relative;
        display: inline-block;
        width: 18px;
        height: 18px;
        background-color: #ffffff;
        border: 2px solid #d1d5db;
        border-radius: 4px;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      .custom-checkbox-input-builder:checked + .custom-checkbox-builder {
        background-color: #3b82f6;
        border-color: #3b82f6;
      }
      .custom-checkbox-input-builder:checked + .custom-checkbox-builder::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -60%) rotate(45deg);
        width: 3.5px;
        height: 7px;
        border: solid white;
        border-width: 0 2px 2px 0;
      }
      .custom-checkbox-input-builder:focus + .custom-checkbox-builder {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      .custom-checkbox-input-builder:hover + .custom-checkbox-builder {
        border-color: #9ca3af;
      }
      
      /* Remove all tap highlights globally - NUCLEAR OPTION */
      *,
      *::before,
      *::after {
        -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
        -webkit-tap-highlight-color: transparent !important;
        -webkit-touch-callout: none !important;
        tap-highlight-color: transparent !important;
      }
      
      /* Prevent SVG icons from being tap targets */
      svg, svg *, path, circle, rect, line, polyline, polygon {
        pointer-events: none !important;
        -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
      }
      
      /* Fix button tap colors - use gray instead of blue */
      .mobile-header-btn,
      .mobile-header-btn *,
      .mobile-reorder-btn,
      .mobile-reorder-btn * {
        -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
      }
      
      .mobile-header-btn:active {
        background-color: #e5e7eb !important;
        transform: scale(0.95);
      }
      .mobile-reorder-btn:active:not(:disabled) {
        background-color: #e5e7eb !important;
        transform: scale(0.95);
      }
      
      /* Override any button active states */
      button,
      button *,
      button:active,
      button:focus {
        outline: none !important;
        -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      
      /* Ensure buttons themselves are tap targets */
      button {
        user-select: none;
        -webkit-user-select: none;
      }
      
      input, textarea {
        -webkit-user-select: text !important;
      }
    `);
    document.head.appendChild(styleSheet);
    
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    checkAuth();
    
    return () => {
      document.head.removeChild(styleSheet);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
          return;
        }
        
        e.preventDefault();
        
        if (selectedFields.size > 0) {
          // Delete multiple selected fields
          const newFields = fields.filter((_, index) => !selectedFields.has(index));
          setFields(newFields);
          setSelectedFields(new Set());
          setSelectedFieldIndex(null);
        } else if (selectedFieldIndex !== null) {
          // Delete single selected field
          removeField(selectedFieldIndex);
          setSelectedFieldIndex(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldIndex, selectedFields, fields]);

  const loadFormForEdit = async (formId) => {
    if (!formId) {
      return;
    }

    try {
      const response = await fetch(`/api/forms/one?id=${formId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load form');
      }

      const data = await response.json();

      if (data.status !== 'ok' || !data.form) {
        alert(data.detail || 'Не удалось загрузить форму для редактирования');
        window.location.href = '/admin/forms';
        return;
      }

      setFormName(data.form.name || '');

      const parsedFields = parseBuilderContent(data.form.content).map(normalizeBuilderField);
      setFields(parsedFields);
    } catch (error) {
      console.error('Failed to load form for editing:', error);
      alert('Не удалось загрузить форму для редактирования');
      window.location.href = '/admin/forms';
    }
  };

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      const data = await response.json();
      setUser(data.user);
      
      if (!data.user || !data.user.is_admin) {
        window.location.href = '/';
        return;
      }

      if (isEditMode) {
        await loadFormForEdit(editingFormId);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setTransitioning(true);
    sessionStorage.setItem('justLoggedOut', 'true');
    await fetch('/api/auth/logout', {
      credentials: 'include'
    });
    setTimeout(() => {
      window.location.href = '/';
    }, 600);
  };

  const handleLoginSuccess = async (userData) => {
    if (!userData?.is_admin) {
      window.location.href = '/';
      return;
    }

    setExpandingPanel(true);
    if (isEditMode) {
      await loadFormForEdit(editingFormId);
    }
    setTimeout(() => {
      setUser(userData);
    }, 900);
    setTimeout(() => {
      setExpandingPanel(false);
    }, 1500);
  };

  const handleNavigate = (page) => {
    if (page === 'tickets') {
      window.location.href = '/';
      return;
    }

    if (page === 'all_forms') {
      window.location.href = '/admin/forms';
      return;
    }

    if (page === 'answers') {
      window.location.href = '/admin/answers';
    }
  };

  const addField = () => {
    const newField = {
      id: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      description: '',
      options: [],
      requirementCondition: null
    };
    setFields([...fields, newField]);
  };

  const updateField = (index, updates) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveFieldUp = (index) => {
    if (index === 0) return;
    const newFields = [...fields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    setFields(newFields);
    setSelectedFieldIndex(index - 1);
  };

  const moveFieldDown = (index) => {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    setFields(newFields);
    setSelectedFieldIndex(index + 1);
  };

  const addOption = (index) => {
    const newFields = [...fields];
    newFields[index].options = [...(newFields[index].options || []), ''];
    setFields(newFields);
  };

  const updateOption = (fieldIndex, optionIndex, value) => {
    const newFields = [...fields];
    newFields[fieldIndex].options[optionIndex] = value;
    setFields(newFields);
  };

  const removeOption = (fieldIndex, optionIndex) => {
    const newFields = [...fields];
    newFields[fieldIndex].options = newFields[fieldIndex].options.filter((_, i) => i !== optionIndex);
    setFields(newFields);
  };

  // Component types for sidebar
  const componentTypes = [
    { type: 'text', label: 'Текст', icon: Type, description: 'Однострочное текстовое поле' },
    { type: 'number', label: 'Число', icon: Hash, description: 'Числовое поле' },
    { type: 'select', label: 'Выбор', icon: ChevronDown, description: 'Выпадающий список' },
    { type: 'checkbox', label: 'Чекбокс', icon: CheckSquare, description: 'Да/Нет вопрос' },
    { type: 'textarea', label: 'Текстовая область', icon: AlignLeft, description: 'Многострочный текст' }
  ];

  // Drag new component from sidebar
  const handleComponentDragStart = (e, type) => {
    e.dataTransfer.setData('componentType', type);
    setIsDraggingNew(true);
  };

  const handleComponentDragEnd = () => {
    setIsDraggingNew(false);
    setDropIndicatorIndex(null);
  };

  // Drag existing field to reorder
  const handleFieldDragStart = (e, index) => {
    e.dataTransfer.setData('fieldIndex', index.toString());
    setDraggedIndex(index);
  };

  const handleFieldDragEnd = () => {
    setDraggedIndex(null);
    setDropIndicatorIndex(null);
  };

  // Calculate drop position from mouse Y
  const calculateDropIndex = (e, container) => {
    if (!container) return fields.length;
    
    const cards = container.querySelectorAll('.field-card-draggable');
    if (cards.length === 0) return 0;
    
    const mouseY = e.clientY;
    
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      const cardMiddle = rect.top + rect.height / 2;
      
      if (mouseY < cardMiddle) {
        return i;
      }
    }
    
    return cards.length;
  };

  // Mouse selection rectangle
  const handleCanvasMouseDown = (e) => {
    // Only start selection if clicking on the canvas background, not on a card
    if (e.target.closest('.field-card-draggable') || e.target.closest('input') || e.target.closest('button')) {
      return;
    }
    
    setIsSelecting(true);
    setSelectionStart({ x: e.clientX, y: e.clientY });
    setSelectedFields(new Set());
    setSelectedFieldIndex(null);
  };

  const handleCanvasMouseMove = (e) => {
    if (!isSelecting || !selectionStart) return;
    
    // Update current position for selection rectangle
    setSelectionStart({ ...selectionStart, currentX: e.clientX, currentY: e.clientY });
    
    const container = document.querySelector('[data-fields-container]');
    if (!container) return;
    
    const cards = container.querySelectorAll('.field-card-draggable');
    const selectionRect = {
      left: Math.min(selectionStart.x, e.clientX),
      right: Math.max(selectionStart.x, e.clientX),
      top: Math.min(selectionStart.y, e.clientY),
      bottom: Math.max(selectionStart.y, e.clientY)
    };
    
    const newSelected = new Set();
    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      
      // Check if rectangles intersect
      if (!(rect.right < selectionRect.left || 
            rect.left > selectionRect.right || 
            rect.bottom < selectionRect.top || 
            rect.top > selectionRect.bottom)) {
        newSelected.add(index);
      }
    });
    
    setSelectedFields(newSelected);
  };

  const handleCanvasMouseUp = () => {
    setIsSelecting(false);
    setSelectionStart(null);
  };

  // Handle drag over canvas
  const handleCanvasDragOver = (e) => {
    e.preventDefault();
    const container = e.currentTarget.querySelector('[data-fields-container]');
    if (container) {
      const dropIndex = calculateDropIndex(e, container);
      setDropIndicatorIndex(dropIndex);
    }
  };

  // Single drop handler for everything
  const handleCanvasDrop = (e) => {
    e.preventDefault();
    
    const componentType = e.dataTransfer.getData('componentType');
    const fieldIndexStr = e.dataTransfer.getData('fieldIndex');
    
    const container = e.currentTarget.querySelector('[data-fields-container]');
    const dropIndex = calculateDropIndex(e, container);
    
    if (componentType) {
      // Adding new component from sidebar
      const newField = {
        id: `field_${Date.now()}`,
        label: '',
        type: componentType,
        required: false,
        description: '',
        options: componentType === 'select' ? [''] : [],
        requirementCondition: null
      };
      
      const newFields = [...fields];
      newFields.splice(dropIndex, 0, newField);
      setFields(newFields);
      setSelectedFieldIndex(dropIndex);
    } else if (fieldIndexStr !== '') {
      // Reordering existing field
      const oldIndex = parseInt(fieldIndexStr);
      if (!isNaN(oldIndex) && oldIndex !== dropIndex) {
        const newFields = [...fields];
        const [movedField] = newFields.splice(oldIndex, 1);
        const adjustedDropIndex = oldIndex < dropIndex ? dropIndex - 1 : dropIndex;
        newFields.splice(adjustedDropIndex, 0, movedField);
        setFields(newFields);
        setSelectedFieldIndex(adjustedDropIndex);
      }
    }
    
    setIsDraggingNew(false);
    setDraggedIndex(null);
    setDropIndicatorIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedName = formName.trim();

    if (!normalizedName) {
      alert('Введите название формы');
      return;
    }

    setSubmitting(true);
    
    try {
      const payload = {
        name: normalizedName,
        content: JSON.stringify(fields)
      };

      if (isEditMode) {
        payload.id = editingFormId;
      }

      const response = await fetch(isEditMode ? '/api/forms/update' : '/api/forms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
          alert(isEditMode ? 'Форма обновлена!' : 'Форма успешно сохранена!');
          window.location.href = '/admin/forms';
        } else {
          alert('Ошибка при сохранении формы: ' + (data.detail || 'Неизвестная ошибка'));
        }
      } else {
        alert('Ошибка при сохранении формы');
      }
    } catch (error) {
      console.error('Error saving form:', error);
      alert('Ошибка сети');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        ...styles.pageTransition,
        opacity: expandingPanel ? 0 : (transitioning ? 0 : 1)
      }}>
        <LoginPage onLoginSuccess={handleLoginSuccess} isTransitioning={expandingPanel} isReversing={transitioning} />
      </div>
    );
  }

  return (
    <div style={{
      ...styles.container,
      ...styles.pageTransition,
      opacity: transitioning ? 0 : 1
    }}>
      <Navbar user={user} onLogout={handleLogout} currentPage="all_forms" onNavigate={handleNavigate} />
      
      <div style={isMobile ? styles.builderLayoutMobile : styles.builderLayout}>
        {/* Left Sidebar - Components */}
        <div style={{
          ...styles.sidebar,
          ...(isMobile ? styles.sidebarMobile : {}),
          ...(isMobile && showComponentsSidebar ? styles.sidebarMobileOpen : {}),
          ...(isMobile && !showComponentsSidebar ? styles.sidebarMobileHidden : {})
        }}>
          <div style={styles.sidebarHeader}>
            <h3 style={styles.sidebarTitle}>Компоненты</h3>
            {isMobile && (
              <button
                onClick={() => setShowComponentsSidebar(false)}
                style={styles.closeSidebarButton}
              >
                <X size={20} />
              </button>
            )}
          </div>
          
          <div style={styles.componentsSection}>
            <p style={styles.componentsSectionTitle}>Поля формы</p>
            <div style={styles.componentsList}>
              {componentTypes.map((component) => {
                const Icon = component.icon;
                return (
                  <div
                    key={component.type}
                    draggable={!isMobile}
                    onDragStart={(e) => !isMobile && handleComponentDragStart(e, component.type)}
                    onDragEnd={handleComponentDragEnd}
                    onClick={() => {
                      if (isMobile) {
                        // On mobile, clicking adds the field directly
                        const newField = {
                          id: `field_${Date.now()}`,
                          label: '',
                          type: component.type,
                          required: false,
                          description: '',
                          options: component.type === 'select' ? [''] : [],
                          requirementCondition: null
                        };
                        setFields([...fields, newField]);
                        setShowComponentsSidebar(false);
                        setSelectedFieldIndex(fields.length);
                        setShowPropertiesSidebar(true);
                      }
                    }}
                    style={{
                      ...styles.componentButton,
                      ...(isMobile ? { cursor: 'pointer' } : {})
                    }}
                    className="component-draggable"
                  >
                    <div style={styles.componentIcon}>
                      <Icon size={20} />
                    </div>
                    <div style={styles.componentInfo}>
                      <div style={styles.componentLabel}>{component.label}</div>
                      <div style={styles.componentDescription}>{component.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center - Form Canvas */}
        <div style={styles.canvas}>
          <div style={isMobile ? styles.canvasHeaderMobile : styles.canvasHeader}>
            {isMobile && (
              <div style={styles.mobileHeaderButtons}>
                <button
                  onClick={() => {
                    setShowComponentsSidebar(true);
                    setShowPropertiesSidebar(false);
                  }}
                  style={styles.mobileHeaderButton}
                  className="mobile-header-btn"
                  title="Компоненты"
                >
                  <Plus size={20} />
                </button>
                {selectedFieldIndex !== null && (
                  <button
                    onClick={() => {
                      setShowPropertiesSidebar(true);
                      setShowComponentsSidebar(false);
                    }}
                    style={styles.mobileHeaderButton}
                    className="mobile-header-btn"
                    title="Свойства"
                  >
                    <Settings size={20} />
                  </button>
                )}
              </div>
            )}
            <input
              type="text"
              placeholder="Название формы"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              style={isMobile ? styles.formTitleInputMobile : styles.formTitleInput}
              required
            />
            {isEditMode && !isMobile && (
              <span style={styles.editModeBadge}>Редактирование формы #{editingFormId}</span>
            )}
            <div style={styles.canvasActions}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || fields.length === 0 || !formName.trim()}
                style={{
                  ...styles.publishButton,
                  ...(isMobile ? styles.publishButtonMobile : {}),
                  ...(submitting || fields.length === 0 || !formName.trim() ? styles.publishButtonDisabled : {})
                }}
                {...(!(submitting || fields.length === 0 || !formName.trim()) && { 'data-hover': 'blue' })}
              >
                {submitting ? (
                  <>
                    <div style={styles.spinner}></div>
                    {!isMobile && <span>Сохранение...</span>}
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {!isMobile && <span>{isEditMode ? 'Сохранить изменения' : 'Опубликовать'}</span>}
                  </>
                )}
              </button>
            </div>
          </div>

          <div 
            style={{
              ...styles.canvasContent,
              ...((isDraggingNew || draggedIndex !== null) ? styles.canvasContentDragOver : {})
            }}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            {fields.length === 0 ? (
              <div style={styles.emptyCanvas}>
                <div style={styles.emptyCanvasIcon}>
                  <Plus size={48} />
                </div>
                <h3 style={styles.emptyCanvasTitle}>Начните создавать форму</h3>
                <p style={styles.emptyCanvasText}>
                  Перетащите компонент из левой панели, чтобы добавить его в форму
                </p>
              </div>
            ) : (
              <div style={styles.formFields} data-fields-container>
                {fields.map((field, index) => (
                  <React.Fragment key={field.id}>
                    {dropIndicatorIndex === index && (isDraggingNew || draggedIndex !== null) && (
                      <div style={styles.dropIndicator} />
                    )}
                    <FormFieldCard
                      field={field}
                      index={index}
                      isSelected={selectedFieldIndex === index || selectedFields.has(index)}
                      onClick={(e) => {
                        if (isMobile) {
                          // On mobile, clicking opens properties
                          setSelectedFieldIndex(index);
                          setSelectedFields(new Set());
                          setShowPropertiesSidebar(true);
                        } else if (e.shiftKey && selectedFieldIndex !== null) {
                          // Shift+click: select range
                          const start = Math.min(selectedFieldIndex, index);
                          const end = Math.max(selectedFieldIndex, index);
                          const newSelected = new Set();
                          for (let i = start; i <= end; i++) {
                            newSelected.add(i);
                          }
                          setSelectedFields(newSelected);
                        } else if (e.ctrlKey || e.metaKey) {
                          // Ctrl/Cmd+click: toggle selection
                          const newSelected = new Set(selectedFields);
                          if (newSelected.has(index)) {
                            newSelected.delete(index);
                          } else {
                            newSelected.add(index);
                          }
                          setSelectedFields(newSelected);
                          setSelectedFieldIndex(index);
                        } else {
                          // Normal click: select single
                          setSelectedFieldIndex(index);
                          setSelectedFields(new Set());
                        }
                      }}
                      onDragStart={handleFieldDragStart}
                      onDragEnd={handleFieldDragEnd}
                      isDragging={draggedIndex === index}
                      isMobile={isMobile}
                      onMoveUp={() => moveFieldUp(index)}
                      onMoveDown={() => moveFieldDown(index)}
                      canMoveUp={index > 0}
                      canMoveDown={index < fields.length - 1}
                    />
                  </React.Fragment>
                ))}
                {dropIndicatorIndex === fields.length && (isDraggingNew || draggedIndex !== null) && (
                  <div style={styles.dropIndicator} />
                )}
              </div>
            )}
            {isSelecting && selectionStart && (
              <div
                style={{
                  position: 'fixed',
                  left: Math.min(selectionStart.x, selectionStart.currentX || selectionStart.x),
                  top: Math.min(selectionStart.y, selectionStart.currentY || selectionStart.y),
                  width: Math.abs((selectionStart.currentX || selectionStart.x) - selectionStart.x),
                  height: Math.abs((selectionStart.currentY || selectionStart.y) - selectionStart.y),
                  backgroundColor: themeValue('rgba(59, 130, 246, 0.2)'),
                  border: themeValue('2px solid #3b82f6'),
                  pointerEvents: 'none',
                  zIndex: 1000
                }}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div style={{
          ...styles.propertiesPanel,
          ...(isMobile ? styles.propertiesPanelMobile : {}),
          ...(isMobile && showPropertiesSidebar ? styles.propertiesPanelMobileOpen : {}),
          ...(isMobile && !showPropertiesSidebar ? styles.propertiesPanelMobileHidden : {})
        }}>
          <div style={styles.propertiesPanelHeader}>
            <Settings size={18} />
            <h3 style={styles.propertiesPanelTitle}>Свойства</h3>
            {isMobile && (
              <button
                onClick={() => setShowPropertiesSidebar(false)}
                style={styles.closeSidebarButton}
              >
                <X size={20} />
              </button>
            )}
          </div>
          
          {selectedFields.size > 0 ? (
            <div style={styles.propertiesContent}>
              <div style={styles.bulkSelectionInfo}>
                <p style={styles.bulkSelectionText}>
                  Выбрано полей: {selectedFields.size}
                </p>
              </div>
              <div style={styles.propertyActions}>
                <button
                  type="button"
                  onClick={() => {
                    const newFields = fields.filter((_, index) => !selectedFields.has(index));
                    setFields(newFields);
                    setSelectedFields(new Set());
                    setSelectedFieldIndex(null);
                  }}
                  style={styles.deleteFieldButton}
                  data-hover="red"
                >
                  <Trash2 size={16} />
                  <span>Удалить выбранные ({selectedFields.size})</span>
                </button>
              </div>
            </div>
          ) : selectedFieldIndex !== null && fields[selectedFieldIndex] ? (
            <FieldProperties
              field={fields[selectedFieldIndex]}
              index={selectedFieldIndex}
              fields={fields}
              updateField={updateField}
              removeField={removeField}
              addOption={addOption}
              updateOption={updateOption}
              removeOption={removeOption}
              onClose={() => setSelectedFieldIndex(null)}
            />
          ) : (
            <div style={styles.noSelection}>
              <p style={styles.noSelectionText}>
                Выберите поле для редактирования его свойств
              </p>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

function FormFieldCard({ field, index, isSelected, onClick, onDragStart, onDragEnd, isDragging, isMobile, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  const getFieldIcon = (type) => {
    switch (type) {
      case 'text': return Type;
      case 'number': return Hash;
      case 'select': return ChevronDown;
      case 'checkbox': return CheckSquare;
      case 'textarea': return AlignLeft;
      default: return Type;
    }
  };

  const Icon = getFieldIcon(field.type);

  return (
    <div
      draggable={!isMobile}
      onDragStart={(e) => !isMobile && onDragStart(e, index)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      tabIndex={-1}
      className={`field-card-draggable ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        ...styles.fieldCard,
        ...(isSelected ? styles.fieldCardSelected : {}),
        ...(isDragging ? styles.fieldCardDragging : {})
      }}
    >
      {!isMobile && (
        <div style={styles.fieldCardDragHandle}>
          <GripVertical size={16} color="var(--color-text-dim)" />
        </div>
      )}
      <div style={styles.fieldCardContent}>
        <div style={styles.fieldCardHeader}>
          <div style={styles.fieldCardIcon}>
            <Icon size={16} />
          </div>
          <div style={styles.fieldCardTitle}>
            {field.label || 'Без названия'}
          </div>
          {field.required && (
            <span style={styles.requiredBadge}>Обязательно</span>
          )}
        </div>
        {field.description && (
          <div style={styles.fieldCardDescription}>{field.description}</div>
        )}
      </div>
      {isMobile && (
        <div style={styles.mobileReorderButtons}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={!canMoveUp}
            className="mobile-reorder-btn"
            style={{
              ...styles.mobileReorderButton,
              ...(canMoveUp ? {} : styles.mobileReorderButtonDisabled)
            }}
          >
            <ChevronUp size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
            className="mobile-reorder-btn"
            style={{
              ...styles.mobileReorderButton,
              ...(canMoveDown ? {} : styles.mobileReorderButtonDisabled)
            }}
          >
            <ChevronDownIcon size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

function FieldProperties({ field, index, fields, updateField, removeField, addOption, updateOption, removeOption, onClose }) {
  return (
    <div style={styles.propertiesContent}>
      <div style={styles.propertyGroup}>
        <label style={styles.propertyLabel}>Название поля</label>
        <input
          type="text"
          placeholder="Введите название"
          value={field.label}
          onChange={(e) => updateField(index, { label: e.target.value })}
          style={styles.propertyInput}
        />
      </div>

      <div style={styles.propertyGroup}>
        <label style={styles.propertyLabel}>Описание</label>
        <textarea
          placeholder="Добавьте описание"
          value={field.description || ''}
          onChange={(e) => updateField(index, { description: e.target.value })}
          style={styles.propertyTextarea}
          rows={3}
        />
      </div>

      <div style={styles.propertyGroup}>
        <label style={styles.propertyLabel}>Тип поля</label>
        <select
          value={field.type}
          onChange={(e) => updateField(index, { type: e.target.value })}
          style={styles.propertySelect}
        >
          <option value="text">Текст</option>
          <option value="number">Число</option>
          <option value="select">Выбор</option>
          <option value="checkbox">Чекбокс</option>
          <option value="textarea">Текстовая область</option>
        </select>
      </div>

      {field.type === 'select' && (
        <div style={styles.propertyGroup}>
          <label style={styles.propertyLabel}>Варианты выбора</label>
          <div style={styles.optionsList}>
            {field.options?.map((option, optionIndex) => (
              <div key={optionIndex} style={styles.optionItem}>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                  style={styles.optionInput}
                  placeholder={`Вариант ${optionIndex + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(index, optionIndex)}
                  style={styles.optionRemoveButton}
                  data-hover="red"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addOption(index)}
              style={styles.addOptionButtonSmall}
              data-hover="light-gray"
            >
              <Plus size={14} />
              <span>Добавить вариант</span>
            </button>
          </div>
        </div>
      )}

      <div style={styles.propertyGroup}>
        <label style={styles.checkboxPropertyLabel}>
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => updateField(index, { required: e.target.checked })}
            style={styles.propertyCheckboxInput}
            className="custom-checkbox-input-builder"
          />
          <span className="custom-checkbox-builder"></span>
          <span>Обязательное поле</span>
        </label>
      </div>

      <div style={styles.propertyGroup}>
        <label style={styles.propertyLabel}>Условие обязательности</label>
        <select
          value={field.requirementCondition?.dependsOn || ''}
          onChange={(e) => {
            if (e.target.value === '') {
              const { requirementCondition, ...rest } = field;
              updateField(index, rest);
            } else {
              updateField(index, {
                requirementCondition: {
                  dependsOn: e.target.value,
                  value: field.requirementCondition?.value || ''
                }
              });
            }
          }}
          style={styles.propertySelect}
        >
          <option value="">Нет условия</option>
          {fields.slice(0, index).map(f => (
            <option key={f.id} value={f.id}>
              Если {f.label || 'поле'} равно:
            </option>
          ))}
        </select>

        {field.requirementCondition && (
          <input
            type="text"
            placeholder="Значение"
            value={field.requirementCondition.value}
            onChange={(e) => updateField(index, {
              requirementCondition: {
                dependsOn: field.requirementCondition?.dependsOn || '',
                value: e.target.value
              }
            })}
            style={{...styles.propertyInput, marginTop: '8px'}}
          />
        )}
      </div>

      <div style={styles.propertyActions}>
        <button
          type="button"
          onClick={() => {
            removeField(index);
            onClose();
          }}
          style={styles.deleteFieldButton}
          data-hover="red"
        >
          <Trash2 size={16} />
          <span>Удалить поле</span>
        </button>
      </div>
    </div>
  );
}

const styles = themeStyles({
  container: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column'
  },
  builderLayout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    height: 'calc(100vh - 64px)'
  },
  builderLayoutMobile: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    height: 'calc(100vh - 64px)',
    position: 'relative'
  },
  
  // Left Sidebar - Components
  sidebar: {
    width: '280px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  sidebarMobile: {
    position: 'fixed',
    top: '64px',
    left: 0,
    bottom: 0,
    width: '100%',
    zIndex: 200,
    transition: 'transform 0.3s ease-out',
    borderRight: 'none'
  },
  sidebarMobileOpen: {
    transform: 'translateX(0)'
  },
  sidebarMobileHidden: {
    transform: 'translateX(-100%)'
  },
  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sidebarTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: 0
  },
  componentsSection: {
    padding: '16px',
    overflowY: 'auto'
  },
  componentsSectionTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '12px'
  },
  componentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  componentButton: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'grab',
    transition: 'all 0.2s',
    textAlign: 'left',
    userSelect: 'none'
  },
  componentIcon: {
    width: '36px',
    height: '36px',
    backgroundColor: '#eff6ff',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#3b82f6',
    flexShrink: 0
  },
  componentInfo: {
    flex: 1,
    minWidth: 0
  },
  componentLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827',
    marginBottom: '2px'
  },
  componentDescription: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: '1.4'
  },

  // Center Canvas
  canvas: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#f9fafb'
  },
  canvasHeader: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px'
  },
  canvasHeaderMobile: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  mobileHeaderButtons: {
    display: 'flex',
    gap: '8px'
  },
  mobileHeaderButton: {
    padding: '8px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s'
  },
  formTitleInput: {
    flex: 1,
    fontSize: '18px',
    fontWeight: '600',
    border: 'none',
    outline: 'none',
    color: '#111827',
    backgroundColor: 'transparent',
    padding: '8px 0'
  },
  formTitleInputMobile: {
    flex: 1,
    minWidth: '120px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    outline: 'none',
    color: '#111827',
    backgroundColor: 'transparent',
    padding: '8px 0'
  },
  editModeBadge: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#1e40af',
    backgroundColor: '#dbeafe',
    borderRadius: '999px',
    padding: '6px 10px',
    whiteSpace: 'nowrap'
  },
  canvasActions: {
    display: 'flex',
    gap: '12px'
  },
  publishButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    backgroundColor: 'var(--color-primary)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--color-on-primary)',
    transition: 'all 0.2s'
  },
  publishButtonMobile: {
    padding: '10px 16px',
    minWidth: '48px'
  },
  publishButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  },
  canvasContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    paddingBottom: '24px',
    transition: 'background-color 0.2s',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none'
  },
  canvasContentDragOver: {
    backgroundColor: '#eff6ff'
  },
  emptyCanvas: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '2px dashed #d1d5db',
    padding: '40px'
  },
  emptyCanvasIcon: {
    width: '80px',
    height: '80px',
    backgroundColor: '#f3f4f6',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    marginBottom: '16px'
  },
  emptyCanvasTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px'
  },
  emptyCanvasText: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: '400px'
  },
  formFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '700px',
    margin: '0 auto'
  },
  fieldCard: {
    display: 'flex',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  },
  fieldCardSelected: {
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)'
  },
  fieldCardDragging: {
    opacity: 0.4,
    cursor: 'grabbing'
  },
  fieldCardDragOver: {
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
  },
  dropIndicator: {
    height: '4px',
    backgroundColor: '#3b82f6',
    borderRadius: '2px',
    margin: '12px 0',
    boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
  },
  placeholderCard: {
    display: 'flex',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    border: '2px dashed #3b82f6',
    padding: '16px',
    marginBottom: '12px',
    minHeight: '60px',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  placeholderContent: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#3b82f6'
  },
  dropZone: {
    minHeight: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fieldCardDragHandle: {
    width: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    cursor: 'grab',
    borderRight: '1px solid #e5e7eb'
  },
  fieldCardContent: {
    flex: 1,
    padding: '16px'
  },
  fieldCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  fieldCardIcon: {
    width: '24px',
    height: '24px',
    backgroundColor: '#eff6ff',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#3b82f6'
  },
  fieldCardTitle: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827'
  },
  requiredBadge: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  fieldCardDescription: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '8px',
    lineHeight: '1.5'
  },

  // Right Properties Panel
  propertiesPanel: {
    width: '320px',
    backgroundColor: '#ffffff',
    borderLeft: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  propertiesPanelMobile: {
    position: 'fixed',
    top: '64px',
    right: 0,
    bottom: 0,
    width: '100%',
    zIndex: 200,
    transition: 'transform 0.3s ease-out',
    borderLeft: 'none'
  },
  propertiesPanelMobileOpen: {
    transform: 'translateX(0)'
  },
  propertiesPanelMobileHidden: {
    transform: 'translateX(100%)'
  },
  propertiesPanelHeader: {
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  propertiesPanelTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: 0
  },
  propertiesContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px'
  },
  noSelection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px'
  },
  noSelectionText: {
    fontSize: '14px',
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: '1.6'
  },
  bulkSelectionInfo: {
    padding: '16px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #3b82f6'
  },
  bulkSelectionText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#3b82f6',
    margin: 0
  },
  propertyGroup: {
    marginBottom: '20px'
  },
  propertyLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  },
  propertyInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff'
  },
  propertyTextarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  propertySelect: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  },
  checkboxPropertyLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    position: 'relative',
    userSelect: 'none'
  },
  propertyCheckboxInput: {
    position: 'absolute',
    opacity: 0,
    cursor: 'pointer'
  },
  propertyCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  optionItem: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  optionInput: {
    flex: 1,
    padding: '8px 10px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: '#ffffff'
  },
  optionRemoveButton: {
    padding: '8px',
    backgroundColor: '#fee2e2',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s'
  },
  addOptionButtonSmall: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#374151',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  propertyActions: {
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb'
  },
  deleteFieldButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#fee2e2',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#dc2626',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid var(--color-on-primary)',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite'
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
  pageTransition: {
    transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    minHeight: '100vh'
  },
  
  closeSidebarButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
    marginLeft: 'auto'
  },
  mobileReorderButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px',
    borderLeft: '1px solid #e5e7eb'
  },
  mobileReorderButton: {
    padding: '6px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s'
  },
  mobileReorderButtonDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed'
  }
});

export default FormBuilderPage;
