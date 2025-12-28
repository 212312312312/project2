import React, { useState, useEffect } from 'react';
import { getAllNews, createNews, deleteNews } from '../services/newsService';
import Modal from '../components/Modal'; // Ваш компонент модального вікна
import NewsForm from '../components/NewsForm';
import '../assets/TableStyles.css'; // Ваші стилі таблиць

const NewsPage = () => {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Завантаження новин
  const fetchNews = async () => {
    try {
      setLoading(true);
      const data = await getAllNews();
      setNewsList(data);
    } catch (e) {
      console.error(e);
      alert("Не вдалося завантажити новини");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // Створення
  const handleCreate = async (data) => {
    try {
      setIsSubmitting(true);
      await createNews(data);
      setIsModalOpen(false);
      fetchNews(); // Оновлюємо список
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Видалення
  const handleDelete = async (id) => {
    if (window.confirm("Видалити цю новину? Вона зникне у всіх клієнтів.")) {
      try {
        await deleteNews(id);
        fetchNews();
      } catch (e) {
        alert(e.message);
      }
    }
  };

  return (
    <div className="table-page-container">
      <div className="table-header">
        <h2>Сповіщення та Новини</h2>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          + Створити сповіщення
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width: '120px'}}>Дата</th>
              <th style={{width: '200px'}}>Заголовок</th>
              <th>Текст</th>
              <th style={{width: '100px'}}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{textAlign: 'center'}}>Завантаження...</td></tr>
            ) : newsList.length > 0 ? (
              newsList.map((item) => (
                <tr key={item.id}>
                  <td style={{ color: '#666', fontSize: '0.9em' }}>{item.date}</td>
                  <td style={{ fontWeight: 'bold', color: '#2196F3' }}>{item.title}</td>
                  <td style={{ whiteSpace: 'pre-wrap' }}>{item.content}</td>
                  <td>
                    <button 
                      className="delete-btn" // Стиль кнопки видалення
                      onClick={() => handleDelete(item.id)}
                      style={{
                        backgroundColor: '#ffebee',
                        color: '#d32f2f',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Видалити
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>Список новин порожній</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Модальне вікно створення */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Нове сповіщення"
      >
        <NewsForm 
          onSubmit={handleCreate} 
          onCancel={() => setIsModalOpen(false)} 
          isLoading={isSubmitting} 
        />
      </Modal>
    </div>
  );
};

export default NewsPage;