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

  if (loading) return <div className="analytics-loading">Завантаження продуктової аналітики...</div>;
  if (error) return <div className="analytics-error">{error}</div>;

  // Хелпер для красивого форматування грошей з пробілами (11 700 ₴)
  const formatMoney = (value) => {
    if (value === undefined || value === null) return '0 ₴';
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₴";
  };

  // --- ЛОГІКА АГРЕГАЦІЇ ДЛЯ ПРАВИЛЬНОЇ ВОРОНКИ КОНВЕРСІЇ ---
  const getActionCount = (name) => {
    if (!data || !data.actionStats) return 0;
    return data.actionStats
      .filter(item => item.actionName === name)
      .reduce((sum, item) => sum + item.count, 0);
  };

  const tariffsViewCount = getActionCount('tariffs_view');
  const tariffSelectCount = getActionCount('tariff_select');
  const clickOrderCount = getActionCount('click_order');

  // ЧИСТИЙ ВІДВАЛ: Скільки людей побачили ціни, але ТАК І НЕ НАЖАЛИ "Замовити"
  const totalDropOffRate = tariffsViewCount > 0 
    ? Math.max(0, ((tariffsViewCount - clickOrderCount) / tariffsViewCount) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="analytics-container">
      <h2>Продуктова та Маркетингова Аналітика 📊</h2>

      {/* БЛОК 1: Картки головних метрик (KPI) */}
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
        <div className="kpi-card fulfillment" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <h3 style={{ color: '#166534' }}>Виконання замовлень (Fulfillment)</h3>
          <p className="kpi-value" style={{ color: '#15803d' }}>{data.fulfillmentRate ? data.fulfillmentRate.toFixed(1) : '0.0'} %</p>
        </div>
      </div>
      
      {/* Підказка для Блоку 1 */}
      <div className="analytics-help-text" style={{ margin: '-10px 0 25px 0', padding: '12px 15px', background: '#f8f9fa', borderRadius: '6px', fontSize: '0.88rem', color: '#555', borderLeft: '4px solid #6c757d', lineHeight: '1.4' }}>
        💡 <strong>Що це показує:</strong> Головні фінансові та операційні показники компанії. <br />
        • <u>Середній чек</u> — скільки в середньому коштує одна поїздка пасажира. <br />
        • <u>Загальний дохід</u> — вся сума брудного виторгу за виконані замовлення. <br />
        • <u>Середній LTV</u> — скільки грошей приносить один активний клієнт за весь час роботи з додатком. <br />
        • <u>Конверсія в замовлення</u> — маркетинговий показник: який відсоток зареєстрованих користувачів зробив хоча б один успішний заказ. <br />
        • <strong><u>Виконання замовлень (Fulfillment)</u></strong> — операційний відсоток поїздок, які завершилися успішно (статус COMPLETED) від усіх створених у системі замовлень. Якщо він низький — водії масово скасовують замовлення або в місті критично бракує вільних машин.
      </div>

      <div className="analytics-tables-grid">
        {/* БЛОК 2: Товарна (Тарифна) аналітика */}
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
              {data.tariffStats && data.tariffStats.map((tariff, idx) => (
                <tr key={idx}>
                  <td><strong>{tariff.tariffName}</strong></td>
                  <td>{tariff.orderCount}</td>
                  <td>{formatMoney(tariff.totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="analytics-help-text" style={{ marginTop: '12px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '6px', fontSize: '0.85rem', color: '#555', borderLeft: '4px solid #ff9800', lineHeight: '1.4' }}>
            ℹ️ <strong>Простими словами:</strong> Показує, який клас автомобілів (Економ, Стандарт, Бізнес) користується найбільшим попитом у пасажирів і генерує основний виторг компанії. Допомагає коригувати тарифну сітку.
          </div>
        </div>

        {/* БЛОК 3: Джерела маркетингового трафіку */}
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
              {data.trafficStats && data.trafficStats.map((traffic, idx) => (
                <tr key={idx}>
                  <td><span className="traffic-badge">{traffic.source}</span></td>
                  <td><code className="traffic-code">{traffic.medium}</code></td>
                  <td><span className="traffic-campaign">{traffic.campaign}</span></td>
                  <td><strong>{traffic.userCount}</strong> користувачів</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="analytics-help-text" style={{ marginTop: '12px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '6px', fontSize: '0.85rem', color: '#555', borderLeft: '4px solid #00bcd4', lineHeight: '1.4' }}>
            ℹ️ <strong>Простими словами:</strong> Розподіл зареєстрованих пасажирів за каналами залучення (реклама у Facebook, Google, реферальні коди або органічне пряме завантаження). Допомагає оцінити ефективність маркетингового бюджету.
          </div>
        </div>
      </div>

      {/* БЛОК 4: Аналітика скасувань клієнтами */}
      <div className="analytics-section full-width" style={{ marginTop: '25px' }}>
        <h3>⛔ Причини скасування замовлень клієнтами</h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Причина скасування</th>
              <th>Кількість випадків</th>
              <th>Відсоткове співвідношення</th>
            </tr>
          </thead>
          <tbody>
            {data.clientCancellationStats && data.clientCancellationStats.map((item, idx) => (
              <tr key={idx}>
                <td><strong>{item.reason}</strong></td>
                <td>{item.count} разів</td>
                <td>
                  <div className="time-bar-container">
                    <div 
                      className="time-bar" 
                      style={{ 
                        width: `${item.percentage}%`,
                        backgroundColor: idx === 0 ? '#d32f2f' : '#ef5350'
                      }}
                    >
                    </div>
                    <span style={{ fontWeight: idx === 0 ? 'bold' : 'normal' }}>
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {(!data.clientCancellationStats || data.clientCancellationStats.length === 0) && (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  Дані про скасування замовлень клієнтами поки що відсутні
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        <div className="analytics-help-text" style={{ marginTop: '12px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '6px', fontSize: '0.85rem', color: '#555', borderLeft: '4px solid #e53935', lineHeight: '1.4' }}>
          ℹ️ <strong>Простими словами:</strong> Рейтинг проблем, через які пасажири змушені скидати активні замовлення. Головна смужка (найвища і темна) вказує на критичне "вузьке місце" сервісу. Наприклад, якщо лідирує "Довге очікування", компанії терміново потрібні нові водії.
        </div>
      </div>

      {/* БЛОК 5: Поведінка користувачів та екрани відвалу */}
      <div className="analytics-section full-width" style={{ marginTop: '25px' }}>
        <h3>Аналітика екранів додатка (Поведінка користувачів та Екрани Дропу)</h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Назва екрану додатка пасажира</th>
              <th>Кількість відвідувань</th>
              <th>Середній час на екрані</th>
            </tr>
          </thead>
          <tbody>
            {data.screenStats && data.screenStats.map((screen, idx) => (
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
        
        <div className="analytics-help-text" style={{ marginTop: '12px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '6px', fontSize: '0.85rem', color: '#555', borderLeft: '4px solid #9c27b0', lineHeight: '1.4' }}>
          ℹ️ <strong>Простими словами:</strong> Показує екрани пасажирського додатка, на яких користувачі затримуються найдовше. Допомагає зрозуміти продуктовій команді, де клієнт стикається з труднощами в інтерфейсі.
        </div>
      </div>

      {/* БЛОК 6: Цільові дії та лінійка конверсії */}
      <div className="analytics-section full-width" style={{ marginTop: '25px', marginBottom: '20px' }}>
        <h3>Цільові дії та лінійка конверсії додатка пасажира 📈</h3>
        <div className="funnel-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
          
          {/* Етап 1: Перегляд цін */}
          <div className="funnel-step" style={{ padding: '15px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e0e0e0', borderLeft: '5px solid #00b0ff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <p style={{ margin: '5px 0', fontSize: '1.1rem', color: '#222222' }}>Подія/Клік: <strong>tariffs_view</strong></p>
            <p style={{ margin: '5px 0', color: '#d32f2f', fontWeight: '500' }}>Відсоток відвалу користувачів після цієї події: <strong>{totalDropOffRate}%</strong></p>
            <p style={{ margin: '5px 0', color: '#666666' }}>Кількість взаємодій: <strong>{tariffsViewCount}</strong> разів</p>
          </div>

          {/* Інформаційна плашка про кліки по тарифам (всередині воронки) */}
          <div className="funnel-step" style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #e0e0e0', borderLeft: '5px solid #fbc02d', marginLeft: '20px', fontStyle: 'italic' }}>
            <p style={{ margin: '5px 0', color: '#222222' }}>Додаткова активність: <strong>tariff_select</strong> (Зміна тарифу вручну)</p>
            <p style={{ margin: '5px 0', color: '#666666' }}>Всього перемикань між тарифами в додатку: <strong>{tariffSelectCount}</strong> разів</p>
          </div>

          {/* Етап 2: Фінальний заказ */}
          <div className="funnel-step" style={{ padding: '15px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e0e0e0', borderLeft: '5px solid #388e3c', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <p style={{ margin: '5px 0', fontSize: '1.1rem', color: '#222222' }}>Подія/Клік: <strong>click_order</strong></p>
            <p style={{ margin: '5px 0', color: '#388e3c', fontWeight: '500' }}>Конверсія в замовлення: <strong>{(100 - parseFloat(totalDropOffRate)).toFixed(1)}%</strong></p>
            <p style={{ margin: '5px 0', color: '#666666' }}>Кількість взаємодій: <strong>{clickOrderCount}</strong> разів (Замовлення успішно сформовано)</p>
          </div>

          {/* Додатковий блок для інших кліків */}
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

        <div className="analytics-help-text" style={{ marginTop: '12px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '6px', fontSize: '0.85rem', color: '#555', borderLeft: '4px solid #388e3c', lineHeight: '1.4' }}>
          ℹ️ <strong>Простими словами:</strong> Продуктова воронка цільових дій пасажира. <br />
          • <u>tariffs_view</u> вказує, що людина ввела адресу А і Б та побачила розрахунок цін. <br />
          • <u>click_order</u> — людина успішно клікнула на кнопку виклика авто. <br />
          • <u>Відсоток відвалу</u> демонструє частку людей, які відкрили додаток, дізналися ціну, але закрили його (через занадто високу вартість або тривалий час пошуку машини).
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;