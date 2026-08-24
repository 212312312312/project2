import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import '../assets/AnalyticsPage.css';

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    analyticsService.getDeepAnalytics()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error("Помилка завантаження глибокої аналітики:", err);
        // Fallback на загальну аналітику, якщо deep endpoint ще не задеплоєний
        analyticsService.getGeneralAnalytics()
          .then(fallbackRes => {
            setData({ general: fallbackRes });
            setLoading(false);
          })
          .catch(() => {
            setError("Не вдалося завантажити аналітичні дані");
            setLoading(false);
          });
      });
  }, []);

  if (loading) return <div className="loading-spinner">Завантаження аналітики та когорт...</div>;
  if (error) return <div className="alert alert-danger mb-3">{error}</div>;

  const general = data.general || data;
  const kpis = data.kpis || {};
  const cohorts = data.cohorts || [];
  const payback = data.payback || {};
  const fraud = data.fraud || {};

  const formatMoney = (value) => {
    if (value === undefined || value === null) return '0 ₴';
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₴";
  };

  const getActionCount = (name) => {
    if (!general || !general.actionStats) return 0;
    return general.actionStats
      .filter(item => item.actionName === name)
      .reduce((sum, item) => sum + item.count, 0);
  };

  const tariffsViewCount = getActionCount('tariffs_view');
  const tariffSelectCount = getActionCount('tariff_select');
  const clickOrderCount = getActionCount('click_order');

  const totalDropOffRate = tariffsViewCount > 0 
    ? Math.max(0, ((tariffsViewCount - clickOrderCount) / tariffsViewCount) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="page-wrapper analytics-container">
      <header className="page-header">
        <div className="header-title-group">
          <h1>Глибока Продуктова, Операційна та Когортна Аналітика</h1>
        </div>
      </header>

      {/* БЛОК 1: Операційні та Фінансові KPIs */}
      <div className="analytics-kpi-grid">
        <div className="kpi-card fulfillment">
          <h3>Fulfillment Rate (Вивозимість)</h3>
          <p className="kpi-value">{kpis.fulfillmentRate ? kpis.fulfillmentRate.toFixed(1) : (general.fulfillmentRate?.toFixed(1) || '0.0')} %</p>
          <span className="kpi-sub">Успішно завершені поїздки</span>
        </div>

        <div className="kpi-card timer">
          <h3>Time to Accept (Пошук авто)</h3>
          <p className="kpi-value">{kpis.avgTimeToAcceptSeconds ? kpis.avgTimeToAcceptSeconds.toFixed(0) : '0'} сек</p>
          <span className="kpi-sub">Норма: до 90–120 секунд</span>
        </div>

        <div className="kpi-card boost">
          <h3>Boost Efficiency (+20 грн)</h3>
          <p className="kpi-value">{kpis.boostOrdersPercent ? kpis.boostOrdersPercent.toFixed(1) : '0.0'} %</p>
          <span className="kpi-sub">
            Вивіз після бусту: <strong>{kpis.boostFulfillmentPercent ? kpis.boostFulfillmentPercent.toFixed(1) : '0.0'}%</strong>
          </span>
        </div>

        <div className="kpi-card danger">
          <h3>Швидкі відмови (&lt;60 сек)</h3>
          <p className="kpi-value">{kpis.quickClientCancelPercent ? kpis.quickClientCancelPercent.toFixed(1) : '0.0'} %</p>
          <span className="kpi-sub">Не дочекалися подачі</span>
        </div>

        <div className="kpi-card warning">
          <h3>Таймаути біржі</h3>
          <p className="kpi-value">{kpis.timeoutCancelPercent ? kpis.timeoutCancelPercent.toFixed(1) : '0.0'} %</p>
          <span className="kpi-sub">Авто не знайдено за 3 хв</span>
        </div>

        <div className="kpi-card revenue">
          <h3>Загальний дохід (Total LTV)</h3>
          <p className="kpi-value">{formatMoney(general.totalLtvSum)}</p>
          <span className="kpi-sub">Середній чек: {formatMoney(general.averageOrderValue)}</span>
        </div>
      </div>

      {/* БЛОК 2: Маркетинг, Окупність (Payback) та Anti-Fraud */}
      <div className="payback-fraud-grid">
        <div className="table-card payback-card">
          <div className="card-header-badge">
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Срок окупності клієнта (Payback Period &amp; CAC)
            </h3>
            <span className="unit-tag tag-blue">Unit Economics</span>
          </div>
          <div className="payback-stats-grid">
            <div className="payback-item">
              <span className="payback-label">Розрахунковий CAC:</span>
              <strong className="payback-value text-danger">{payback.estimatedCac || 120} ₴</strong>
            </div>
            <div className="payback-item">
              <span className="payback-label">Сер. комісія з поїздки:</span>
              <strong className="payback-value text-success">{payback.avgCommissionPerOrder || 15} ₴</strong>
            </div>
            <div className="payback-item">
              <span className="payback-label">Ціль поїздок для окупності:</span>
              <strong className="payback-value">{payback.targetRidesForPayback || 8} поїздок</strong>
            </div>
            <div className="payback-item highlighted">
              <span className="payback-label">Сер. час виходу в плюс:</span>
              <strong className="payback-value text-primary">
                {payback.avgDaysToPayback ? `${payback.avgDaysToPayback.toFixed(1)} дн.` : '—'}
              </strong>
            </div>
          </div>
          <div className="analytics-help-text" style={{ borderLeftColor: '#0284c7', minHeight: 'auto', marginTop: '1rem' }}>
            <span><strong>Формула окупності:</strong> (Кількість поїздок × Комісія 15 ₴) &ge; CAC (120 ₴). Клієнт окупає маркетингові витрати на 8-й поїздці.</span>
          </div>
        </div>

        <div className="table-card fraud-card">
          <div className="card-header-badge">
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Антифрод &amp; Захист від накруток (Device ID)
            </h3>
            <span className="unit-tag tag-red">Anti-Fraud Shield</span>
          </div>
          <div className="fraud-stats-container">
            <div className="fraud-kpi">
              <span className="fraud-icon">🛡️</span>
              <div>
                <p className="fraud-number">{fraud.blockedPromoAttempts || 0}</p>
                <span className="fraud-desc">Заблокованих спроб абузу промокодів (мультиакаунти)</span>
              </div>
            </div>
            <div className="fraud-kpi">
              <span className="fraud-icon">📱</span>
              <div>
                <p className="fraud-number">{fraud.suspiciousDevicesCount || 0}</p>
                <span className="fraud-desc">Пристроїв з декількома різними номерами телефонів</span>
              </div>
            </div>
          </div>
          <div className="analytics-help-text" style={{ borderLeftColor: '#ef4444', minHeight: 'auto', marginTop: '1rem' }}>
            <span><strong>Захист бюджету:</strong> Система фіксує цифровий відбиток `device_id` і забороняє повторну активацію вітальних промокодів при зміні SIM-карти.</span>
          </div>
        </div>
      </div>

      {/* БЛОК 3: Когортний аналіз утримання (Rides Retention Matrix) */}
      <div className="analytics-section" style={{ marginBottom: '1.5rem', height: 'auto' }}>
        <div className="table-card">
          <div className="card-header-badge" style={{ padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Когортний ретеншн повторних поїздок (Rides Retention Matrix)
            </h3>
            <span className="unit-tag tag-purple">Weekly Cohorts</span>
          </div>
          <div className="table-responsive">
            <table className="main-table cohort-table">
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Когорта (Тиждень рег.)</th>
                  <th className="text-center" style={{ width: '15%' }}>Користувачів</th>
                  <th className="text-center" style={{ width: '20%' }}>2-га поїздка (Ціль &ge; 30%)</th>
                  <th className="text-center" style={{ width: '20%' }}>3-тя поїздка (Ціль &ge; 20%)</th>
                  <th className="text-center" style={{ width: '25%' }}>5+ поїздок (Ядро клієнтів)</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.length > 0 ? (
                  cohorts.map((cohort, idx) => (
                    <tr key={idx}>
                      <td><strong>{cohort.cohortWeek}</strong></td>
                      <td className="text-center font-medium">{cohort.totalUsers} клієнтів</td>
                      <td className="text-center">
                        <span className={`retention-pill ${cohort.ride2RetentionPercent >= 30 ? 'pill-green' : cohort.ride2RetentionPercent >= 15 ? 'pill-yellow' : 'pill-red'}`}>
                          {cohort.ride2RetentionPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`retention-pill ${cohort.ride3RetentionPercent >= 20 ? 'pill-green' : cohort.ride3RetentionPercent >= 10 ? 'pill-yellow' : 'pill-red'}`}>
                          {cohort.ride3RetentionPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`retention-pill ${cohort.ride5PlusRetentionPercent >= 15 ? 'pill-green' : 'pill-blue'}`}>
                          {cohort.ride5PlusRetentionPercent.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center text-subtle py-6">
                      Дані для когортної матриці накопичуються
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="analytics-help-text" style={{ borderLeftColor: '#8b5cf6', minHeight: 'auto' }}>
          <span><strong>Як читати таблицю:</strong> Користувачі розбиті за тижнями першої поїздки. Якщо відсоток 2-ї поїздки падає нижче 30%, потрібно посилювати тригерний пуш-маркетинг (знижка через 48 год після 1-ї поїздки).</span>
        </div>
      </div>

      {/* БЛОК 4: Тарифи та Джерела трафіку */}
      <div className="analytics-tables-grid">
        <div className="analytics-section">
          <div className="table-card">
            <h3 className="table-card-title">
              Популярність тарифів та Маржинальність
            </h3>
            <div className="table-responsive">
              <table className="main-table tariff-table">
                <thead>
                  <tr>
                    <th style={{ width: '40%', textAlign: 'left' }}>Тариф</th>
                    <th style={{ width: '25%', textAlign: 'center' }}>Поїздки</th>
                    <th style={{ width: '35%', textAlign: 'right' }}>Виторг</th>
                  </tr>
                </thead>
                <tbody>
                  {general.tariffStats && general.tariffStats.length > 0 ? (
                    general.tariffStats.map((tariff, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'left' }}>
                          <strong className="font-medium">{tariff.tariffName}</strong>
                        </td>
                        <td style={{ textAlign: 'center' }} className="font-medium">
                          {tariff.orderCount}
                        </td>
                        <td style={{ textAlign: 'right' }} className="font-medium text-success">
                          {formatMoney(tariff.totalRevenue)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3" className="text-center text-subtle py-4">Дані відсутні</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="analytics-section">
          <div className="table-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, padding: '1rem 1rem 0.5rem 1rem', margin: 0, color: '#0f172a' }}>
              Джерела трафіку (Маркетингова атрибуція)
            </h3>
            <div className="table-responsive">
              <table className="main-table">
                <thead>
                  <tr>
                    <th style={{ width: '32%' }}>Source</th>
                    <th style={{ width: '22%' }}>Medium</th>
                    <th style={{ width: '26%' }}>Campaign</th>
                    <th className="text-center" style={{ width: '20%' }}>К-сть</th>
                  </tr>
                </thead>
                <tbody>
                  {general.trafficStats && general.trafficStats.length > 0 ? (
                    general.trafficStats.map((traffic, idx) => (
                      <tr key={idx}>
                        <td style={{ width: '32%' }}><span className="traffic-badge" title={traffic.source}>{traffic.source}</span></td>
                        <td style={{ width: '22%' }}><code className="traffic-code" title={traffic.medium}>{traffic.medium}</code></td>
                        <td style={{ width: '26%' }}><span className="traffic-campaign" title={traffic.campaign}>{traffic.campaign}</span></td>
                        <td className="text-center font-medium" style={{ width: '20%' }}>{traffic.userCount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="text-center text-subtle py-4">Дані відсутні</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* БЛОК 5: Скасування */}
      <div className="analytics-section" style={{ marginBottom: '1.5rem', height: 'auto' }}>
        <div className="table-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, padding: '1rem 1.25rem 0.5rem 1.25rem', margin: 0, color: '#0f172a' }}>
            Причини скасування замовлень клієнтами
          </h3>
          <div className="table-responsive">
            <table className="main-table">
              <thead>
                <tr>
                  <th>Причина скасування</th>
                  <th className="text-center" style={{ width: '160px' }}>Кількість випадків</th>
                  <th>Відсоткове співвідношення</th>
                </tr>
              </thead>
              <tbody>
                {general.clientCancellationStats && general.clientCancellationStats.length > 0 ? (
                  general.clientCancellationStats.map((item, idx) => (
                    <tr key={idx}>
                      <td><strong className="font-medium">{item.reason}</strong></td>
                      <td className="text-center font-medium">{item.count} разів</td>
                      <td>
                        <div className="time-bar-container">
                          <div 
                            className="time-bar" 
                            style={{ 
                              width: `${item.percentage}%`,
                              backgroundColor: idx === 0 ? '#ef4444' : '#f87171'
                            }}
                          />
                          <span className={idx === 0 ? 'font-medium text-danger' : 'text-subtle'}>
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center text-subtle py-6">
                      Дані про скасування замовлень клієнтами поки що відсутні
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* БЛОК 6: Продуктова воронка та дії */}
      <div className="analytics-section" style={{ marginBottom: '1.5rem', height: 'auto' }}>
        <div className="table-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#0f172a' }}>
            Цільові дії та лінійка конверсії додатку пасажира
          </h3>
          
          <div className="funnel-list">
            <div className="funnel-step" style={{ borderLeft: '5px solid #0284c7' }}>
              <p style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: '#0f172a' }}>
                Подія/Клік: <strong className="font-medium">tariffs_view</strong>
              </p>
              <p style={{ margin: '0 0 0.3rem 0', color: '#ef4444', fontWeight: '600', fontSize: '0.9rem' }}>
                Відсоток відвалу користувачів після розрахунку ціни: <strong>{totalDropOffRate}%</strong>
              </p>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Кількість розрахунків: <strong>{tariffsViewCount}</strong> разів
              </p>
            </div>

            <div className="funnel-step" style={{ borderLeft: '5px solid #f59e0b', background: '#f8fafc', marginLeft: '1.25rem' }}>
              <p style={{ margin: '0 0 0.3rem 0', color: '#0f172a', fontSize: '0.9rem' }}>
                Додаткова активність: <strong className="font-medium">tariff_select</strong> (Зміна тарифу вручну)
              </p>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Всього перемикань між тарифами: <strong>{tariffSelectCount}</strong> разів
              </p>
            </div>

            <div className="funnel-step" style={{ borderLeft: '5px solid #10b981' }}>
              <p style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: '#0f172a' }}>
                Подія/Клік: <strong className="font-medium">click_order</strong>
              </p>
              <p style={{ margin: '0 0 0.3rem 0', color: '#10b981', fontWeight: '600', fontSize: '0.9rem' }}>
                Конверсія в оформлене замовлення: <strong>{(100 - parseFloat(totalDropOffRate)).toFixed(1)}%</strong>
              </p>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Кількість викликів: <strong>{clickOrderCount}</strong> разів
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;