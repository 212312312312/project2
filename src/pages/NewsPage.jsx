import React, { useState, useEffect } from 'react';
import { getAllNews, createNews, deleteNews } from '../services/newsService';
import Modal from '../components/Modal';
import NewsForm from '../components/NewsForm';
import '../assets/NewsPage.css';

const NewsPage = ({ sosList, setSosList }) => {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_BASE_URL = 'http://localhost:8080';

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
    if (window.confirm("Очистити список тривог?")) {
      if (setSosList) setSosList([]);
    }
  };
  
  const getTargetBadge = (target) => {
    switch (target) {
      case 'DRIVER': return <span className="badge badge-info">Водії</span>;
      case 'CLIENT': return <span className="badge badge-success">Клієнти</span>;
      case 'ALL': default: return <span className="badge badge-muted">Усі</span>;
    }
  };

  const safeSosList = sosList || [];

  return (
    <div className="page-wrapper news-page-wrapper">
      <div className="news-page-layout">
        
        {/* ЛІВА ЧАСТИНА - НОВИНИ */}
        <div className="news-main-section">
          <header className="page-header">
            <div className="header-title-group">
              <h1>Сповіщення та новини</h1>
              <span className="count-badge">{newsList.length}</span>
            </div>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              + Створити
            </button>
          </header>

          <div className="table-card">
            <div className="table-responsive">
              <table className="main-table news-table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th className="text-center">Фото</th>
                    <th>Заголовок</th>
                    <th>Текст новини</th>
                    <th className="text-center">Кому</th>
                    <th className="text-center">Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="text-center text-subtle py-8">Завантаження новин...</td></tr>
                  ) : newsList.length > 0 ? (
                    newsList.map((item) => {
                      const fullImgUrl = item.imageUrl ? (item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`) : null;
                      return (
                        <tr key={item.id}>
                          <td className="text-subtle text-sm">{item.date}</td>
                          <td className="text-center">
                            {fullImgUrl ? (
                              <a href={fullImgUrl} target="_blank" rel="noopener noreferrer" className="photo-card-link">
                                <img src={fullImgUrl} alt="news" className="news-thumb-img" />
                              </a>
                            ) : (
                              <span className="text-subtle">—</span>
                            )}
                          </td>
                          <td className="font-medium text-primary title-cell">{item.title}</td>
                          <td className="news-content-cell">
                            {item.content}
                          </td>
                          <td className="text-center">{getTargetBadge(item.target)}</td>
                          <td className="text-center">
                            <button 
                              className="btn btn-sm btn-outline-danger" 
                              onClick={() => handleDelete(item.id)}
                            >
                              Видалити
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="6" className="text-center text-subtle py-8">Список новин порожній</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ПРАВА ЧАСТИНА - SOS СИГНАЛИ */}
        <aside className="sos-sidebar">
          <div className="sos-panel-card">
            <div className="sos-panel-header">
              <div className="header-title-group">
                <h2 className="sos-title">SOS Сигнали</h2>
                {safeSosList.length > 0 && (
                  <span className="badge badge-danger">{safeSosList.length}</span>
                )}
              </div>
              {safeSosList.length > 0 && (
                <button onClick={handleClearSos} className="btn btn-sm btn-outline-danger">
                  Очистити
                </button>
              )}
            </div>

            <div className="sos-list-box">
              {safeSosList.length === 0 ? (
                <div className="sos-empty-state">
                  <h4>Сигнали відсутні</h4>
                  <p className="text-subtle">Наразі немає активних екстрених викликів.</p>
                </div>
              ) : (
                safeSosList.map((sos, index) => (
                  <div key={index} className="sos-item-card">
                    <div className="sos-item-top">
                      <strong className="sos-driver-name">{sos.driverName}</strong>
                      <span className="sos-timestamp">{sos.timestamp}</span>
                    </div>
                    <div className="sos-details-grid">
                      <div className="sos-detail-row">
                        <span className="text-subtle">Авто:</span>
                        <span className="plate-badge mini-plate">{sos.carNumber}</span>
                      </div>
                      <div className="sos-detail-row">
                        <span className="text-subtle">Тел:</span>
                        <a href={`tel:${sos.phone}`} className="sos-phone-link">{sos.phone}</a>
                      </div>
                    </div>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${sos.lat},${sos.lng}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-sm btn-primary sos-map-btn"
                    >
                      Показати на карті
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Створити новину / сповіщення"
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