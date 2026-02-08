import React, { useState, useEffect } from 'react';
import { getAllNews, createNews, deleteNews } from '../services/newsService';
import Modal from '../components/Modal';
import NewsForm from '../components/NewsForm'; // Переконайся, що цей компонент оновлений (код був вище)
import '../assets/TableStyles.css';

// Приймаємо props для SOS (як у твоєму коді)
const NewsPage = ({ sosList, setSosList }) => {
  
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Базовий URL для картинок
  const API_BASE_URL = 'http://localhost:8080';

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

  const handleCreate = async (data) => {
    try {
      setIsSubmitting(true);
      await createNews(data); // data тепер містить файл і target
      setIsModalOpen(false);
      fetchNews(); 
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Видалити цю новину?")) {
      try {
        await deleteNews(id);
        fetchNews();
      } catch (e) {
        alert(e.message);
      }
    }
  };

  const handleClearSos = () => {
    if(window.confirm("Очистити список тривог?")) {
        if (setSosList) setSosList([]);
    }
  };
  
  // Хелпер для перекладу типу одержувача
  const getTargetLabel = (target) => {
    switch (target) {
      case 'DRIVER': return <span className="badge badge-blue" style={{background: '#e3f2fd', color: '#1976d2', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em'}}>Водії</span>;
      case 'CLIENT': return <span className="badge badge-green" style={{background: '#e8f5e9', color: '#388e3c', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em'}}>Клієнти</span>;
      case 'ALL': default: return <span className="badge badge-gray" style={{background: '#f5f5f5', color: '#616161', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em'}}>Всі</span>;
    }
  };

  const safeSosList = sosList || [];

  return (
    <div className="table-page-container" style={{ display: 'flex', gap: '20px', height: '100%', alignItems: 'stretch' }}>
      
      {/* ЛІВА ЧАСТИНА - НОВИНИ (65%) */}
      <div style={{ flex: 65, display: 'flex', flexDirection: 'column' }}>
        <div className="table-header">
          <h2>📢 Сповіщення та Новини</h2>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            + Створити
          </button>
        </div>

        <div className="table-container" style={{ flex: 1 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{width: '90px'}}>Дата</th>
                <th style={{width: '60px'}}>Фото</th>
                <th style={{width: '150px'}}>Заголовок</th>
                <th>Текст</th>
                <th style={{width: '80px'}}>Кому</th>
                <th style={{width: '60px'}}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{textAlign: 'center'}}>Завантаження...</td></tr>
              ) : newsList.length > 0 ? (
                newsList.map((item) => (
                  <tr key={item.id}>
                    <td style={{ color: '#666', fontSize: '0.85em' }}>{item.date}</td>
                    <td>
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`} 
                          alt="news" 
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      ) : (
                        <span style={{ color: '#ccc', fontSize: '0.8em' }}>-</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 'bold', color: '#2196F3' }}>{item.title}</td>
                    <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', fontSize: '0.9em' }}>
                        {item.content}
                    </td>
                    <td>{getTargetLabel(item.target)}</td>
                    <td>
                      <button 
                        className="delete-btn" 
                        onClick={() => handleDelete(item.id)}
                        style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" style={{textAlign: 'center'}}>Список порожній</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ПРАВА ЧАСТИНА - SOS (35%) (Твій код без змін) */}
      <div style={{ 
          flex: 35, 
          display: 'flex', 
          flexDirection: 'column', 
          backgroundColor: '#ffebee', 
          border: '2px solid #ef5350',
          borderRadius: '8px',
          padding: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h2 style={{ color: '#d32f2f', margin: 0, fontSize: '1.2em' }}>🚨 SOS СИГНАЛИ</h2>
            {safeSosList.length > 0 && (
                <button onClick={handleClearSos} style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                    Очистити
                </button>
            )}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
            {safeSosList.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#b71c1c', marginTop: '20px', opacity: 0.6 }}>
                    <h3>Спокійно</h3>
                    <p>Активних сигналів немає</p>
                </div>
            ) : (
                safeSosList.map((sos, index) => (
                    <div key={index} style={{ 
                        backgroundColor: 'white', 
                        padding: '12px', 
                        marginBottom: '8px', 
                        borderRadius: '6px', 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        borderLeft: '5px solid #d32f2f'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '1.1em' }}>{sos.driverName}</strong>
                            <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>{sos.timestamp}</span>
                        </div>
                        <div style={{ fontSize: '0.9em', color: '#333' }}>
                            🚗 {sos.carNumber} <br/>
                            📞 <a href={`tel:${sos.phone}`}>{sos.phone}</a>
                        </div>
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${sos.lat},${sos.lng}`} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ 
                                display: 'block', 
                                textAlign: 'center', 
                                background: '#d32f2f', 
                                color: 'white', 
                                textDecoration: 'none', 
                                padding: '6px', 
                                borderRadius: '4px',
                                marginTop: '8px',
                                fontSize: '0.9em'
                            }}
                        >
                            📍 Показати на карті
                        </a>
                    </div>
                ))
            )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
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