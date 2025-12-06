import api from './api'; // Our configured axios

/**
 * (Read) Gets the list of ALL tariffs
 * @returns {Promise<Array>} - Array of CarTariffDto objects
 */
export const getAllTariffs = async () => {
  try {
    const response = await api.get('/admin/tariffs');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to load tariffs');
  }
};

/**
 * (Create) Creates a new tariff with an optional image
 * @param {object} tariffData - The form data (JS object)
 * (file) file - The file object (or null)
 */
export const createTariff = async (tariffData, file) => {
  // 1. Create FormData
  const formData = new FormData();
  
  // 2. Add the JSON data as a string (as required by our backend)
  // The backend will parse this string
  formData.append('request', JSON.stringify(tariffData));
  
  // 3. Add the file (if it exists)
  if (file) {
    formData.append('file', file);
  }

  try {
    // 4. Send as 'multipart/form-data'
    // Axios will set the 'Content-Type' header automatically for FormData
    const response = await api.post('/admin/tariffs', formData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error creating tariff');
  }
};

/**
 * (Update) Updates an existing tariff
 * @param {number} id - Tariff ID
 * @param {object} tariffData - The form data (JS object)
 * (file) file - The new file object (or null)
 */
export const updateTariff = async (id, tariffData, file) => {
  const formData = new FormData();
  formData.append('request', JSON.stringify(tariffData));
  
  if (file) {
    formData.append('file', file);
  }

  try {
    // We use PUT, as defined in the backend controller
    const response = await api.put(`/admin/tariffs/${id}`, formData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error updating tariff');
  }
};

/**
 * (Delete) Deletes a tariff
 * @param {number} id - Tariff ID
 * @returns {Promise<object>} - Success message
 */
export const deleteTariff = async (id) => {
  try {
    const response = await api.delete(`/admin/tariffs/${id}`);
    return response.data; // { message: "..." }
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error deleting tariff');
  }
};