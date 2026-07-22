import React, { useState, useEffect } from 'react';

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
      alert('Будь ласка, виберіть отримувача (Водії, Клієнти або Усі)!');
      return;
    }

    onSubmit({ title, content, target, image });
    
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
    <form onSubmit={handleSubmit} className="news-form-container">
      <div className="input-group-field">
        <label className="field-label">Заголовок</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Заголовок сповіщення..."
          disabled={isLoading}
          className="input-field"
        />
      </div>

      <div className="input-group-field">
        <label className="field-label">Текст новини</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          placeholder="Введіть текст повідомлення для користувачів..."
          rows="4"
          disabled={isLoading}
          className="input-field textarea-field"
        />
      </div>

      <div className="input-group-field">
        <label className="field-label">Отримувач</label>
        <select 
          value={target} 
          onChange={(e) => setTarget(e.target.value)}
          required
          disabled={isLoading}
          className="input-field"
        >
          <option value="" disabled>-- Виберіть отримувача --</option>
          <option value="ALL">Усі користувачі</option>
          <option value="DRIVER">Тільки водії</option>
          <option value="CLIENT">Тільки клієнти</option>
        </select>
      </div>

      <div className="input-group-field">
        <label className="field-label">Зображення</label>
        <input 
          type="file" 
          accept="image/*"
          onChange={handleFileChange}
          disabled={isLoading}
          className="file-input-field"
        />
        
        {previewUrl && (
          <div className="form-preview-box">
            <span className="field-label">Попередній перегляд:</span>
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="form-preview-img"
            />
          </div>
        )}
      </div>

      <div className="form-actions-stack">
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Публікація...' : 'Опублікувати'}
        </button>
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel} 
            className="btn btn-secondary" 
            disabled={isLoading}
          >
            Скасувати
          </button>
        )}
      </div>
    </form>
  );
};

export default NewsForm;