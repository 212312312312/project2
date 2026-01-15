import api from './api'; // Наш налаштований axios

/**
 * (Read) Отримує список ВСІХ водіїв
 */
export const getAllDrivers = async () => {
  try {
    const response = await api.get('/admin/drivers');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Не вдалося завантажити список водіїв');
  }
};

/**
 * (Read) Отримує список водіїв ONLINE (для карти)
 */
export const getOnlineDriversForMap = async () => {
  try {
    const response = await api.get(`/admin/drivers/location-map?t=${new Date().getTime()}`);
    return response.data;
  } catch (error) {
    console.error("Помилка завантаження водіїв на карту:", error);
    return []; 
  }
};

/**
 * (Create) Створює нового водія
 * ОНОВЛЕНО: carFilesMap містить всі фото (головне + документи)
 */
export const createDriver = async (driverData, file, carFilesMap) => {
  try {
    const formData = new FormData();
    
    // 1. Дані (JSON)
    formData.append('request', JSON.stringify(driverData));
    
    // 2. Аватарка водія (якщо є)
    if (file) {
      formData.append('file', file);
    }

    // 3. Файли авто та документи
    if (carFilesMap) {
      Object.keys(carFilesMap).forEach(key => {
        const fileItem = carFilesMap[key];
        if (fileItem) {
          // Якщо ключ "carFile" (з форми), сервер чекає "carPhoto"
          if (key === 'carFile') {
            formData.append('carPhoto', fileItem);
          } else {
            // Всі інші (techPassportFront, photoFront...) відправляємо як є
            formData.append(key, fileItem);
          }
        }
      });
    }

    const response = await api.post('/admin/drivers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка при створенні водія');
  }
};

/**
 * (Update) Оновлює дані водія
 * ОНОВЛЕНО: carFilesMap містить всі фото
 */
export const updateDriver = async (id, driverData, file, carFilesMap) => {
  try {
    const formData = new FormData();
    
    // 1. Дані
    formData.append('request', JSON.stringify(driverData));
    
    // 2. Аватарка
    if (file) {
      formData.append('file', file);
    }

    // 3. Файли авто та документи
    if (carFilesMap) {
      Object.keys(carFilesMap).forEach(key => {
        const fileItem = carFilesMap[key];
        if (fileItem) {
          if (key === 'carFile') {
            formData.append('carPhoto', fileItem);
          } else {
            formData.append(key, fileItem);
          }
        }
      });
    }

    const response = await api.put(`/admin/drivers/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка при оновленні водія');
  }
};

/**
 * (Delete) Видаляє водія
 */
export const deleteDriver = async (id) => {
  try {
    const response = await api.delete(`/admin/drivers/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка при видаленні водія');
  }
};

// --- Функції Блокування ---

export const blockDriverPermanently = async (id) => {
  try {
    const response = await api.patch(`/admin/drivers/${id}/block`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка блокування');
  }
};

export const blockDriverTemporarily = async (id, durationHours) => {
  try {
    const response = await api.post(`/admin/drivers/${id}/temp-block`, { durationHours });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка тимчасового блокування');
  }
};

export const unblockDriver = async (id) => {
  try {
    const response = await api.patch(`/admin/drivers/${id}/unblock`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка розблокування');
  }
};

export const changeDriverActivity = async (id, points, reason) => {
  try {
    const response = await api.post(`/admin/drivers/${id}/activity`, { points, reason });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка зміни активності');
  }
};