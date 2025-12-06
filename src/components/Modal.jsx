import React from 'react';
import '../assets/Modal.css'; // Стили для модального окна

/**
 * Универсальный компонент модального окна
 * @param {object} props
 * @param {boolean} props.isOpen - Показать или скрыть
 * @param {function} props.onClose - Функция, вызываемая при закрытии
 * @param {string} props.title - Заголовок окна
 * @param {React.ReactNode} props.children - Содержимое (например, форма)
 */
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) {
    return null; // Не рендерим, если закрыто
  }

  // e.stopPropagation() нужен, чтобы клик по самому окну не закрывал его
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
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