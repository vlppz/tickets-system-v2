import React, { useState } from 'react';
import { GripVertical, X, Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

function FormBuilder({ onClose, onSave }) {
  const [formName, setFormName] = useState('');
  const [fields, setFields] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const addField = () => {
    const newField = {
      id: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      description: '',
      options: []
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

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newFields = [...fields];
    const draggedField = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedField);
    setFields(newFields);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/forms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: formName, 
          content: JSON.stringify(fields)
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
          onSave(data);
        } else {
          toast.error('Ошибка при сохранении формы: ' + (data.detail || 'Неизвестная ошибка'));
        }
      } else {
        toast.error('Ошибка при сохранении формы');
      }
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error('Ошибка сети');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Создать форму</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formNameSection}>
            <input
              type="text"
              placeholder="Название формы"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              style={styles.formNameInput}
              required
            />
          </div>

          <div style={styles.fieldsContainer}>
            {fields.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>Нет полей. Добавьте первое поле.</p>
              </div>
            ) : (
              fields.map((field, index) => (
                <FormField
                  key={field.id}
                  field={field}
                  index={index}
                  updateField={updateField}
                  removeField={removeField}
                  addOption={addOption}
                  updateOption={updateOption}
                  removeOption={removeOption}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedIndex === index}
                />
              ))
            )}
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={addField}
              style={styles.addButton}
            >
              <Plus size={18} />
              <span>Добавить поле</span>
            </button>
            
            <button
              type="submit"
              disabled={submitting || fields.length === 0}
              style={{
                ...styles.saveButton,
                ...(submitting || fields.length === 0 ? styles.saveButtonDisabled : {})
              }}
            >
              {submitting ? (
                <>
                  <div style={styles.spinner}></div>
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Сохранить форму</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ 
  field, 
  index, 
  updateField, 
  removeField, 
  addOption, 
  updateOption, 
  removeOption,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      style={{
        ...styles.fieldCard,
        ...(isDragging ? styles.fieldCardDragging : {})
      }}
    >
      <div style={styles.dragHandle}>
        <GripVertical size={20} color="#9ca3af" />
      </div>

      <div style={styles.fieldContent}>
        <div style={styles.fieldRow}>
          <input
            type="text"
            placeholder="Название поля"
            value={field.label}
            onChange={(e) => updateField(index, { label: e.target.value })}
            style={styles.input}
            required
          />
          
          <select
            value={field.type}
            onChange={(e) => updateField(index, { type: e.target.value })}
            style={styles.select}
          >
            <option value="text">Текст</option>
            <option value="number">Число</option>
            <option value="select">Выбор</option>
            <option value="checkbox">Чекбокс</option>
            <option value="textarea">Текстовая область</option>
          </select>
        </div>

        <input
          type="text"
          placeholder="Описание (необязательно)"
          value={field.description || ''}
          onChange={(e) => updateField(index, { description: e.target.value })}
          style={styles.input}
        />

        {field.type === 'select' && (
          <div style={styles.optionsSection}>
            <p style={styles.optionsLabel}>Варианты выбора:</p>
            {field.options?.map((option, optionIndex) => (
              <div key={optionIndex} style={styles.optionRow}>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                  style={styles.input}
                  placeholder={`Вариант ${optionIndex + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(index, optionIndex)}
                  style={styles.removeOptionButton}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addOption(index)}
              style={styles.addOptionButton}
            >
              <Plus size={16} />
              <span>Добавить вариант</span>
            </button>
          </div>
        )}

        <div style={styles.fieldFooter}>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => updateField(index, { required: e.target.checked })}
            />
            <span style={styles.checkboxLabel}>Обязательное поле</span>
          </label>

          <button
            type="button"
            onClick={() => removeField(index)}
            style={styles.removeButton}
          >
            <Trash2 size={16} />
            <span>Удалить</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'background-color 0.2s'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden'
  },
  formNameSection: {
    padding: '24px',
    borderBottom: '1px solid #e5e7eb'
  },
  formNameInput: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  },
  fieldsContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    gap: '16px',
    display: 'flex',
    flexDirection: 'column'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#9ca3af'
  },
  emptyText: {
    fontSize: '16px',
    margin: 0
  },
  fieldCard: {
    display: 'flex',
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'all 0.2s'
  },
  fieldCardDragging: {
    opacity: 0.5,
    transform: 'scale(0.98)'
  },
  dragHandle: {
    width: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
    cursor: 'grab',
    flexShrink: 0
  },
  fieldContent: {
    flex: 1,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  fieldRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
    boxSizing: 'border-box'
  },
  select: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'border-color 0.2s'
  },
  optionsSection: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  optionsLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '8px'
  },
  optionRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px'
  },
  removeOptionButton: {
    padding: '8px',
    backgroundColor: '#fee2e2',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  addOptionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#4b5563',
    fontWeight: '500'
  },
  fieldFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px'
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#4b5563'
  },
  removeButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#fee2e2',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#dc2626',
    fontWeight: '500'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    padding: '24px',
    borderTop: '1px solid #e5e7eb',
    justifyContent: 'flex-end'
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    transition: 'background-color 0.2s'
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    transition: 'background-color 0.2s'
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #ffffff',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite'
  }
};

export default FormBuilder;
