import api from './api';

// Отримати всі активні причини
export const getCancellationReasons = async () => {
    const response = await api.get('/cancellation-reasons');
    return response.data;
};

// Створити нову причину (тільки адмін/диспетчер)
export const createCancellationReason = async (reasonText, penaltyScore) => {
    const response = await api.post('/admin/cancellation-reasons', {
        reasonText,
        penaltyScore: parseInt(penaltyScore, 10),
        isActive: true
    });
    return response.data;
};

// Видалити причину
export const deleteCancellationReason = async (id) => {
    await api.delete(`/admin/cancellation-reasons/${id}`);
};