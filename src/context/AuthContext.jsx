import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authService';
import api from '../services/api';

// 1. Создаем Контекст
const AuthContext = createContext(null);

// 2. Создаем "Провайдер"
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // 3. Проверяем сессию при первой загрузке
  useEffect(() => {
    const checkAuth = async () => {
      const savedRefreshToken = localStorage.getItem('refreshToken');

      // 🛠️ ФИКС: Если нет сохраненного refresh-токена, НЕ делаем лишний запрос на сервер!
      if (!savedRefreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        // 🛠️ ФИКС: Передаем refreshToken в JSON-теле (работает надежно без кук между localhost и Cloud Run)
        const response = await api.post('/auth/refresh', { refreshToken: savedRefreshToken });
        const data = response.data;

        // Обновляем токены в localStorage
        if (data.token) localStorage.setItem('token', data.token);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);

        setUser({
          id: data.userId,
          fullName: data.fullName,
          role: data.role
        });
        setIsAuthenticated(true);
      } catch (error) {
        // Если токен невалиден — очищаем сессию
        setUser(null);
        setIsAuthenticated(false);
        localStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 4. Функция Входа
  const login = async (loginInput, password) => {
    try {
      const data = await loginUser(loginInput, password); 

      setUser({
        id: data.userId,
        fullName: data.fullName,
        role: data.role
      });
      setIsAuthenticated(true);

      // 🛠️ ФИКС: Сохраняем токены и профиль
      if (data.token) localStorage.setItem('token', data.token);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);

      localStorage.setItem('user', JSON.stringify({
        id: data.userId,
        fullName: data.fullName,
        role: data.role
      }));

      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // 5. Функция Выхода
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.clear(); // 🛠️ ФИКС: Убрали вызов несуществующего setToken(null)
    navigate('/login');
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

// 7. Кастомный Хук
export const useAuth = () => {
  return useContext(AuthContext);
};