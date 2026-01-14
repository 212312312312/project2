import React, { useEffect } from 'react';
import '../assets/Modal.css'; // Стилі для модалки (код нижче)

const Modal = ({ isOpen, onClose, title, children }) => {
  // Блокуємо скрол сторінки, коли модалка відкрита
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Тут НЕМАЄ onClick={onClose}, тому клік по фону нічого не робить
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{title}</h2>
          {/* Єдиний спосіб закрити - ця кнопка */}
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;