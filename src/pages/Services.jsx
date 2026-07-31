import React, { useState, useEffect } from 'react';
import { getAllServices, createService, deleteService } from '../services/servicesService';
import Modal from '../components/Modal'; 
import ServiceForm from '../components/ServiceForm';

const ServicesPage = () => {
  const [servicesList, setServicesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleCreate = async (data) => {
    try {
      setIsSubmitting(true);
      await createService(data);
      setIsModalOpen(false);
      fetchServices();
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="page-wrapper">
      <header className="page-header">
        <div className="header-title-group">
          <h1>Додаткові послуги</h1>
          <span className="count-badge">{servicesList.length}</span>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Створити послугу
          </button>
        </div>
      </header>

      <div className="table-card">
        <div className="table-responsive">
          <table className="main-table">
            <thead>
              <tr>
                <th>Назва послуги</th>
                <th className="text-center" style={{ width: '180px' }}>Код EvoS</th>
                <th className="text-center" style={{ width: '180px' }}>Ціна</th>
                <th className="text-center" style={{ width: '120px' }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center text-subtle py-8">
                    Завантаження послуг...
                  </td>
                </tr>
              ) : servicesList.length > 0 ? (
                servicesList.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.name}</td>
                    <td className="text-center">
                      {item.evosCode ? (
                        <span style={{ backgroundColor: '#e7f5ff', color: '#1c7ed6', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          {item.evosCode}
                        </span>
                      ) : (
                        <span style={{ color: '#adb5bd' }}>—</span>
                      )}
                    </td>
                    <td className="text-center">
                      {item.price === 0 ? (
                        <span className="badge badge-success">Безкоштовно</span>
                      ) : (
                        <span className="font-medium">{item.price} ₴</span>
                      )}
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
                  <td colSpan="4" className="text-center text-subtle py-8">
                    Список послуг порожній
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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