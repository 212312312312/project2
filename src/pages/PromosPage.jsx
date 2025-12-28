import React, { useState, useEffect } from 'react';
import { getAllPromos, createPromo, deletePromo } from '../services/promoService';
import Modal from '../components/Modal';
import PromoForm from '../components/PromoForm';

const PromosPage = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const data = await getAllPromos();
      setPromos(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleCreate = async (data) => {
    try {
      setIsSubmitting(true);
      await createPromo(data);
      setIsModalOpen(false);
      fetchPromos();
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Видалити цю акцію? Клієнти втратять прогрес по ній.")) {
      try {
        await deletePromo(id);
        fetchPromos();
      } catch (e) {
        alert(e.message);
      }
    }
  };

  return (
    <div className="table-page-container">
      <div className="table-header">
        <h2>Акційні завдання</h2>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          + Створити акцію
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Назва</th>
              <th>Опис</th>
              <th>Умова</th> 
              <th>Тариф</th>
              <th>Знижка</th>
              
              {/* --- НОВА КОЛОНКА --- */}
              <th>Термін дії</th> 
              {/* -------------------- */}
              
              <th>Макс. сума</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {promos.length > 0 ? promos.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td><strong>{p.title}</strong></td>
                <td>{p.description}</td>
                
                {/* Умова */}
                <td>
                  {p.requiredDistanceMeters > 0 ? (
                    <span style={{color: '#2196F3', fontWeight: 'bold'}}>
                      {(p.requiredDistanceMeters / 1000).toFixed(1)} км
                    </span>
                  ) : (
                    <span>{p.requiredRides} поїздок</span>
                  )}
                </td>

                {/* Тариф */}
                <td>
                  {p.requiredTariff ? (
                    <span className="status-online">{p.requiredTariff.name}</span>
                  ) : (
                    "— Будь-який —"
                  )}
                </td>

                <td>{p.discountPercent}%</td>

                {/* --- ВІДОБРАЖЕННЯ ТЕРМІНУ ДІЇ --- */}
                <td style={{textAlign: 'center'}}>
                  {p.activeDaysDuration && p.activeDaysDuration > 0 ? (
                    <span className="badge badge-warning" style={{
                        background: '#fff3cd', 
                        color: '#856404',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.9em'
                    }}>
                      {p.activeDaysDuration} дн.
                    </span>
                  ) : (
                    <span style={{color: '#aaa'}}>∞</span>
                  )}
                </td>
                {/* -------------------------------- */}

                {/* Макс сума */}
                <td>
                  {p.maxDiscountAmount ? (
                    <span>до {p.maxDiscountAmount} грн</span>
                  ) : (
                    <span style={{color: '#aaa'}}>∞</span>
                  )}
                </td>

                <td>
                  <button className="btn-danger" onClick={() => handleDelete(p.id)}>
                    Видалити
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="9">Акцій немає. Створіть першу!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Нова Акція"
      >
        <PromoForm 
          onSubmit={handleCreate} 
          onCancel={() => setIsModalOpen(false)} 
          isLoading={isSubmitting} 
        />
      </Modal>
    </div>
  );
};

export default PromosPage;