import React, { useState, useEffect } from 'react';
import { getAllServices, createService, updateService, deleteService } from '../services/servicesService';
import Modal from '../components/Modal'; 
import ServiceForm from '../components/ServiceForm';

const ServicesPage = () => {
  const [servicesList, setServicesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await getAllServices();
      setServicesList(Array.isArray(data) ? data : []);
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

  const handleOpenCreateModal = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleSave = async (data) => {
    try {
      setIsSubmitting(true);
      if (editingService) {
        await updateService(editingService.id, data);
      } else {
        await createService(data);
      }
      setIsModalOpen(false);
      setEditingService(null);
      fetchServices();
    } catch (e) {
      alert(e.message || "Помилка збереження послуги");
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
        alert(e.message || "Помилка видалення");
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
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            + Створити послугу
          </button>
        </div>
      </header>

      <div className="table-card">
        <div className="table-responsive">
          <table className="main-table">
            <thead>
              <tr>
                <th className="text-center" style={{ width: '60px' }}>ID</th>
                <th>Назва послуги</th>
                <th className="text-center" style={{ width: '200px' }}>Код EvoS</th>
                <th className="text-center" style={{ width: '160px' }}>Ціна</th>
                <th className="text-center" style={{ width: '180px' }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center text-subtle py-8">
                    Завантаження послуг...
                  </td>
                </tr>
              ) : servicesList.length > 0 ? (
                servicesList.map((item) => (
                  <tr key={item.id}>
                    <td className="text-center text-subtle">#{item.id}</td>
                    <td className="font-medium">{item.name}</td>
                    <td className="text-center">
                      {item.evosCode ? (
                        <span style={{ 
                          backgroundColor: '#e0f2fe', 
                          color: '#0369a1', 
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontWeight: '700', 
                          fontSize: '0.82rem',
                          border: '1px solid #bae6fd'
                        }}>
                          {item.evosCode}
                        </span>
                      ) : (
                        <span className="text-subtle">—</span>
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
                      <div className="btn-group justify-center" style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-sm btn-outline"
                          onClick={() => handleOpenEditModal(item)}
                        >
                          Редагувати
                        </button>
                        <button 
                          className="btn btn-sm btn-ghost-danger"
                          onClick={() => handleDelete(item.id)}
                        >
                          Видалити
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-subtle py-8">
                    Список послуг порожній. Створіть першу послугу!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingService(null);
        }} 
        title={editingService ? "Редагування послуги" : "Нова послуга"}
      >
        <ServiceForm 
          onSubmit={handleSave} 
          onCancel={() => {
            setIsModalOpen(false);
            setEditingService(null);
          }} 
          isLoading={isSubmitting}
          initialData={editingService}
        />
      </Modal>
    </div>
  );
};

export default ServicesPage;