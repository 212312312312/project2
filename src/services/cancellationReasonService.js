import api from './api';

// Отримати всі активні причини (за цільовою аудиторією: 'DRIVER' або 'CLIENT')
export const getCancellationReasons = async (target) => {
    const response = await api.get('/cancellation-reasons', { params: { target } });
    return response.data;
};

// Створити нову причину (тільки адмін/диспетчер)
export const createCancellationReason = async (reasonText, penaltyScore, target) => {
    const response = await api.post('/admin/cancellation-reasons', {
        reasonText,
        // Якщо створюємо для клієнта, штраф завжди 0
        penaltyScore: target === 'CLIENT' ? 0 : parseInt(penaltyScore, 10),
        isActive: true,
        target: target || 'DRIVER'
    });
    return response.data;
};

// Видалити причину
export const deleteCancellationReason = async (id) => {
    await api.delete(`/admin/cancellation-reasons/${id}`);
};