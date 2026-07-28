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
        console.error("Помилка завантаження аналітики:", err);
        setError("Не вдалося завантажити аналітичні дані");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading-spinner">Завантаження продуктової аналітики...</div>;
  if (error) return <div className="alert alert-danger mb-3">{error}</div>;

  const formatMoney = (value) => {
    if (value === undefined || value === null) return '0 ₴';
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₴";
  };

  const getActionCount = (name) => {
    if (!data || !data.actionStats) return 0;
    return data.actionStats
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
          <h1>Продуктова та Маркетингова Аналітика</h1>
        </div>
      </header>

      {/* БЛОК 1: KPI Метрики */}
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
          <p className="kpi-value">{data.conversionRate ? data.conversionRate.toFixed(2) : '0.00'} %</p>
        </div>
        <div className="kpi-card fulfillment">
          <h3 style={{ color: '#166534' }}>Виконання (Fulfillment)</h3>
          <p className="kpi-value" style={{ color: '#15803d' }}>{data.fulfillmentRate ? data.fulfillmentRate.toFixed(1) : '0.0'} %</p>
        </div>
      </div>
      
      <div className="analytics-help-text" style={{ marginBottom: '1.5rem', borderLeftColor: '#64748b', minHeight: 'auto' }}>
        <span><strong>Що це показує:</strong> Головні фінансові та операційні показники компанії.<br />
        • <u>Середній чек</u> — скільки в середньому коштує одна поїздка пасажира.<br />
        • <u>Загальний дохід</u> — вся сума брудного виторгу за виконані замовлення.<br />
        • <u>Середній LTV</u> — скільки грошей приносить один активний клієнт за весь час роботи з додатком.<br />
        • <u>Конверсія в замовлення</u> — який відсоток зареєстрованих користувачів зробив хоча б один успішний заказ.<br />
        • <strong><u>Виконання замовлень (Fulfillment)</u></strong> — відсоток успішно завершених поїздок (COMPLETED) від усіх створених у системі.</span>
      </div>

      <div className="analytics-tables-grid">
        {/* БЛОК 2: Тарифи */}
        <div className="analytics-section">
          <div className="table-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, padding: '1rem 1rem 0.5rem 1rem', margin: 0, color: '#0f172a' }}>
              Популярність тарифів та Маржинальність
            </h3>
            <div className="table-responsive">
              <table className="main-table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Назва тарифу</th>
                    <th className="text-center" style={{ width: '25%' }}>К-сть поїздок</th>
                    <th className="text-right" style={{ width: '35%', paddingRight: '1rem' }}>Загальний виторг</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tariffStats && data.tariffStats.length > 0 ? (
                    data.tariffStats.map((tariff, idx) => (
                      <tr key={idx}>
                        <td style={{ width: '40%' }}><strong className="font-medium">{tariff.tariffName}</strong></td>
                        <td className="text-center font-medium" style={{ width: '25%' }}>{tariff.orderCount}</td>
                        <td className="text-right font-medium text-success" style={{ width: '35%', paddingRight: '1rem' }}>
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
          
          <div className="analytics-help-text" style={{ borderLeftColor: '#f59e0b' }}>
            <span><strong>Простими словами:</strong> Показує, який клас автомобілів користується найбільшим попитом у пасажирів і генерує основний виторг компанії.</span>
          </div>
        </div>

        {/* БЛОК 3: Трафик */}
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
                  {data.trafficStats && data.trafficStats.length > 0 ? (
                    data.trafficStats.map((traffic, idx) => (
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
          
          <div className="analytics-help-text" style={{ borderLeftColor: '#0284c7' }}>
            <span><strong>Простими словами:</strong> Розподіл зареєстрованих пасажирів за каналами залучення (Facebook, Google, реферальні коди або прямі завантаження).</span>
          </div>
        </div>
      </div>

      {/* БЛОК 4: Скасування */}
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
                {data.clientCancellationStats && data.clientCancellationStats.length > 0 ? (
                  data.clientCancellationStats.map((item, idx) => (
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
        
        <div className="analytics-help-text" style={{ borderLeftColor: '#ef4444', minHeight: 'auto' }}>
          <span><strong>Простими словами:</strong> Рейтинг проблем, через які пасажири змушені скасовувати активні замовлення. Найвища смужка вказує на критичне «вузьке місце» сервісу.</span>
        </div>
      </div>

      {/* БЛОК 5: Екрани */}
      <div className="analytics-section" style={{ marginBottom: '1.5rem', height: 'auto' }}>
        <div className="table-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, padding: '1rem 1.25rem 0.5rem 1.25rem', margin: 0, color: '#0f172a' }}>
            Аналітика екранів додатка (Поведінка користувачів та Екрани Дропу)
          </h3>
          <div className="table-responsive">
            <table className="main-table">
              <thead>
                <tr>
                  <th>Назва екрану додатка пасажира</th>
                  <th className="text-center" style={{ width: '180px' }}>Кількість відвідувань</th>
                  <th>Середній час на екрані</th>
                </tr>
              </thead>
              <tbody>
                {data.screenStats && data.screenStats.length > 0 ? (
                  data.screenStats.map((screen, idx) => (
                    <tr key={idx}>
                      <td><code className="traffic-code">{screen.screenName}</code></td>
                      <td className="text-center font-medium">{screen.visitCount} разів</td>
                      <td>
                        <div className="time-bar-container">
                          <div 
                            className="time-bar" 
                            style={{ width: `${Math.min(screen.averageDurationSeconds * 2, 100)}%` }}
                          />
                          <span className="font-medium">{screen.averageDurationSeconds.toFixed(1)} сек</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="3" className="text-center text-subtle py-6">Дані відсутні</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="analytics-help-text" style={{ borderLeftColor: '#8b5cf6', minHeight: 'auto' }}>
          <span><strong>Простими словами:</strong> Показує екрани пасажирського додатка, на яких користувачі затримуються найдовше.</span>
        </div>
      </div>

      {/* БЛОК 6: Воронка */}
      <div className="analytics-section" style={{ marginBottom: '1.5rem', height: 'auto' }}>
        <div className="table-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#0f172a' }}>
            Цільові дії та лінійка конверсії додатка пасажира
          </h3>
          
          <div className="funnel-list">
            <div className="funnel-step" style={{ borderLeft: '5px solid #0284c7' }}>
              <p style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: '#0f172a' }}>
                Подія/Клік: <strong className="font-medium">tariffs_view</strong>
              </p>
              <p style={{ margin: '0 0 0.3rem 0', color: '#ef4444', fontWeight: '600', fontSize: '0.9rem' }}>
                Відсоток відвалу користувачів після цієї події: <strong>{totalDropOffRate}%</strong>
              </p>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Кількість взаємодій: <strong>{tariffsViewCount}</strong> разів
              </p>
            </div>

            <div className="funnel-step" style={{ borderLeft: '5px solid #f59e0b', background: '#f8fafc', marginLeft: '1.25rem' }}>
              <p style={{ margin: '0 0 0.3rem 0', color: '#0f172a', fontSize: '0.9rem' }}>
                Додаткова активність: <strong className="font-medium">tariff_select</strong> (Зміна тарифу вручну)
              </p>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Всього перемикань між тарифами в додатку: <strong>{tariffSelectCount}</strong> разів
              </p>
            </div>

            <div className="funnel-step" style={{ borderLeft: '5px solid #10b981' }}>
              <p style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: '#0f172a' }}>
                Подія/Клік: <strong className="font-medium">click_order</strong>
              </p>
              <p style={{ margin: '0 0 0.3rem 0', color: '#10b981', fontWeight: '600', fontSize: '0.9rem' }}>
                Конверсія в замовлення: <strong>{(100 - parseFloat(totalDropOffRate)).toFixed(1)}%</strong>
              </p>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Кількість взаємодій: <strong>{clickOrderCount}</strong> разів (Замовлення успішно сформовано)
              </p>
            </div>

            {data.actionStats && data.actionStats.filter(a => !['tariffs_view', 'tariff_select', 'click_order'].includes(a.actionName)).length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#475569' }}>
                  Інші додаткові кліки:
                </h4>
                <div className="table-responsive">
                  <table className="main-table">
                    <thead>
                      <tr>
                        <th>Назва події</th>
                        <th>Значення / Контекст</th>
                        <th className="text-center">Кількість взаємодій</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.actionStats.filter(a => !['tariffs_view', 'tariff_select', 'click_order'].includes(a.actionName)).map((action, idx) => (
                        <tr key={idx}>
                          <td><code className="traffic-code">{action.actionName}</code></td>
                          <td><span className="traffic-campaign">{action.actionValue || 'без параметра'}</span></td>
                          <td className="text-center font-medium">{action.count} разів</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="analytics-help-text" style={{ borderLeftColor: '#10b981', minHeight: 'auto' }}>
          <span><strong>Простими словами:</strong> Продуктова воронка цільових дій пасажира.<br />
          • <u>tariffs_view</u> вказує, що людина ввела адресу А і Б та побачила розрахунок цін.<br />
          • <u>click_order</u> — людина успішно натиснула на кнопку виклику авто.<br />
          • <u>Відсоток відвалу</u> демонструє частку людей, які відкрили додаток, дізналися ціну, але закрили його.</span>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;