import api from './api';

export const getAllSettings = async () => {
    const response = await api.get('/admin/settings');
    return response.data; 
};

export const uploadSettingImage = async (key, file) => {
    const formData = new FormData();
    formData.append('key', key);
    formData.append('file', file);
    const response = await api.post('/admin/settings/upload', formData);
    return response.data.url; 
};

// НОВАЯ ФУНКЦИЯ
export const saveTextSettings = async (settingsMap) => {
    // Отправляем объект { "key": "value", "key2": "value2" }
    await api.post('/admin/settings/save', settingsMap);
};