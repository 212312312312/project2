import React, { useState, useEffect } from 'react';
// import { useOutletContext } from 'react-router-dom'; // <-- ЭТО БОЛЬШЕ НЕ НУЖНО
import { getAllNews, createNews, deleteNews } from '../services/newsService';
import Modal from '../components/Modal';
import NewsForm from '../components/NewsForm';
import '../assets/TableStyles.css';

// Принимаем props напрямую
const NewsPage = ({ sosList, setSosList }) => {
  
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
      await createNews(data);
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
        // Проверка, передана ли функция (на случай если пропс не пришел)
        if (setSosList) setSosList([]);
    }
  };

  // Защита от undefined, если вдруг пропсы не пришли (при прямой навигации/тестах)
  const safeSosList = sosList || [];

  return (
    <div className="table-page-container" style={{ display: 'flex', gap: '20px', height: '100%', alignItems: 'stretch' }}>
      
      {/* ЛІВА ЧАСТИНА - НОВИНИ (65%) */}
      <div style={{ flex: 65, display: 'flex', flexDirection: 'column' }}>
        <div className="table-header">
          <h2>📢 Сповіщення для клієнтів</h2>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            + Створити
          </button>
        </div>

        <div className="table-container" style={{ flex: 1 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{width: '100px'}}>Дата</th>
                <th style={{width: '180px'}}>Заголовок</th>
                <th>Текст</th>
                <th style={{width: '80px'}}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{textAlign: 'center'}}>...</td></tr>
              ) : newsList.length > 0 ? (
                newsList.map((item) => (
                  <tr key={item.id}>
                    <td style={{ color: '#666', fontSize: '0.85em' }}>{item.date}</td>
                    <td style={{ fontWeight: 'bold', color: '#2196F3' }}>{item.title}</td>
                    <td style={{ whiteSpace: 'pre-wrap', fontSize: '0.9em' }}>{item.content}</td>
                    <td>
                      <button className="delete-btn" onClick={() => handleDelete(item.id)}>X</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" style={{textAlign: 'center'}}>Список порожній</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ПРАВА ЧАСТИНА - SOS (35%) */}
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Нове сповіщення">
        <NewsForm onSubmit={handleCreate} onCancel={() => setIsModalOpen(false)} isLoading={isSubmitting} />
      </Modal>
    </div>
  );
};

export default NewsPage;