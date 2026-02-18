import api from './api';

export const getAllSettings = async () => {
    try {
        const response = await api.get('/admin/settings');
        return response.data;
    } catch (error) {
        console.error("Error fetching settings:", error);
        throw error;
    }
};

export const uploadSettingImage = async (key, file) => {
    try {
        const formData = new FormData();
        formData.append('key', key);
        formData.append('file', file);
        
        const response = await api.post('/admin/settings/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.url;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
};

export const saveTextSettings = async (settingsMap) => {
    try {
        await api.post('/admin/settings/save', settingsMap);
    } catch (error) {
        console.error("Error saving settings:", error);
        throw error;
    }
};

// Получение общего баланса компании
export const getCompanyBalance = async () => {
    try {
        const response = await api.get('/admin/stats/company-balance');
        return response.data;
    } catch (error) {
        console.error("Error fetching company balance:", error);
        throw error;
    }
};

// --- НОВЫЙ МЕТОД: Получение истории транзакций ---
export const getAllTransactions = async (page = 0, size = 20) => {
    try {
        const response = await api.get(`/admin/stats/transactions?page=${page}&size=${size}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching transactions:", error);
        throw error;
    }
};