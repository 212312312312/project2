import api from './api';

export const photoControlService = {
  // Запросить фотоконтроль у водителя
  requestPhotoControl: async (driverId) => {
    const response = await api.post('/photo-control/request', { driverId });
    return response.data;
  },

  // Получить список всех заявок фотоконтроля (для админа/диспетчера)
  getAllPhotoControls: async () => {
    const response = await api.get('/photo-control/admin/all');
    return response.data;
  },

  // Проверить заявку (Одобрить / Отклонить)
  reviewPhotoControl: async (id, approved, rejectReason = null) => {
    const response = await api.post(`/photo-control/admin/${id}/review`, {
      approved,
      rejectReason,
    });
    return response.data;
  },

  // Скасувати заявку фотоконтролю
  cancelPhotoControl: async (id) => {
    const response = await api.post(`/photo-control/admin/${id}/cancel`);
    return response.data;
  },

  // Загрузка фото водителем (из WebView - поддерживает файлы через FormData)
  submitPhotos: async (id, driverId, photoData) => {
    const response = await fetch(`/api/v1/photo-control/driver/${id}/submit?driverId=${driverId}`, {
      method: 'POST',
      body: photoData
    });

    if (!response.ok) {
      const errorText = await response.text();
      let message = errorText;
      try {
        const json = JSON.parse(errorText);
        message = json.message || errorText;
      } catch (_) {}
      throw new Error(message || 'Помилка завантаження фото');
    }

    return await response.json();
  }
};