import React, { useState, useEffect } from 'react';
import CreatePromoCodeModal from '../components/CreatePromoCodeModal';
import { getAllPromoCodes, deletePromoCode } from '../services/promoService'; // <-- Додали імпорт delete
import '../assets/TableStyles.css'; 

const PromoCodesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promoCodes, setPromoCodes] = useState([]);

  const fetchCodes = async () => {
    const data = await getAllPromoCodes();
    setPromoCodes(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  // --- НОВА ФУНКЦІЯ ---
  const handleDelete = async (id) => {
    if (window.confirm("Ви впевнені, що хочете видалити цей промокод? Це може вплинути на клієнтів, які його вже активували.")) {
      try {
        await deletePromoCode(id);
        fetchCodes(); // Оновлюємо таблицю
      } catch (e) {
        alert(e.message);
      }
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Промокоди</h1>
        <button className="add-btn" onClick={() => setIsModalOpen(true)}>
          + Створити код
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Код</th>
              <th>Знижка</th>
              <th>Макс. сума</th>
              <th>Діє після вводу</th>
              <th>Ліміт</th>
              <th>Використано</th>
              <th>Дії</th> {/* <-- НОВА КОЛОНКА */}
            </tr>
          </thead>
          <tbody>
            {promoCodes.length > 0 ? (
              promoCodes.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 'bold', color: '#2563eb' }}>{item.code}</td>
                  <td>{item.discountPercent}%</td>
                  <td>{item.maxDiscountAmount ? `${item.maxDiscountAmount} грн` : '∞'}</td>
                  
                  <td>
                    {item.activationDurationHours 
                        ? `${item.activationDurationHours} год.` 
                        : 'Безстроково'}
                  </td>

                  <td>{item.usageLimit ? item.usageLimit : '∞'}</td>
                  <td>{item.usedCount}</td>
                  
                  {/* --- КНОПКА ВИДАЛЕННЯ --- */}
                  <td>
                    <button 
                        className="delete-btn" // Переконайтесь, що у вас є цей клас CSS (код нижче)
                        onClick={() => handleDelete(item.id)}
                        style={{
                            backgroundColor: '#ffebee',
                            color: '#d32f2f',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Видалити
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  Список порожній або завантажується...
                </td>
              </tr>
            )}
          </tbody>
        </table>
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