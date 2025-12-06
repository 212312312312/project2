import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const LoginPage = () => {
  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, isAuthenticated } = useAuth();

  // Если уже залогинен, не показываем эту страницу
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError('');
    setLoading(true);

    try {
      await login(loginField, password);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Диспетчерская</h2>
        <div className="form-group">
          <label htmlFor="login">Логин</label> 
          <input
            type="text"
            id="login"
            value={loginField}
            onChange={(e) => setLoginField(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Пароль</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        {error && <p className="error-message">{error}</p>}
        
        <button type="submit" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;