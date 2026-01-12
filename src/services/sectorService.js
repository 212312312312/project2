import api from './api';

const sectorService = {
    getAllSectors: async () => {
        const response = await api.get('/admin/sectors');
        return response.data;
    },
    createSector: async (sectorData) => {
        const response = await api.post('/admin/sectors', sectorData);
        return response.data;
    },
    deleteSector: async (id) => {
        const response = await api.delete(`/admin/sectors/${id}`);
        return response.data;
    }
};

export default sectorService;