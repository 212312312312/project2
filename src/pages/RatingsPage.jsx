import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllRatings, toggleIgnoreRating } from '../services/ratingService';
import '../assets/RatingsPage.css';

const RatingsPage = () => {
  const navigate = useNavigate();

  const [ratings, setRatings] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL, BAD, BAD_WITH_COMMENT, WITH_COMMENT, GOOD
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllRatings();
      const formattedData = Array.isArray(data) ? data : (data?.data || []);
      setRatings(formattedData.map(r => ({ ...r, id: r.id || Math.random() })));
    } catch (err) {
      console.error("Помилка завантаження рейтингів:", err);
      setError("Не вдалося завантажити список відгуків");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIgnore = async (id) => {
    if (!window.confirm('Змінити статус архівування цієї оцінки?')) return;
    try {
      await toggleIgnoreRating(id);
      loadRatings();
    } catch (err) {
      console.error("Помилка при зміні статусу:", err);
      alert("Помилка при зміні статусу відгуку");
    }
  };

  // Перехід до картки водія (без перезавантаження сторінки)
  const handleOpenDriver = (driverId) => {
    if (!driverId) return;
    navigate(`/drivers?openId=${driverId}`);
  };

  // Перехід до картки клієнта (без перезавантаження сторінки)
  const handleOpenClient = (clientId) => {
    if (!clientId) return;
    navigate(`/clients?openId=${clientId}`);
  };

  const filteredRatings = useMemo(() => {
    return ratings.filter(r => {
      // Перевірка навності реального тексту коментаря
      const cleanComment = (r.comment || '').replace('[IGNORED]', '').trim();
      const hasComment = cleanComment !== '' && cleanComment !== '—';

      if (filter === 'BAD') return r.score <= 3;
      if (filter === 'BAD_WITH_COMMENT') return r.score <= 3 && hasComment;
      if (filter === 'WITH_COMMENT') return hasComment;
      if (filter === 'GOOD') return r.score > 3;
      return true;
    });
  }, [ratings, filter]);

  const renderStars = (score) => {
    const validScore = Math.max(1, Math.min(5, Number(score) || 5));
    return "★".repeat(validScore);
  };

  if (loading) return <div className="loading-spinner">Завантаження відгуків...</div>;

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="header-title-group">
          <h1>Відгуки та рейтинг</h1>
          <span className="count-badge">{filteredRatings.length}</span>
        </div>

        <div className="header-actions">
          <div className="toggle-group">
            <button 
              className={`toggle-btn ${filter === 'ALL' ? 'active' : ''}`} 
              onClick={() => setFilter('ALL')}
            >
              Усі
            </button>
            <button 
              className={`toggle-btn ${filter === 'BAD' ? 'active' : ''}`} 
              onClick={() => setFilter('BAD')}
            >
              Скарги (1-3)
            </button>
            <button 
              className={`toggle-btn ${filter === 'BAD_WITH_COMMENT' ? 'active' : ''}`} 
              onClick={() => setFilter('BAD_WITH_COMMENT')}
            >
              Скарги з текстом
            </button>
            <button 
              className={`toggle-btn ${filter === 'WITH_COMMENT' ? 'active' : ''}`} 
              onClick={() => setFilter('WITH_COMMENT')}
            >
              З коментарем
            </button>
            <button 
              className={`toggle-btn ${filter === 'GOOD' ? 'active' : ''}`} 
              onClick={() => setFilter('GOOD')}
            >
              Позитивні (4-5)
            </button>
          </div>

          <button className="btn btn-secondary" onClick={loadRatings}>
            Оновити
          </button>
        </div>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-card">
        <div className="table-responsive">
          <table className="main-table ratings-table">
            <thead>
              <tr>
                <th className="text-center">ID</th>
                <th>Дата</th>
                <th className="text-center">Замовлення</th>
                <th>Водій</th>
                <th>Клієнт</th>
                <th className="text-center">Оцінка</th>
                <th>Коментар</th>
                <th className="text-center">Дія</th>
              </tr>
            </thead>
            <tbody>
              {filteredRatings.length > 0 ? (
                filteredRatings.map((rating) => {
                  const isIgnored = rating.comment?.includes('[IGNORED]') || rating.isIgnored;
                  
                  // Визначення ID з різних можливих структур DTO
                  const driverId = rating.driverId || rating.driver?.id;
                  const clientId = rating.clientId || rating.client?.id;
                  
                  const driverName = rating.driverName || rating.driver?.fullName || '—';
                  const clientName = rating.clientName || rating.client?.fullName || '—';

                  return (
                    <tr 
                      key={rating.id} 
                      className={isIgnored ? 'row-archived' : ''}
                    >
                      <td className="text-center text-subtle">#{rating.id}</td>
                      <td className="text-subtle text-sm">{rating.date || '—'}</td>
                      <td className="text-center font-medium">#{rating.orderId || '—'}</td>
                      
                      {/* КЛІКАБЕЛЬНИЙ ВОДІЙ */}
                      <td>
                        {driverId ? (
                          <span 
                            className="clickable-entity" 
                            onClick={() => handleOpenDriver(driverId)}
                            title="Перейти до картки водія"
                          >
                            {driverName}
                          </span>
                        ) : (
                          <span>{driverName}</span>
                        )}
                      </td>

                      {/* КЛІКАБЕЛЬНИЙ КЛІЄНТ */}
                      <td>
                        {clientId ? (
                          <span 
                            className="clickable-entity" 
                            onClick={() => handleOpenClient(clientId)}
                            title="Перейти до картки клієнта"
                          >
                            {clientName}
                          </span>
                        ) : (
                          <span>{clientName}</span>
                        )}
                      </td>

                      <td className="text-center stars-cell">
                        <span className={`stars-display ${rating.score <= 3 ? 'stars-bad' : 'stars-good'}`}>
                          {renderStars(rating.score)}
                        </span>
                      </td>
                      <td className="comment-cell">{rating.comment || '—'}</td>
                      <td className="text-center">
                        <button 
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleToggleIgnore(rating.id)}
                        >
                          {isIgnored ? 'Розархівувати' : 'Архівувати'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center text-subtle py-8">
                    Відгуків не знайдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RatingsPage;