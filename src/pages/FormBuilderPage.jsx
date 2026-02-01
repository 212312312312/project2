import React, { useState, useEffect } from 'react';
import { formService } from '../services/formService';
import '../assets/Form.css';

const FormBuilderPage = () => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const formKey = 'add_car'; 

  useEffect(() => {
    loadForm();
  }, []);

  const loadForm = async () => {
    try {
      const data = await formService.getFormSchema(formKey);
      setFields(data);
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      alert("Ошибка загрузки формы. Проверьте консоль.");
    } finally {
      setLoading(false);
    }
  };

  const addField = () => {
    setFields([
      ...fields,
      { type: 'text', name: `field_${Date.now()}`, label: 'Новое поле', required: false, options: [] }
    ]);
  };

  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  // --- ИСПРАВЛЕНИЕ: Правильное обновление состояния React ---
  const updateField = (index, key, value) => {
    setFields(prevFields => 
      prevFields.map((field, i) => {
        if (i === index) {
          return { ...field, [key]: value }; // Создаем копию объекта с новым значением
        }
        return field;
      })
    );
  };
  // -----------------------------------------------------------

  const saveForm = async () => {
    console.log("Попытка сохранения...", fields); // Смотри в F12 Console
    try {
      await formService.saveFormSchema(formKey, fields);
      alert('✅ Успешно сохранено! Перезагрузите приложение водителя.');
    } catch (error) {
      console.error("Ошибка сохранения:", error);
      alert(`❌ Ошибка сохранения: ${error.message || 'Неизвестная ошибка'}`);
    }
  };

  const renderFieldEditor = (field, index) => (
    <div key={index} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '8px', background: 'white' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '12px', color: '#666' }}>Тип поля</label>
          <select 
            className="form-input"
            value={field.type} 
            onChange={(e) => updateField(index, 'type', e.target.value)}
          >
            <option value="text">Текст</option>
            <option value="photo">Фотография</option>
            <option value="select">Выпадающий список</option>
          </select>
        </div>
        <div style={{ flex: 2 }}>
           <label style={{ fontSize: '12px', color: '#666' }}>Название (Label)</label>
           <input 
             className="form-input"
             type="text" 
             value={field.label} 
             onChange={(e) => updateField(index, 'label', e.target.value)}
           />
        </div>
        <div style={{ flex: 2 }}>
           <label style={{ fontSize: '12px', color: '#666' }}>Техническое имя (name, en)</label>
           <input 
             className="form-input"
             type="text" 
             value={field.name} 
             onChange={(e) => updateField(index, 'name', e.target.value)}
             placeholder="brand, vin..."
           />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={field.required} 
            onChange={(e) => updateField(index, 'required', e.target.checked)}
          />
          <span style={{ marginLeft: '8px' }}>Обязательное поле</span>
        </label>

        <button 
          onClick={() => removeField(index)}
          style={{ marginLeft: 'auto', background: '#ffebee', color: '#d32f2f', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
        >
          Удалить поле
        </button>
      </div>

      {field.type === 'select' && (
        <div style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '12px', color: '#666' }}>Опции (через запятую)</label>
            <input 
                className="form-input"
                type="text" 
                placeholder="Красный, Синий, Белый"
                value={field.options ? field.options.join(', ') : ''}
                onChange={(e) => updateField(index, 'options', e.target.value.split(',').map(s => s.trim()))}
            />
        </div>
      )}
    </div>
  );

  if (loading) return <div>Загрузка конструктора...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Конструктор Формы Регистрации Авто</h1>
        <button 
            className="primary-button" 
            onClick={saveForm}
            style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '10px 20px', fontSize: '16px', borderRadius: '5px', cursor: 'pointer' }}
        >
            💾 Сохранить изменения
        </button>
      </div>

      <div style={{ maxWidth: '800px', marginTop: '20px' }}>
        {fields.map((field, index) => renderFieldEditor(field, index))}
        
        <button 
            onClick={addField}
            style={{ width: '100%', padding: '15px', border: '2px dashed #aaa', background: 'transparent', color: '#555', borderRadius: '8px', cursor: 'pointer', marginTop: '10px' }}
        >
            + Добавить поле
        </button>
      </div>
      
      <div style={{ marginTop: '40px', padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>Предпросмотр (для разработчика):</h3>
        <pre style={{ fontSize: '12px' }}>{JSON.stringify(fields, null, 2)}</pre>
      </div>
    </div>
  );
};

export default FormBuilderPage;