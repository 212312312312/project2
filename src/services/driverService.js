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

// --- НОВІ МЕТОДИ: Управління заявками на авто ---

/**
 * Отримати список авто, що чекають перевірки (Status: PENDING)
 */
export const getPendingCars = async () => {
  try {
    const response = await api.get('/admin/drivers/cars/pending');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Не вдалося завантажити заявки');
  }
};

/**
 * Схвалити авто
 */
export const approveCar = async (carId) => {
  try {
    const response = await api.post(`/admin/drivers/cars/${carId}/approve`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка при схваленні авто');
  }
};

/**
 * Відхилити авто (з причиною)
 */
export const rejectCar = async (carId, reason) => {
  try {
    // Передаємо reason як звичайний текст
    const response = await api.post(`/admin/drivers/cars/${carId}/reject`, reason, {
        headers: { 'Content-Type': 'text/plain' }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка при відхиленні авто');
  }
};

export const updateCarDetails = async (carId, carData) => {
  const response = await api.put(`/admin/drivers/cars/${carId}`, carData);
  return response.data;
};

export const getPendingDrivers = async () => {
  try {
    const response = await api.get('/admin/drivers/pending-registration');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Не вдалося завантажити заявки водіїв');
  }
};

/**
 * Схвалити реєстрацію водія
 */
export const approveDriverRegistration = async (driverId, tariffIds) => {
  try {
    // Ми передаємо tariffIds другим аргументом (це тіло запиту)
    const response = await api.post(`/admin/drivers/${driverId}/approve-registration`, tariffIds);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка при схваленні водія');
  }
};

/**
 * Відхилити реєстрацію водія
 */
export const rejectDriverRegistration = async (driverId, reason) => {
  try {
    // reason передаємо як plain text або JSON
    const response = await api.post(`/admin/drivers/${driverId}/reject-registration`, reason, {
        headers: { 'Content-Type': 'text/plain' }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка при відхиленні водія');
  }
};

