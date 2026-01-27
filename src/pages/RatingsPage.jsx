import React, { useState, useEffect } from 'react';
import { getAllRatings, toggleIgnoreRating } from '../services/ratingService';
import '../assets/TableStyles.css';

const RatingsPage = () => {
  const [ratings, setRatings] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    try {
      const data = await getAllRatings();
      setRatings(data);
    } catch (error) {
      console.error("Не вдалося завантажити рейтинги", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIgnore = async (id) => {
    if(!window.confirm('Змінити статус врахування цієї оцінки?')) return;
    try {
      await toggleIgnoreRating(id);
      loadRatings();
    } catch (error) {
      console.error("Помилка", error);
      alert("Помилка при зміні статусу");
    }
  };

  const getFilteredRatings = () => {
    return ratings.filter(r => {
      if (filter === 'BAD') return r.score <= 3;
      if (filter === 'GOOD') return r.score > 3;
      return true;
    });
  };

  // ИСПРАВЛЕНО: Рисуем только закрашенные звезды
  const renderStars = (score) => {
    return "★".repeat(score); 
  };

  if (loading) return <div className="page-container">Завантаження...</div>;

  return (
    <div className="page-container">
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Відгуки та Рейтинг</h2>
        
        <div className="filter-buttons">
          <button 
            className={filter === 'ALL' ? 'active-btn' : ''} 
            onClick={() => setFilter('ALL')}
            style={{ marginRight: '10px', padding: '5px 10px' }}
          >
            Всі
          </button>
          <button 
            className={filter === 'BAD' ? 'active-btn' : ''} 
            onClick={() => setFilter('BAD')}
            style={{ marginRight: '10px', padding: '5px 10px', backgroundColor: '#ffcccc', color: '#000' }}
          >
            Скарги (1-3)
          </button>
          <button 
            className={filter === 'GOOD' ? 'active-btn' : ''} 
            onClick={() => setFilter('GOOD')}
            style={{ padding: '5px 10px', backgroundColor: '#ccffcc', color: '#000' }}
          >
            Позитивні (4-5)
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Дата</th>
              <th>Замовлення</th>
              <th>Водій</th>
              <th>Клієнт</th>
              <th>Оцінка</th>
              <th>Коментар</th>
              <th>Дія</th>
            </tr>
          </thead>
          <tbody>
            {getFilteredRatings().map((rating) => (
              <tr key={rating.id || Math.random()} style={{ opacity: rating.comment?.includes('[IGNORED]') ? 0.5 : 1 }}>
                <td>#{rating.id}</td>
                <td>{rating.date || '-'}</td>
                <td>#{rating.orderId}</td>
                <td>{rating.driverName || '---'}</td>
                <td>{rating.clientName || '---'}</td>

                {/* ИСПРАВЛЕНО: Крупный шрифт, только желтые звезды */}
                <td style={{ 
                    color: '#FFD700', 
                    fontWeight: 'bold', 
                    fontSize: '1.5rem',  /* Крупнее */
                    letterSpacing: '2px', 
                    minWidth: '100px',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.2)' /* Небольшая тень для контраста */
                }}>
                  {renderStars(rating.score)}
                </td>
                
                <td>{rating.comment || "-"}</td>
                
                <td>
                  <button 
                    onClick={() => handleToggleIgnore(rating.id)}
                    style={{ fontSize: '0.8rem', padding: '4px 8px', cursor: 'pointer' }}
                  >
                    Архівувати
                  </button>
                </td>
              </tr>
            ))}
            {getFilteredRatings().length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center' }}>Записів не знайдено</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RatingsPage;