import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authService';

// 1. Создаем Контекст
const AuthContext = createContext(null);

// 2. Создаем "Провайдер"
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Для проверки при загрузке
  const navigate = useNavigate();

  // 3. Проверяем localStorage при первой загрузке
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    setIsLoading(false); // Проверка завершена
  }, []);

  // 4. Функция Входа
  const login = async (loginInput, password) => {
    try {
      const data = await loginUser(loginInput, password); 
      
      // Сохраняем в React
      setToken(data.token);
      setUser({
        id: data.userId,
        fullName: data.fullName,
        role: data.role
      });
      setIsAuthenticated(true);

      // Сохраняем в localStorage (для перезагрузки)
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        id: data.userId,
        fullName: data.fullName,
        role: data.role
      }));
      
      navigate('/');
      
    } catch (error) {
      console.error('Login error:', error);
      throw error; // Передаем ошибку в LoginPage
    }
  };

  // 5. Функция Выхода
  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    navigate('/login');
  };

  const value = {
    user,
    token,
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