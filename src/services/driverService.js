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
 */
export const createDriver = async (driverData, file, carFilesMap) => {
  try {
    const formData = new FormData();
    formData.append('request', JSON.stringify(driverData));
    if (file) formData.append('file', file);

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
 */
export const updateDriver = async (id, driverData, file, carFilesMap) => {
  try {
    const formData = new FormData();
    formData.append('request', JSON.stringify(driverData));
    if (file) formData.append('file', file);

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

// --- Управління заявками на авто ---

export const getPendingCars = async () => {
  try {
    const response = await api.get('/admin/drivers/cars/pending');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Не вдалося завантажити заявки');
  }
};

export const approveCar = async (carId) => {
  try {
    const response = await api.post(`/admin/drivers/cars/${carId}/approve`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка при схваленні авто');
  }
};

export const rejectCar = async (carId, reason) => {
  try {
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

export const approveDriverRegistration = async (driverId, tariffIds) => {
  try {
    const response = await api.post(`/admin/drivers/${driverId}/approve-registration`, tariffIds);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка при схваленні водія');
  }
};

export const rejectDriverRegistration = async (driverId, reason) => {
  try {
    const response = await api.post(`/admin/drivers/${driverId}/reject-registration`, reason, {
        headers: { 'Content-Type': 'text/plain' }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка при відхиленні водія');
  }
};

// =========================================================
// 💰 FINANCE METHODS (NEW)
// =========================================================

/**
 * Отримати історію транзакцій конкретного водія (для адміна)
 */
export const getDriverTransactions = async (driverId) => {
    try {
        // Переконайся, що такий endpoint існує на сервері в DriverAdminController
        const response = await api.get(`/admin/drivers/${driverId}/transactions`);
        // Якщо бекенд повертає Page, беремо content, інакше повертаємо data як масив
        return response.data.content ? response.data.content : response.data;
    } catch (error) {
        console.error("Error fetching driver transactions:", error);
        // Повертаємо пустий масив, щоб не ламати UI
        return [];
    }
};

/**
 * Ручна зміна балансу (Адмін поповнює або знімає гроші)
 * amount: число (позитивне = поповнення/бонус, негативне = штраф/вивід)
 */
export const manualBalanceUpdate = async (driverId, amount, description) => {
     try {
         const response = await api.post(`/admin/drivers/${driverId}/balance`, { amount, description });
         return response.data; // Повертає оновлений об'єкт водія (DriverDto)
     } catch (error) {
         throw new Error(error.response?.data?.message || 'Помилка зміни балансу');
     }
};