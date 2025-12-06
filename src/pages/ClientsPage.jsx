import React, { useState, useEffect, useMemo } from 'react';
import { 
  getAllClients, 
  blockClient, 
  unblockClient 
} from '../services/clientService';
// Мы используем те же стили для таблицы, что и у водителей

const ClientsPage = () => {
  // --- Состояния Списка ---
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Загрузка данных
  const fetchClients = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAllClients();
      setClients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // 2. Логика Поиска
  const filteredClients = useMemo(() => {
    if (!searchTerm) {
      return clients; // Если поиск пуст, показать всех
    }
    return clients.filter((client) =>
      client.phoneNumber.includes(searchTerm)
    );
  }, [clients, searchTerm]); // Пересчитать, если 'clients' или 'searchTerm' изменились

  // --- 3. Функции-обработчики Блокировок ---

  // Общая функция для обновления состояния клиента в списке
  const updateClientState = (updatedClient) => {
    setClients(prevClients => 
      prevClients.map(c => c.id === updatedClient.id ? updatedClient : c)
    );
  };

  // Обработчик "Заблокировать" / "Разблокировать"
  const handleToggleBlock = async (client) => {
    // Определяем, какое действие нужно выполнить
    const action = client.isBlocked ? unblockClient : blockClient;
    const actionName = client.isBlocked ? 'Разблокировать' : 'Заблокировать';

    if (window.confirm(`Вы уверены, что хотите ${actionName} клиента ${client.fullName}?`)) {
      try {
        setError('');
        const updatedClient = await action(client.id);
        updateClientState(updatedClient); // Обновляем данные в таблице
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // 4. Отображение
  if (loading) {
    return <div>Загрузка клиентов...</div>;
  }

  return (
    <div className="table-page-container">
      <div className="table-header">
        <h2>Список Клиентов ({filteredClients.length})</h2>
        <div className="controls">
          <input
            type="text"
            placeholder="Поиск по номеру..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>ФИО</th>
              <th>Телефон</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <tr key={client.id}>
                  <td>{client.id}</td>
                  <td>{client.fullName}</td>
                  <td>{client.phoneNumber}</td>
                  <td>
                    {client.isBlocked ? (
                      <strong style={{ color: 'red' }}>ЗАБЛОКИРОВАН</strong>
                    ) : (
                      <span style={{ color: 'green' }}>Активен</span>
                    )}
                  </td>
                  <td>
                    <button 
                      className={client.isBlocked ? 'btn-primary' : 'btn-danger'}
                      onClick={() => handleToggleBlock(client)}
                    >
                      {client.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">Клиенты не найдены.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientsPage;