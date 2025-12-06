import React, { useState, useEffect } from 'react';
import {
  getAllDispatchers,
  createDispatcher,
  updateDispatcher,
  deleteDispatcher
} from '../services/dispatcherService';
// Импортируем сервис блокировки/разблокировки клиентов (он работает и для User)
import { blockClient, unblockClient } from '../services/clientService';

import Modal from '../components/Modal';
import DispatcherForm from '../components/DispatcherForm';

const DispatchersPage = () => {
  const [dispatchers, setDispatchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDispatcher, setEditingDispatcher] = useState(null); // null = Создание
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Загрузка данных
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

  // 2. Функции-обработчики CRUD
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
      fetchDispatchers(); // Обновляем список
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этого диспетчера?')) {
      try {
        await deleteDispatcher(id);
        fetchDispatchers(); // Обновляем список
      } catch (err) {
        setError(err.message);
      }
    }
  };
  
  // 3. Функции Блокировки (используем clientService, т.к. диспетчер - это User)
  const updateDispatcherState = (updatedUser) => {
    setDispatchers(prev => 
      prev.map(d => d.id === updatedUser.id ? { ...d, isBlocked: updatedUser.isBlocked } : d)
    );
  };
  
  const handleToggleBlock = async (dispatcher) => {
    const action = dispatcher.isBlocked ? unblockClient : blockClient;
    const actionName = dispatcher.isBlocked ? 'Разблокировать' : 'Заблокировать';
    
    if (window.confirm(`Вы уверены, что хотите ${actionName} диспетчера ${dispatcher.fullName}?`)) {
      try {
        setError('');
        const updatedUser = await action(dispatcher.id);
        updateDispatcherState(updatedUser); 
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (loading) return <div>Загрузка диспетчеров...</div>;

  return (
    <div className="table-page-container">
      <div className="table-header">
        <h2>Управление Диспетчерами ({dispatchers.length})</h2>
        <div className="controls">
          <button className="btn-primary" onClick={handleAddClick}>
            + Добавить Диспетчера
          </button>
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Логин</th>
              <th>Полное имя (ПИБ)</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {dispatchers.length > 0 ? (
              dispatchers.map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.userLogin}</td>
                  <td>{d.fullName}</td>
                  <td>
                    {d.isBlocked ? (
                      <strong style={{ color: 'red' }}>ЗАБЛОКИРОВАН</strong>
                    ) : (
                      <span style={{ color: 'green' }}>Активен</span>
                    )}
                  </td>
                  <td>
                    <button className="btn-secondary" onClick={() => handleEditClick(d)}>
                      Редаг.
                    </button>
                    <button 
                      className={d.isBlocked ? 'btn-primary' : 'btn-danger'}
                      onClick={() => handleToggleBlock(d)}
                    >
                      {d.isBlocked ? 'Разблок.' : 'Заблок.'}
                    </button>
                    <button className="btn-danger" onClick={() => handleDeleteClick(d.id)}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">Диспетчеры не найдены.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
        title={editingDispatcher ? 'Редактировать диспетчера' : 'Новый диспетчер'}
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