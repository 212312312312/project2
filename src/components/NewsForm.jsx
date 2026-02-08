import React, { useState, useEffect } from 'react';
import '../assets/Form.css'; 

const NewsForm = ({ onSubmit, onCancel, isLoading }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [target, setTarget] = useState(''); 
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!target) {
      alert('⚠️ Пожалуйста, выберите получателя (Водители, Клиенты или Все)!');
      return;
    }

    onSubmit({ title, content, target, image });
    
    // Очищення форми
    setTitle('');
    setContent('');
    setTarget('');
    setImage(null);
    setPreviewUrl(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-container" style={{ width: '100%', maxWidth: '600px' }}>
      <h3>Создать новость</h3>
      
      <div className="form-group" style={{ width: '100%' }}>
        <label>Заголовок</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Важное сообщение..."
          disabled={isLoading}
          style={{ width: '100%', boxSizing: 'border-box' }} // На всю ширину
        />
      </div>

      <div className="form-group" style={{ width: '100%' }}>
        <label>Текст новости</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          placeholder="Текст уведомления"
          rows="6" // Збільшили висоту для зручності
          disabled={isLoading}
          style={{ 
            width: '100%', 
            boxSizing: 'border-box', 
            resize: 'vertical', // Дозволяє розтягувати вниз
            minHeight: '100px'
          }} 
        />
      </div>

      <div className="form-group" style={{ width: '100%' }}>
        <label style={{ color: target ? 'inherit' : 'red', fontWeight: 'bold' }}>
          Получатель {target ? '✅' : '❗'}
        </label>
        <select 
          value={target} 
          onChange={(e) => setTarget(e.target.value)}
          className="form-select"
          required
          disabled={isLoading}
          style={{ 
            width: '100%', 
            boxSizing: 'border-box',
            border: target ? '1px solid #ddd' : '2px solid #ffeba7' 
          }}
        >
          <option value="" disabled>-- Выберите получателя --</option>
          <option value="ALL">📢 Все пользователи</option>
          <option value="DRIVER">🚕 Только водители</option>
          <option value="CLIENT">👤 Только клиенты</option>
        </select>
      </div>

      <div className="form-group" style={{ width: '100%' }}>
        <label>Изображение (для интерактива)</label>
        <input 
          type="file" 
          accept="image/*"
          onChange={handleFileChange}
          className="file-input"
          disabled={isLoading}
          style={{ width: '100%' }}
        />
        
        {previewUrl && (
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <p style={{ marginBottom: '5px', fontSize: '0.9em', color: '#666' }}>Попередній перегляд:</p>
            <img 
              src={previewUrl} 
              alt="Preview" 
              style={{ 
                width: '100%', 
                maxWidth: '100%', // Адаптивно на всю ширину
                maxHeight: '200px', // Обмеження висоти
                objectFit: 'contain', 
                borderRadius: '8px',
                border: '1px solid #eee'
              }}
            />
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: '100%' }}>
          {isLoading ? 'Отправка...' : 'Отправить'}
        </button>
      </div>
      
      {onCancel && (
        <button 
            type="button" 
            onClick={onCancel} 
            className="btn-secondary" 
            disabled={isLoading}
            style={{ width: '100%', marginTop: '10px' }}
        >
            Отмена
        </button>
      )}
    </form>
  );
};

export default NewsForm;