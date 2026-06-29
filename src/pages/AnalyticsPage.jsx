import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import '../assets/AnalyticsPage.css';

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    analyticsService.getGeneralAnalytics()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error("Ошибка загрузки аналитики:", err);
        setError("Не вдалося завантажити аналітичні дані");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="analytics-loading">Завантаження продуктової аналітики...</div>;
  if (error) return <div className="analytics-error">{error}</div>;

  return (
    <div className="analytics-container">
      <h2>Продуктова та Маркетингова Аналітика 📊</h2>

      {/* БЛОК 1: Карточки главных метрик (KPI) */}
      <div className="analytics-kpi-grid">
        <div className="kpi-card">
          <h3>Середній чек (AOV)</h3>
          <p className="kpi-value">{data.averageOrderValue.toFixed(2)} ₴</p>
        </div>
        <div className="kpi-card revenue">
          <h3>Загальний дохід (Total LTV)</h3>
          <p className="kpi-value">{data.totalLtvSum.toFixed(2)} ₴</p>
        </div>
        <div className="kpi-card">
          <h3>Середній LTV на клієнта</h3>
          <p className="kpi-value">{data.averageLtv.toFixed(2)} ₴</p>
        </div>
        <div className="kpi-card conversion">
          <h3>Конверсія в замовлення</h3>
          <p className="kpi-value">{data.conversionRate.toFixed(2)} %</p>
        </div>
      </div>

      <div className="analytics-tables-grid">
        {/* БЛОК 2: Товарная (Тарифная) аналитика */}
        <div className="analytics-section">
          <h3>Популярність тарифів та Маржинальність</h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Назва тарифу</th>
                <th>К-сть поїздок</th>
                <th>Загальний виторг</th>
              </tr>
            </thead>
            <tbody>
              {data.tariffStats.map((tariff, idx) => (
                <tr key={idx}>
                  <td><strong>{tariff.tariffName}</strong></td>
                  <td>{tariff.orderCount}</td>
                  <td>{tariff.totalRevenue.toFixed(2)} ₴</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* БЛОК 3: Источники маркетингового трафика */}
        <div className="analytics-section">
          <h3>Джерела трафіку (Маркетингова атрибуція)</h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Джерело (UTM Source)</th>
                <th>Кількість користувачів</th>
              </tr>
            </thead>
            <tbody>
              {data.trafficStats.map((traffic, idx) => (
                <tr key={idx}>
                  <td><span className="traffic-badge">{traffic.source}</span></td>
                  <td>{traffic.userCount} користувачів</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* БЛОК 4: Поведение пользователей и экраны отвала */}
      <div className="analytics-section full-width">
        <h3>Аналітика екранів додатка (Поведінка користувачів та Екрани Дропу)</h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Назва екрану додатка пассажира</th>
              <th>Кількість відвідувань</th>
              <th>Середній час на екрані</th>
            </tr>
          </thead>
          <tbody>
            {data.screenStats.map((screen, idx) => (
              <tr key={idx}>
                <td><code>{screen.screenName}</code></td>
                <td>{screen.visitCount} разів</td>
                <td>
                  <div className="time-bar-container">
                    <div 
                      className="time-bar" 
                      style={{ width: `${Math.min(screen.averageDurationSeconds * 2, 100)}%` }}
                    ></div>
                    <span>{screen.averageDurationSeconds.toFixed(1)} сек</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsPage;