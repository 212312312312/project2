import React, { useState, useEffect } from 'react';
import {
  getAllDispatchers,
  createDispatcher,
  updateDispatcher,
  deleteDispatcher
} from '../services/dispatcherService';
import { blockClient, unblockClient } from '../services/clientService';

import Modal from '../components/Modal';
import DispatcherForm from '../components/DispatcherForm';

const DispatchersPage = () => {
  const [dispatchers, setDispatchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDispatcher, setEditingDispatcher] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDispatchers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAllDispatchers();
      setDispatchers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatchers();
  }, []);

  const handleAddClick = () => {
    setEditingDispatcher(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (dispatcher) => {
    setEditingDispatcher(dispatcher);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingDispatcher(null);
  };

  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    setError('');
    try {
      if (editingDispatcher) {
        await updateDispatcher(editingDispatcher.id, formData);
      } else {
        await createDispatcher(formData);
      }
      handleModalClose();
      fetchDispatchers();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm('Ви впевнені, що хочете видалити цього диспетчера?')) {
      try {
        await deleteDispatcher(id);
        fetchDispatchers();
      } catch (err) {
        setError(err.message);
      }
    }
  };
  
  const updateDispatcherState = (updatedUser) => {
    setDispatchers(prev => 
      prev.map(d => d.id === updatedUser.id ? { ...d, isBlocked: updatedUser.isBlocked } : d)
    );
  };
  
  const handleToggleBlock = async (dispatcher) => {
    const action = dispatcher.isBlocked ? unblockClient : blockClient;
    const actionName = dispatcher.isBlocked ? 'розблокувати' : 'заблокувати';
    
    if (window.confirm(`Ви впевнені, що хочете ${actionName} диспетчера ${dispatcher.fullName}?`)) {
      try {
        setError('');
        const updatedUser = await action(dispatcher.id);
        updateDispatcherState(updatedUser); 
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (loading) return <div className="loading-spinner">Завантаження диспетчерів...</div>;

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="header-title-group">
          <h1>Диспетчери</h1>
          <span className="count-badge">{dispatchers.length}</span>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleAddClick}>
            + Додати диспетчера
          </button>
        </div>
      </header>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      <div className="table-card">
        <div className="table-responsive">
          <table className="main-table">
            <thead>
              <tr>
                <th className="text-center" style={{ width: '60px' }}>ID</th>
                <th>Логін</th>
                <th>ПІБ (Повне ім'я)</th>
                <th className="text-center">Статус</th>
                <th className="text-center" style={{ width: '230px' }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {dispatchers.length > 0 ? (
                dispatchers.map((d) => (
                  <tr key={d.id}>
                    <td className="text-center text-subtle">#{d.id}</td>
                    <td>
                      <strong className="font-medium">{d.userLogin}</strong>
                    </td>
                    <td>{d.fullName}</td>
                    <td className="text-center">
                      <span className={`badge ${d.isBlocked ? 'badge-danger' : 'badge-success'}`}>
                        {d.isBlocked ? 'ЗАБЛОКОВАНИЙ' : 'АКТИВНИЙ'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="btn-group justify-center">
                        <button className="btn btn-sm btn-ghost" onClick={() => handleEditClick(d)}>
                          Ред.
                        </button>
                        <button 
                          className={`btn btn-sm ${d.isBlocked ? 'btn-outline' : 'btn-ghost-danger'}`}
                          onClick={() => handleToggleBlock(d)}
                        >
                          {d.isBlocked ? 'Розблок.' : 'Заблок.'}
                        </button>
                        <button className="btn btn-sm btn-ghost-danger" onClick={() => handleDeleteClick(d.id)}>
                          Вид.
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-subtle py-8">
                    Диспетчери не знайдені. Створіть першого диспетчера.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
        title={editingDispatcher ? 'Редагувати диспетчера' : 'Новий диспетчер'}
      >
        <DispatcherForm
          initialData={editingDispatcher}
          onSubmit={handleFormSubmit}
          onCancel={handleModalClose}
          isLoading={isSubmitting}
        />
      </Modal>
    </div>
  );
};

export default DispatchersPage;