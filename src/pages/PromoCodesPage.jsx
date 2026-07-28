import React, { useState, useEffect } from 'react';
import CreatePromoCodeModal from '../components/CreatePromoCodeModal';
import { getAllPromoCodes, deletePromoCode } from '../services/promoService';

const PromoCodesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const data = await getAllPromoCodes();
      setPromoCodes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Ви впевнені, що хочете видалити цей промокод? Це може вплинути на клієнтів, які його вже активували.")) {
      try {
        await deletePromoCode(id);
        fetchCodes();
      } catch (e) {
        alert(e.message);
      }
    }
  };

  if (loading) return <div className="loading-spinner">Завантаження промокодів...</div>;

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="header-title-group">
          <h1>Промокоди</h1>
          <span className="count-badge">{promoCodes.length}</span>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Створити код
          </button>
        </div>
      </header>

      <div className="table-card">
        <div className="table-responsive">
          <table className="main-table">
            <thead>
              <tr>
                <th>Промокод</th>
                <th className="text-center">Знижка</th>
                <th className="text-center">Макс. сума</th>
                <th className="text-center">Діє після вводу</th>
                <th className="text-center">Ліміт</th>
                <th className="text-center">Використано</th>
                <th className="text-center" style={{ width: '120px' }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {promoCodes.length > 0 ? (
                promoCodes.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong className="font-medium text-primary" style={{ letterSpacing: '0.5px' }}>
                        {item.code}
                      </strong>
                    </td>
                    <td className="text-center font-medium text-success">
                      {item.discountPercent}%
                    </td>
                    <td className="text-center font-medium">
                      {item.maxDiscountAmount ? `${item.maxDiscountAmount} ₴` : <span className="text-subtle">∞</span>}
                    </td>
                    <td className="text-center">
                      {item.activationDurationHours ? (
                        <span className="badge badge-warning">
                          {item.activationDurationHours} год.
                        </span>
                      ) : (
                        <span className="text-subtle">Безстроково</span>
                      )}
                    </td>
                    <td className="text-center font-medium">
                      {item.usageLimit ? item.usageLimit : <span className="text-subtle">∞</span>}
                    </td>
                    <td className="text-center font-medium">
                      {item.usedCount}
                    </td>
                    <td className="text-center">
                      <button 
                        className="btn btn-sm btn-ghost-danger"
                        onClick={() => handleDelete(item.id)}
                      >
                        Видалити
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center text-subtle py-8">
                    Промокоди не знайдені. Створіть перший промокод.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreatePromoCodeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchCodes} 
      />
    </div>
  );
};

export default PromoCodesPage;