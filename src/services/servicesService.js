// !!! ВАЖНО: Добавлен префикс /v1/admin, чтобы совпадало с сервером !!!
const API_URL = 'http://localhost:8080/api/v1/admin/services'; 

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const getAllServices = async () => {
  const response = await fetch(API_URL, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    // Добавим чтение текста ошибки от сервера для отладки
    const errorText = await response.text();
    console.error('Error fetching services:', response.status, errorText);
    throw new Error('Помилка завантаження послуг');
  }
  return await response.json();
};

export const createService = async (serviceData) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(serviceData)
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error creating service:', response.status, errorText);
    throw new Error('Помилка створення послуги');
  }
  return await response.json();
};

export const deleteService = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error deleting service:', response.status, errorText);
    throw new Error('Помилка видалення послуги');
  }
};