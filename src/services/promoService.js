import api from './api';

// --- СТАРАЯ ЛОГИКА (Задания / Акции) ---
export const getAllPromos = async () => {
  try {
    const response = await api.get('/admin/promos');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Не удалось загрузить акции');
  }
};

export const createPromo = async (promoData) => {
  try {
    const response = await api.post('/admin/promos', promoData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка создания акции');
  }
};

export const deletePromo = async (id) => {
  try {
    await api.delete(`/admin/promos/${id}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Ошибка удаления акции');
  }
};

// --- НОВАЯ ЛОГИКА (Текстовые Промокоды) ---

export const getAllPromoCodes = async () => {
  try {
    // Этот эндпоинт нужно будет добавить на сервер, если его нет
    const response = await api.get('/admin/promocodes'); 
    return response.data;
  } catch (error) {
    // Если на сервере пока нет GET метода, вернем пустой массив, чтобы не ломать UI
    console.warn('GET /admin/promocodes error:', error);
    return [];
  }
};

export const createPromoCode = async (data) => {
  try {
    // data: { code, discountPercent, maxDiscountAmount, usageLimit, activeDays }
    const response = await api.post('/admin/promocodes', data);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка створення промокоду');
  }
};

export const deletePromoCode = async (id) => {
  try {
    await api.delete(`/admin/promocodes/${id}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка видалення промокоду');
  }
};

export const getAllPromoPlans = async () => {
  try {
    const response = await api.get('/admin/promos/plans');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Не вдалося завантажити плани акцій');
  }
};

export const createPromoPlan = async (planData) => {
  try {
    // planData: { title, description, planType, discountPercent, maxDiscountAmount, validityHours, startDate, endDate, maxUses, isActive }
    const response = await api.post('/admin/promos/plans', planData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка створення плану акції');
  }
};

export const deletePromoPlan = async (id) => {
  try {
    await api.delete(`/admin/promos/plans/${id}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка видалення плану акції');
  }
};

export const togglePromoPlan = async (id, isActive) => {
  try {
    const response = await api.post(`/admin/promos/plans/${id}/toggle?active=${isActive}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Помилка зміни статусу акції');
  }
};