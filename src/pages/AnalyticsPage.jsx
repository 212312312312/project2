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

  // Хелпер для красивого форматирования денег с пробелами (11 700 ₴)
  const formatMoney = (value) => {
    if (value === undefined || value === null) return '0 ₴';
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₴";
  };

  // --- ЛОГИКА АГРЕГАЦИИ ДЛЯ ПРАВИЛЬНОЙ ВОРОНКИ КОНВЕРСИИ ---
  const getActionCount = (name) => {
    if (!data || !data.actionStats) return 0;
    return data.actionStats
      .filter(item => item.actionName === name)
      .reduce((sum, item) => sum + item.count, 0);
  };

  const tariffsViewCount = getActionCount('tariffs_view');
  const tariffSelectCount = getActionCount('tariff_select');
  const clickOrderCount = getActionCount('click_order');

  // ЧИСТЫЙ ОТВАЛ: Сколько людей увидели цены, но ТАК И НЕ НАЖАЛИ "Заказать"
  const totalDropOffRate = tariffsViewCount > 0 
    ? Math.max(0, ((tariffsViewCount - clickOrderCount) / tariffsViewCount) * 100).toFixed(1) 
    : '0.0';

  const tariffSelectDropOff = tariffSelectCount > 0 
    ? Math.max(0, ((tariffSelectCount - clickOrderCount) / tariffSelectCount) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="analytics-container">
      <h2>Продуктова та Маркетингова Analitika 📊</h2>

      {/* БЛОК 1: Карточки главных метрик (KPI) */}
      <div className="analytics-kpi-grid">
        <div className="kpi-card">
          <h3>Середній чек (AOV)</h3>
          <p className="kpi-value">{formatMoney(data.averageOrderValue)}</p>
        </div>
        <div className="kpi-card revenue">
          <h3>Загальний дохід (Total LTV)</h3>
          <p className="kpi-value">{formatMoney(data.totalLtvSum)}</p>
        </div>
        <div className="kpi-card">
          <h3>Середній LTV на клієнта</h3>
          <p className="kpi-value">{formatMoney(data.averageLtv)}</p>
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
                  <td>{formatMoney(tariff.totalRevenue)}</td>
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
                <th>Джерело (Source)</th>
                <th>Канал (Medium)</th>
                <th>Кампанія (Campaign)</th>
                <th>Кількість користувачів</th>
              </tr>
            </thead>
            <tbody>
              {data.trafficStats.map((traffic, idx) => (
                <tr key={idx}>
                  <td><span className="traffic-badge">{traffic.source}</span></td>
                  <td><code className="traffic-code">{traffic.medium}</code></td>
                  <td><span className="traffic-campaign">{traffic.campaign}</span></td>
                  <td><strong>{traffic.userCount}</strong> користувачів</td>
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
                    >
                    </div>
                    <span>{screen.averageDurationSeconds.toFixed(1)} сек</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* БЛОК 5: Правильная воронка целевых действий */}
      <div className="analytics-section full-width" style={{ marginTop: '25px' }}>
        <h3>Цільові дії та лінійка конверсії додатка пасажира 📈</h3>
        <div className="funnel-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
          
          {/* Этап 1: Просмотр цен */}
          <div className="funnel-step" style={{ padding: '15px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e0e0e0', borderLeft: '5px solid #00b0ff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <p style={{ margin: '5px 0', fontSize: '1.1rem', color: '#222222' }}>Подія/Клік: <strong>tariffs_view</strong></p>
            <p style={{ margin: '5px 0', color: '#d32f2f', fontWeight: '500' }}>Процент выхода из приложения после этой подие: <strong>{totalDropOffRate}%</strong></p>
            <p style={{ margin: '5px 0', color: '#666666' }}>Кількість взаємодій: <strong>{tariffsViewCount}</strong> разів</p>
          </div>

          {/* Информационная плашка про клики по тарифам (внутри воронки) */}
          <div className="funnel-step" style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #e0e0e0', borderLeft: '5px solid #fbc02d', marginLeft: '20px', fontStyle: 'italic' }}>
            <p style={{ margin: '5px 0', color: '#222222' }}>Додаткова активність: <strong>tariff_select</strong> (Зміна тарифу вручну)</p>
            <p style={{ margin: '5px 0', color: '#666666' }}>Всього перемикань між тарифами в додатку: <strong>{tariffSelectCount}</strong> разів</p>
          </div>

          {/* Этап 2: Финальный заказ */}
          <div className="funnel-step" style={{ padding: '15px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e0e0e0', borderLeft: '5px solid #388e3c', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <p style={{ margin: '5px 0', fontSize: '1.1rem', color: '#222222' }}>Подія/Клік: <strong>click_order</strong></p>
            <p style={{ margin: '5px 0', color: '#388e3c', fontWeight: '500' }}>Конверсія в замовлення: <strong>{(100 - parseFloat(totalDropOffRate)).toFixed(1)}%</strong></p>
            <p style={{ margin: '5px 0', color: '#666666' }}>Кількість взаємодій: <strong>{clickOrderCount}</strong> разів (Замовлення успішно сформовано)</p>
          </div>

          {/* Дополнительный блок для остальных кликов */}
          {data.actionStats && data.actionStats.filter(a => !['tariffs_view', 'tariff_select', 'click_order'].includes(a.actionName)).length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <h4 style={{ marginBottom: '10px', color: '#444444' }}>Інші додаткові кліки:</h4>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Назва події</th>
                    <th>Значення / Контекст</th>
                    <th>Кількість взаємодій</th>
                  </tr>
                </thead>
                <tbody>
                  {data.actionStats.filter(a => !['tariffs_view', 'tariff_select', 'click_order'].includes(a.actionName)).map((action, idx) => (
                    <tr key={idx}>
                      <td><code>{action.actionName}</code></td>
                      <td><span className="traffic-campaign">{action.actionValue || 'без параметра'}</span></td>
                      <td><strong>{action.count}</strong> разів</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;