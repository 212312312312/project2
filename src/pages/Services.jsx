import React, { useState, useEffect } from 'react';
import { getAllServices, createService, deleteService } from '../services/servicesService';
import Modal from '../components/Modal'; 
import ServiceForm from '../components/ServiceForm';
import '../assets/TableStyles.css'; // Використовуємо ті ж самі стилі

const ServicesPage = () => {
  const [servicesList, setServicesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Завантаження послуг
  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await getAllServices();
      setServicesList(data);
    } catch (e) {
      console.error(e);
      alert("Не вдалося завантажити послуги");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Створення
  const handleCreate = async (data) => {
    try {
      setIsSubmitting(true);
      await createService(data);
      setIsModalOpen(false);
      fetchServices(); // Оновлюємо список
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Видалення
  const handleDelete = async (id) => {
    if (window.confirm("Видалити цю послугу?")) {
      try {
        await deleteService(id);
        fetchServices();
      } catch (e) {
        alert(e.message);
      }
    }
  };

  return (
    <div className="table-page-container">
      <div className="table-header">
        <h2>Додаткові послуги</h2>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          + Створити послугу
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Назва послуги</th>
              <th style={{width: '150px'}}>Ціна</th>
              <th style={{width: '100px'}}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" style={{textAlign: 'center'}}>Завантаження...</td></tr>
            ) : servicesList.length > 0 ? (
              servicesList.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: '500' }}>{item.name}</td>
                  <td>
                    {item.price === 0 ? (
                      <span style={{ 
                        backgroundColor: '#e8f5e9', 
                        color: '#2e7d32', 
                        padding: '4px 8px', 
                        borderRadius: '12px',
                        fontSize: '0.85em',
                        fontWeight: 'bold'
                      }}>
                        Безкоштовно
                      </span>
                    ) : (
                      <span style={{ fontWeight: 'bold' }}>{item.price} ₴</span>
                    )}
                  </td>
                  <td>
                    <button 
                      className="delete-btn"
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
              <tr><td colSpan="3" style={{textAlign: 'center', padding: '20px'}}>Список послуг порожній</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Модальне вікно створення */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Нова послуга"
      >
        <ServiceForm 
          onSubmit={handleCreate} 
          onCancel={() => setIsModalOpen(false)} 
          isLoading={isSubmitting} 
        />
      </Modal>
    </div>
  );
};

export default ServicesPage;