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
  const [isLoading, setIsLoading] = useState(true); // Для проверки при загрузке
  const navigate = useNavigate();

  // 3. Проверяем сессию через HttpOnly куку при первой загрузке
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Делаем тихий POST запрос на рефреш. 
        // Если кука жива — бэкенд вернет свежие данные юзера.
        const response = await api.post('/auth/refresh');
        const data = response.data;
        
        setUser({
          id: data.userId,
          fullName: data.fullName,
          role: data.role
        });
        setIsAuthenticated(true);
      } catch (error) {
        // Если кук нет или они протухли — тихо сбрасываем сессию
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

      // Сохраняем в localStorage ТОЛЬКО данные профиля для UI (без токенов!)
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
    setToken(null);
    setIsAuthenticated(false);
    
  localStorage.clear(); // Safe & Clean: гарантированно выжигает и token, и refreshToken, и user стейты
    
    navigate('/login');
  };

  const value = {
    user,
    // строку token, удаляем отсюда
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

// 7. Кастомный Хук для удобства
export const useAuth = () => {
  return useContext(AuthContext);
};