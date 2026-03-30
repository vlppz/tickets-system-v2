import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from './ThemeToggle';
import { themeStyles, themeValue } from '../lib/theme';

const STATUS_CONFIG = {
  approved: { label: 'Подтверждено', color: '#065f46', bg: '#d1fae5' },
  edits_required: { label: 'Нужны правки', color: '#991b1b', bg: '#fee2e2' },
  waiting: { label: 'Ожидает проверки', color: '#374151', bg: '#f3f4f6' }
};

function FormRenderer({ formId, onBack, onReady, isTransitioning, isReversing }) {
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [existingAnswer, setExistingAnswer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startAnimation, setStartAnimation] = useState(false);

  useEffect(() => {
    // Add keyframes for animations
    const styleSheet = document.createElement('style');
    styleSheet.textContent = themeValue(`
      @keyframes shrinkFromFullscreen {
        0% {
          transform: scale(2);
          opacity: 1;
          box-shadow: none;
        }
        50% {
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        100% {
          transform: scale(1);
          opacity: 1;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
        }
      }
      @keyframes expandToFullscreen {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(2);
          opacity: 0;
        }
      }
      @keyframes bgZoomOut {
        0% {
          transform: scale(1.3);
          filter: blur(20px);
          opacity: 0;
        }
        100% {
          transform: scale(1);
          filter: blur(0);
          opacity: 1;
        }
      }
      @keyframes bgZoomIn {
        0% {
          transform: scale(1);
          filter: blur(0);
          opacity: 1;
        }
        100% {
          transform: scale(1.3);
          filter: blur(20px);
          opacity: 0;
        }
      }
      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes fadeOut {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      /* Custom Checkbox Styles */
      .custom-checkbox-input {
        position: absolute;
        opacity: 0;
        cursor: pointer;
      }
      .custom-checkbox {
        position: relative;
        display: inline-block;
        width: 20px;
        height: 20px;
        background-color: var(--color-surface-muted);
        border: 2px solid var(--color-border-strong);
        border-radius: 4px;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      .custom-checkbox-input:checked + .custom-checkbox {
        background-color: var(--color-primary);
        border-color: var(--color-primary);
      }
      .custom-checkbox-input:checked + .custom-checkbox::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -60%) rotate(45deg);
        width: 4px;
        height: 8px;
        border: solid var(--color-on-primary);
        border-width: 0 2px 2px 0;
      }
      .custom-checkbox-input:focus + .custom-checkbox {
        box-shadow: 0 0 0 3px var(--color-brand-ring);
      }
      .custom-checkbox-input:hover + .custom-checkbox {
        border-color: var(--color-text-dim);
      }
    `);
    document.head.appendChild(styleSheet);
    
    fetchForm();
    
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, [formId]);

  const fetchForm = async () => {
    try {
      const [formResponse, myAnswerResponse] = await Promise.all([
        fetch(`/api/forms/one?id=${formId}`, { credentials: 'include' }),
        fetch(`/api/forms/answers/my?form_id=${formId}`, { credentials: 'include' })
      ]);

      if (formResponse.ok) {
        const data = await formResponse.json();
        if (data.status === 'ok') {
          setForm(data.form);
          const parsedFields = JSON.parse(data.form.content);
          setFields(parsedFields);

          const initialData = {};
          parsedFields.forEach(field => {
            initialData[field.id] = field.type === 'checkbox' ? false : '';
          });

          if (myAnswerResponse.ok) {
            const myAnswerData = await myAnswerResponse.json();
            if (myAnswerData.id && myAnswerData.answer) {
              setExistingAnswer(myAnswerData);
              const existingData = { ...initialData };
              Object.entries(myAnswerData.answer || {}).forEach(([key, val]) => {
                if (key in existingData) existingData[key] = val;
              });
              setFormData(existingData);
            } else {
              setFormData(initialData);
            }
          } else {
            setFormData(initialData);
          }

          setTimeout(() => {
            setStartAnimation(true);
            if (onReady) onReady();
          }, 10);
        }
      }
    } catch (error) {
      console.error('Failed to fetch form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const isFieldRequired = (field) => {
    // Check if field has basic required flag
    if (field.required) return true;
    
    // Check conditional requirement
    if (field.requirementCondition) {
      const dependsOnField = fields.find(f => f.id === field.requirementCondition.dependsOn);
      if (dependsOnField) {
        const dependsOnValue = formData[dependsOnField.id];
        return dependsOnValue === field.requirementCondition.value;
      }
    }
    
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/forms/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          form_id: formId,
          answer: formData
        })
      });
      
      const data = await response.json();
      
      if (response.ok && (data.status === 'ok' || data.status === 'ok updated')) {
        if (data.status === 'ok updated') {
          setExistingAnswer(prev => ({ ...prev, answer: formData }));
          toast.success('Заявка успешно обновлена!');
        } else {
          toast.success('Заявка успешно отправлена!');
        }
        if (onBack) onBack();
      } else {
        toast.error(data.detail || 'Ошибка при отправке заявки');
        setSubmitting(false);
      }
    } catch (error) {
      console.error('Failed to submit form:', error);
      toast.error('Ошибка при отправке заявки');
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const isRequired = isFieldRequired(field);
    
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={isRequired}
            style={styles.input}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            onKeyPress={(e) => {
              // Only allow digits
              if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
              }
            }}
            required={isRequired}
            style={styles.input}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={isRequired}
            style={styles.textarea}
            rows={4}
          />
        );
      
      case 'select':
        return (
          <select
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={isRequired}
            style={styles.select}
          >
            <option value="">Выберите вариант</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData[field.id] || false}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              required={isRequired}
              style={styles.checkboxInput}
              className="custom-checkbox-input"
            />
            <span className="custom-checkbox"></span>
            <span style={styles.checkboxText}>{field.description || 'Да'}</span>
          </label>
        );
      
      default:
        return null;
    }
  };

  const contentVisibility = isReversing ? 0 : (startAnimation ? 1 : 0);
  const contentTransition = isReversing ? 'opacity 0.3s ease-out' : 'none';
  const themeToggleStyle = {
    ...styles.themeToggleWrap,
    opacity: isReversing ? 0 : 0,
    pointerEvents: contentVisibility === 0 ? 'none' : 'auto',
    transition: contentTransition,
    ...(startAnimation && !isReversing ? { animation: 'fadeInDown 0.4s ease-out 0.7s both' } : {})
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.rightPanelStatic}></div>
        <div style={styles.paperContainer}>
          <div style={styles.paperStatic}>
            <div style={themeToggleStyle}>
              <ThemeToggle compact />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div style={styles.container}>
        <div style={isReversing ? styles.rightPanelReversing : (startAnimation ? styles.rightPanel : styles.rightPanelStatic)}></div>
        <div style={styles.paperContainer}>
          <div style={isReversing ? styles.paperReversing : (startAnimation ? styles.paper : styles.paperStatic)}>
            <div style={themeToggleStyle}>
              <ThemeToggle compact />
            </div>
            <div 
              style={{
                ...styles.errorText,
                ...(startAnimation ? { animation: 'fadeInUp 0.4s ease-out 0.8s both' } : {})
              }}
            >
              Форма не найдена
            </div>
            {onBack && (
              <button 
                onClick={onBack} 
                style={{
                  ...styles.backButton,
                  ...(startAnimation ? { animation: 'fadeInUp 0.4s ease-out 0.9s both' } : {})
                }}
                data-hover="neutral"
              >
                <ArrowLeft size={18} />
                <span>Назад</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={isReversing ? styles.rightPanelReversing : (startAnimation ? styles.rightPanel : styles.rightPanelStatic)}></div>
      
      <div style={styles.paperContainer}>
        <div 
          style={isReversing ? styles.paperReversing : (startAnimation ? styles.paper : styles.paperStatic)}
        >
          <div style={themeToggleStyle}>
            <ThemeToggle compact />
          </div>
          <div
            style={{
              ...styles.formContent,
              opacity: contentVisibility,
              transition: contentTransition
            }}
          >
            {onBack && (
              <button onClick={onBack} style={styles.backButtonTop} data-hover="neutral">
                <ArrowLeft size={18} />
                <span>Назад</span>
              </button>
            )}
            
            <h1 style={{...styles.formTitle, ...(startAnimation ? {} : { opacity: 0 })}}>{form.name}</h1>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              {fields.map((field, index) => (
                <div 
                  key={field.id} 
                  style={{
                    ...styles.fieldGroup,
                    ...(startAnimation ? { animationDelay: `${0.7 + index * 0.04}s` } : { opacity: 0 })
                  }}
                >
                  <label style={styles.label}>
                    {field.label}
                    {isFieldRequired(field) && <span style={styles.required}>*</span>}
                  </label>
                  {field.description && field.type !== 'checkbox' && (
                    <p style={styles.fieldDescription}>{field.description}</p>
                  )}
                  {renderField(field)}
                </div>
              ))}
              
              <button
                type="submit"
                disabled={submitting}
                data-hover="blue"
                style={{
                  ...styles.submitButton,
                  ...(submitting ? styles.submitButtonDisabled : {}),
                  ...(startAnimation ? { animationDelay: `${0.7 + fields.length * 0.04}s` } : { opacity: 0 })
                }}
              >
                {submitting ? (
                  <>
                    <div style={styles.spinner}></div>
                    <span>Отправка...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>{existingAnswer ? 'Обновить заявку' : 'Отправить заявку'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = themeStyles({
  container: {
    position: 'relative',
    display: 'flex',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
    backgroundColor: 'var(--color-page-bg)'
  },
  rightPanel: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'var(--backdrop-tint), url(/bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: 0,
    animation: 'bgZoomOut 1s cubic-bezier(0.4, 0, 0.2, 1) both'
  },
  rightPanelStatic: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'var(--backdrop-tint), url(/bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: 0,
    transform: 'scale(1.3)',
    filter: 'blur(20px)',
    opacity: 0
  },
  rightPanelReversing: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'var(--backdrop-tint), url(/bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: 0,
    animation: 'bgZoomIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards'
  },
  paperContainer: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '40px 20px',
    minHeight: '100vh'
  },
  paperContainerExpanding: {
    // Not used
  },
  paperContainerReversing: {
    // Not used
  },
  paper: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    padding: '48px',
    maxWidth: '700px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    position: 'relative',
    animation: 'shrinkFromFullscreen 0.8s cubic-bezier(0.4, 0, 0.2, 1) both'
  },
  paperStatic: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    padding: '48px',
    maxWidth: '700px',
    width: '100%',
    boxShadow: 'none',
    position: 'relative',
    transform: 'scale(2)',
    opacity: 0,
    border: 'none'
  },
  paperReversing: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    padding: '48px',
    maxWidth: '700px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    position: 'relative',
    animation: 'expandToFullscreen 0.5s cubic-bezier(0.4, 0, 1, 1) forwards'
  },
  themeToggleWrap: {
    position: 'absolute',
    top: '24px',
    right: '24px',
    zIndex: 2
  },
  formContent: {
    minHeight: '100%'
  },
  backButtonTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: '24px',
    transition: 'all 0.2s'
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginTop: '20px',
    transition: 'all 0.2s',
    opacity: 0
  },
  formTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '32px',
    textAlign: 'left',
    animation: 'fadeInDown 0.5s ease-out 0.7s both'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    animation: 'fadeInUp 0.4s ease-out both'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  required: {
    color: '#dc2626',
    marginLeft: '4px'
  },
  fieldDescription: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
    marginTop: '-4px'
  },
  input: {
    padding: '11px 16px',
    fontSize: '15px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    backgroundColor: '#f9fafb',
    color: '#1f2937'
  },
  textarea: {
    padding: '11px 16px',
    fontSize: '15px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    backgroundColor: '#f9fafb',
    color: '#1f2937',
    resize: 'vertical'
  },
  select: {
    padding: '11px 16px',
    fontSize: '15px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    backgroundColor: '#f9fafb',
    color: '#1f2937',
    cursor: 'pointer'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    position: 'relative'
  },
  checkboxInput: {
    position: 'absolute',
    opacity: 0,
    cursor: 'pointer'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  checkboxText: {
    fontSize: '15px',
    color: '#374151',
    userSelect: 'none'
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '13px',
    backgroundColor: 'var(--color-primary)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--color-on-primary)',
    marginTop: '8px',
    transition: 'all 0.3s ease',
    animation: 'fadeInUp 0.4s ease-out 0.2s both',
    textTransform: 'uppercase'
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid var(--color-on-primary)',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite'
  },
  loadingText: {
    textAlign: 'center',
    fontSize: '16px',
    color: '#6b7280',
    padding: '40px',
    opacity: 0
  },
  loadingTextStatic: {
    textAlign: 'center',
    fontSize: '16px',
    color: '#6b7280',
    padding: '40px',
    opacity: 1
  },
  errorText: {
    textAlign: 'center',
    fontSize: '16px',
    color: '#dc2626',
    padding: '20px',
    opacity: 0
  }
});

export default FormRenderer;
