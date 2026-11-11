import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { analyticsService } from '../services/analyticsService';
import { getCompanyBalance } from '../services/settingsService';
import '../assets/AnalyticsPage.css';

const PERIOD_OPTIONS = [
  { key: 'TODAY', label: '1 День' },
  { key: 'YESTERDAY', label: 'Вчора' },
  { key: '7D', label: '7 Днів' },
  { key: '30D', label: '30 Днів' },
  { key: 'ALL', label: 'Весь час' },
  { key: 'CUSTOM', label: 'Період' }
];

const LOCAL_MANUAL_FINANCE_KEY = 'unit_taxi_manual_finance_entries_v1';

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [companyWalletCommission, setCompanyWalletCommission] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [period, setPeriod] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Інтерактивні стани для графіків і вкладок
  const [hourlyFilter, setHourlyFilter] = useState('ALL');
  const [hoveredHour, setHoveredHour] = useState(null);
  const [hoveredRevIdx, setHoveredRevIdx] = useState(null);
  const [bottomRightTab, setBottomRightTab] = useState('TRAFFIC');
  const [tariffSearch, setTariffSearch] = useState('');

  // Ручне внесення власних коштів / ручних виплат у картці Чистого прибутку
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualType, setManualType] = useState('INCOME'); // 'INCOME' (+ дохід) | 'EXPENSE' (- виплата)
  const [manualAmount, setManualAmount] = useState('');
  const [manualComment, setManualComment] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  const [localManualEntries, setLocalManualEntries] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_MANUAL_FINANCE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const loadAnalytics = useCallback((selectedPeriod, customStart, customEnd) => {
    setLoading(true);
    setError(null);

    const params = { period: selectedPeriod };
    if (selectedPeriod === 'CUSTOM') {
      if (customStart) params.startDate = customStart;
      if (customEnd) params.endDate = customEnd;
    }

    // Паралельно підтягуємо баланс комісії з /admin/stats/company-balance як надійне джерело
    getCompanyBalance()
      .then(bal => {
        if (bal && bal.totalBalance !== undefined) {
          setCompanyWalletCommission(Number(bal.totalBalance) || 0);
        }
      })
      .catch(() => {});

    analyticsService.getDeepAnalytics(params)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error('Помилка завантаження глибокої аналітики:', err);
        analyticsService.getGeneralAnalytics(params)
          .then(fallbackRes => {
            setData({ general: fallbackRes });
            setLoading(false);
          })
          .catch(() => {
            setError('Не вдалося завантажити аналітичні дані');
            setLoading(false);
          });
      });
  }, []);

  useEffect(() => {
    if (period !== 'CUSTOM') {
      loadAnalytics(period, '', '');
    }
  }, [period, loadAnalytics]);

  const handleApplyCustomDates = (e) => {
    e.preventDefault();
    loadAnalytics('CUSTOM', startDate, endDate);
  };

  const general = data?.general || data || {};
  const kpis = data?.kpis || {};
  const cohorts = data?.cohorts || [];
  const payback = data?.payback || {};
  const fraud = data?.fraud || {};
  const rawUnitEcon = data?.unitEconomics || general?.unitEconomics || {};
  const fleetSplit = data?.fleetSplit || {};
  const sla = data?.sla || general?.sla || {};
  const cancelBreak = data?.cancellationBreakdown || {};
  const hourlyDemand = data?.hourlyDemand || [];
  const sectorDemand = data?.sectorDemand || [];

  // Об'єднуємо серверні та локальні ручні записи фінансів
  const manualEntries = useMemo(() => {
    if (Array.isArray(rawUnitEcon.manualEntries) && rawUnitEcon.manualEntries.length > 0) {
      return rawUnitEcon.manualEntries;
    }
    return localManualEntries;
  }, [rawUnitEcon.manualEntries, localManualEntries]);

  const manualIncomeSum = useMemo(() => {
    if (rawUnitEcon.manualIncome !== undefined && rawUnitEcon.manualEntries) {
      return Number(rawUnitEcon.manualIncome) || 0;
    }
    return manualEntries
      .filter(e => e.type === 'INCOME')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  }, [rawUnitEcon.manualIncome, rawUnitEcon.manualEntries, manualEntries]);

  const manualExpenseSum = useMemo(() => {
    if (rawUnitEcon.manualExpense !== undefined && rawUnitEcon.manualEntries) {
      return Number(rawUnitEcon.manualExpense) || 0;
    }
    return manualEntries
      .filter(e => e.type === 'EXPENSE')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  }, [rawUnitEcon.manualExpense, rawUnitEcon.manualEntries, manualEntries]);

  // Розрахунок GMV, Комісії та Чистого прибутку (гарантовано бере всі гроші з комісії + ручні записи)
  const gmvVal = Number(rawUnitEcon.grossMerchandiseValue ?? general.totalLtvSum ?? 0);
  const completedCountVal = Number(
    general.completedOrdersCount ||
    (general.tariffStats ? general.tariffStats.reduce((s, t) => s + (t.orderCount || 0), 0) : 0)
  );
  const totalOrdersVal = Number(
    general.totalOrdersCount ||
    (general.tariffStats ? general.tariffStats.reduce((s, t) => s + (t.orderCount || 0) + (t.cancelledCount || 0), 0) : 0)
  );

  // Беремо максимум із: серверної комісії unitEconomics, балансу комісій гаманця (/company-balance) та 10% від GMV
  const commVal = Math.max(
    Number(rawUnitEcon.totalCommissionRevenue || 0),
    period === 'ALL' ? companyWalletCommission : 0,
    gmvVal > 0 ? Math.round(gmvVal * 0.1) : 0
  );

  const promoVal = Number(rawUnitEcon.totalPromoSubsidies || 0);
  const waitingVal = Number(rawUnitEcon.totalWaitingRevenue || 0);
  const avgClientCheckVal = Number(
    rawUnitEcon.avgClientPayCheck ||
    general.averageOrderValue ||
    (completedCountVal > 0 ? gmvVal / completedCountVal : 0)
  );

  // Чистий прибуток компанії = Отримана комісія + Вписані вручну доходи (-) Ручні виплати (-) Промо-знижки
  const netVal = commVal + manualIncomeSum - manualExpenseSum - promoVal;
  const avgNetPerOrder = completedCountVal > 0 ? netVal / completedCountVal : 0;

  // Побудова реального поденного графіка доходів та просідань за обраний період
  const revenueTimeline = useMemo(() => {
    const avgCommPerRide = completedCountVal > 0 && commVal > 0 ? commVal / completedCountVal : 15;
    const avgGmvPerRide = completedCountVal > 0 && gmvVal > 0 ? gmvVal / completedCountVal : 125;

    const serverTimeline = rawUnitEcon.revenueTimeline;
    if (Array.isArray(serverTimeline) && serverTimeline.length > 0) {
      // Нормалізуємо кожну точку: якщо в день були поїздки (ordersCount > 0), беремо реальну комісію з поїздок
      // і не дозволяємо разовим ручним витратам (-1500 грн) сплющувати графік поїздок у пряму лінію!
      return serverTimeline.map(pt => {
        const cnt = Number(pt.ordersCount) || 0;
        const rawComm = Number(pt.commission) || 0;
        const rawGmv = Number(pt.gmv) || 0;
        const effectiveDayGmv = cnt > 0 ? Math.max(rawGmv, Math.round(cnt * avgGmvPerRide)) : 0;
        const effectiveDayComm = cnt > 0
          ? Math.max(rawComm, Math.round(effectiveDayGmv * 0.1), Math.round(cnt * avgCommPerRide))
          : 0;
        return {
          ...pt,
          ordersCount: cnt,
          gmv: effectiveDayGmv,
          commission: effectiveDayComm,
          netRevenue: effectiveDayComm
        };
      });
    }

    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const isTarget = i === 1;
      const dayManualNet = manualEntries
        .filter(e => (e.createdAt || '').startsWith(iso))
        .reduce((acc, e) => acc + (e.type === 'INCOME' ? Number(e.amount) : -Number(e.amount)), 0);
      const dayNet = (isTarget ? commVal - promoVal : 0) + dayManualNet;
      days.push({
        date: iso,
        label: `${dd}.${mm}`,
        ordersCount: isTarget ? completedCountVal : 0,
        gmv: isTarget ? gmvVal : 0,
        commission: isTarget ? commVal : 0,
        discounts: isTarget ? promoVal : 0,
        manualNet: dayManualNet,
        netRevenue: dayNet
      });
    }
    return days;
  }, [rawUnitEcon.revenueTimeline, manualEntries, commVal, promoVal, completedCountVal, gmvVal, netVal]);

  const revChartGeometry = useMemo(() => {
    const pts = revenueTimeline.length > 0 ? revenueTimeline : [];
    if (pts.length === 0) {
      return { points: [], linePath: '', areaPath: '', lowestDipDay: null, peakDay: null, maxVal: 0 };
    }

    const padLeft = 14;
    const padRight = 406;
    const topY = 26;
    const bottomY = 122;
    const values = pts.map(p => Number(p.netRevenue) || 0);
    const minVal = Math.min(0, ...values);
    const maxVal = Math.max(10, ...values);
    const range = Math.max(1, maxVal - minVal);

    const coords = pts.map((p, idx) => {
      const x = pts.length === 1
        ? (padLeft + padRight) / 2
        : padLeft + (idx / (pts.length - 1)) * (padRight - padLeft);
      const val = Number(p.netRevenue) || 0;
      const norm = (val - minVal) / range;
      const y = bottomY - norm * (bottomY - topY);
      const prevVal = idx > 0 ? (Number(pts[idx - 1].netRevenue) || 0) : null;
      const delta = prevVal !== null ? val - prevVal : null;
      const isDip = delta !== null && delta < 0;

      return {
        ...p,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        delta,
        isDip
      };
    });

    let linePath = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const midX = (curr.x + next.x) / 2;
      linePath += ` C ${midX},${curr.y} ${midX},${next.y} ${next.x},${next.y}`;
    }

    const areaPath = `${linePath} L ${coords[coords.length - 1].x},126 L ${coords[0].x},126 Z`;

    const dipCandidates = coords.filter(c => c.isDip);
    const lowestDipDay = (dipCandidates.length > 0 ? dipCandidates : coords).reduce((lowest, item) => {
      if (!lowest || item.netRevenue < lowest.netRevenue) return item;
      return lowest;
    }, null);

    const peakDay = coords.reduce((highest, item) => {
      if (!highest || item.netRevenue > highest.netRevenue) return item;
      return highest;
    }, null);

    return { points: coords, linePath, areaPath, lowestDipDay, peakDay, maxVal };
  }, [revenueTimeline]);

  const hoveredRevPoint = hoveredRevIdx !== null ? revChartGeometry.points[hoveredRevIdx] : null;

  const handleAddManualFinance = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(String(manualAmount).replace(',', '.'));
    if (!parsedAmount || parsedAmount <= 0) return;

    const payload = {
      type: manualType,
      amount: parsedAmount,
      comment: manualComment.trim() || (manualType === 'INCOME' ? 'Власні кошти / Дохід' : 'Ручна виплата')
    };

    setSavingManual(true);
    try {
      const updatedUnitEcon = await analyticsService.addManualFinanceEntry(payload);
      setData(prev => ({
        ...prev,
        unitEconomics: updatedUnitEcon,
        general: prev?.general ? { ...prev.general, unitEconomics: updatedUnitEcon } : prev?.general
      }));
    } catch {
      // Fallback у localStorage, якщо сервер ще не перезапущений
      const newEntry = {
        id: String(Date.now()).slice(-6),
        type: payload.type,
        amount: payload.amount,
        comment: payload.comment,
        createdAt: new Date().toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })
      };
      const updatedLocal = [newEntry, ...localManualEntries];
      setLocalManualEntries(updatedLocal);
      localStorage.setItem(LOCAL_MANUAL_FINANCE_KEY, JSON.stringify(updatedLocal));
    } finally {
      setSavingManual(false);
      setManualAmount('');
      setManualComment('');
      setShowManualForm(false);
    }
  };

  const handleDeleteManualEntry = async (id) => {
    try {
      const updatedUnitEcon = await analyticsService.deleteManualFinanceEntry(id);
      setData(prev => ({
        ...prev,
        unitEconomics: updatedUnitEcon,
        general: prev?.general ? { ...prev.general, unitEconomics: updatedUnitEcon } : prev?.general
      }));
    } catch {
      const updatedLocal = localManualEntries.filter(item => item.id !== id);
      setLocalManualEntries(updatedLocal);
      localStorage.setItem(LOCAL_MANUAL_FINANCE_KEY, JSON.stringify(updatedLocal));
    }
  };

  const formatMoney = (value) => {
    if (value === undefined || value === null || Number.isNaN(Number(value))) return '0 ₴';
    return Math.round(Number(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₴';
  };

  const formatCompactMoney = (value) => {
    const num = Number(value) || 0;
    if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M ₴`;
    if (Math.abs(num) >= 10000) return `${(num / 1000).toFixed(1)}k ₴`;
    return formatMoney(num);
  };

  const formatDurationMin = (seconds) => {
    if (!seconds || seconds <= 0) return '0 хв';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs} с`;
    return `${mins} хв ${secs > 0 ? `${secs} с` : ''}`.trim();
  };

  // Перетворює технічний код '2026-W25' у зрозумілий діапазон дат '15.06 – 21.06.2026'
  const formatCohortPeriodLabel = (rawWeek) => {
    if (!rawWeek) return { main: '—', sub: '' };
    const str = String(rawWeek).trim();
    const match = str.match(/^(\d{4})-W(\d{1,2})$/i);
    if (!match) {
      return { main: str, sub: 'Тиждень першої поїздки' };
    }
    const year = parseInt(match[1], 10);
    const week = parseInt(match[2], 10);
    // ISO-8601: 4 січня завжди в 1-му тижні року
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

    const monday = new Date(mondayWeek1);
    monday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const pad = (n) => String(n).padStart(2, '0');
    const startStr = `${pad(monday.getUTCDate())}.${pad(monday.getUTCMonth() + 1)}`;
    const endStr = `${pad(sunday.getUTCDate())}.${pad(sunday.getUTCMonth() + 1)}.${sunday.getUTCFullYear()}`;
    return {
      main: `${startStr} – ${endStr}`,
      sub: `${week}-й тиждень ${year} р.`
    };
  };

  // Правильне відмінювання: '1 клієнт', '2 клієнти', '5 клієнтів'
  const formatClientsWord = (count) => {
    const n = Math.abs(Number(count) || 0);
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} клієнт`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} клієнти`;
    return `${n} клієнтів`;
  };

  // Експорт поточного звіту в CSV
  const handleExportCsv = () => {
    if (!data) return;
    const rows = [
      ['Метрика', 'Значення'],
      ['Період', data.period || period],
      ['Всього замовлень', totalOrdersVal],
      ['Виконано замовлень', completedCountVal],
      ['Скасовано замовлень', general.cancelledOrdersCount || cancelBreak.totalCancelled || 0],
      ['Fulfillment Rate (%)', (kpis.fulfillmentRate ?? general.fulfillmentRate ?? 0).toFixed(1)],
      ['Валовий обіг GMV (UAH)', gmvVal],
      ['Отримана комісія сервісу (UAH)', commVal],
      ['Вписано вручну Дохід (UAH)', manualIncomeSum],
      ['Вписано вручну Виплати/Витрати (UAH)', manualExpenseSum],
      ['Витрати на знижки Promo Burn (UAH)', promoVal],
      ['Чистий прибуток Net Revenue (UAH)', netVal],
      ['Середній чек (UAH)', avgClientCheckVal],
      ['Час пошуку авто (сек)', kpis.avgTimeToAcceptSeconds || 0],
      ['Час подачі авто (сек)', sla.avgTimeToArriveSeconds || 0]
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(r => r.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `unit_taxi_analytics_${period.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Продуктова воронка по унікальних сесіях
  const getActionStatsFor = (name) => {
    if (!general || !general.actionStats) return { count: 0, sessions: 0, users: 0 };
    const matched = general.actionStats.filter(item => item.actionName === name);
    const count = matched.reduce((sum, item) => sum + (item.count || 0), 0);
    const sessions = matched.reduce((sum, item) => sum + (item.uniqueSessions || item.count || 0), 0);
    const users = matched.reduce((sum, item) => sum + (item.uniqueUsers || 0), 0);
    return { count, sessions, users };
  };

  const tariffsViewStat = getActionStatsFor('tariffs_view');
  const tariffSelectStat = getActionStatsFor('tariff_select');
  const clickOrderStat = getActionStatsFor('click_order');
  const orderCreatedStat = getActionStatsFor('order_created');

  const funnelBaseSessions = tariffsViewStat.sessions > 0 ? tariffsViewStat.sessions : tariffsViewStat.count;
  const funnelOrderSessions = clickOrderStat.sessions > 0 ? clickOrderStat.sessions : clickOrderStat.count;

  const totalDropOffRate = funnelBaseSessions > 0
    ? Math.max(0, ((funnelBaseSessions - Math.min(funnelBaseSessions, funnelOrderSessions)) / funnelBaseSessions) * 100).toFixed(1)
    : '0.0';

  const funnelConversionRate = funnelBaseSessions > 0
    ? (100 - parseFloat(totalDropOffRate)).toFixed(1)
    : '0.0';

  // 24 години для pill-графіка
  const full24Hours = useMemo(() => {
    const map = {};
    hourlyDemand.forEach(item => { map[item.hour] = item; });
    const list = [];
    for (let h = 0; h < 24; h++) {
      list.push(map[h] || {
        hour: h,
        totalOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        fulfillmentRate: 0,
        boostOrders: 0
      });
    }
    if (hourlyFilter === 'PEAK') {
      return list.filter(item => (item.hour >= 7 && item.hour <= 10) || (item.hour >= 17 && item.hour <= 21));
    }
    if (hourlyFilter === 'DAY') {
      return list.filter(item => item.hour >= 7 && item.hour <= 22);
    }
    return list;
  }, [hourlyDemand, hourlyFilter]);

  const maxHourlyOrders = useMemo(() => {
    return full24Hours.reduce((max, h) => Math.max(max, h.totalOrders || 0), 1);
  }, [full24Hours]);

  const peakHourThreshold = useMemo(() => {
    const sorted = [...full24Hours].map(h => h.totalOrders).sort((a, b) => b - a);
    return sorted[3] || 1;
  }, [full24Hours]);

  // Сегментований напівкруглий спідометр (14 капсул)
  const fulfillmentVal = Number(kpis.fulfillmentRate ?? general.fulfillmentRate ?? 0);
  const totalGaugeSegments = 14;
  const activeGaugeSegments = Math.round((Math.min(100, Math.max(0, fulfillmentVal)) / 100) * totalGaugeSegments);

  // Donut-кільце для Власний парк vs EvoS
  const ownOrdersCount = Number(fleetSplit.ownFleetOrders ?? completedCountVal);
  const evosOrdersCount = Number(fleetSplit.evosOrders ?? 0);
  const totalSplitCount = Math.max(1, ownOrdersCount + evosOrdersCount);
  const ownShare = completedCountVal > 0 ? Number(fleetSplit.ownFleetSharePercent ?? ((ownOrdersCount / totalSplitCount) * 100)) : 0;
  const evosShare = completedCountVal > 0 ? Number(fleetSplit.evosSharePercent ?? ((evosOrdersCount / totalSplitCount) * 100)) : 0;
  const donutRadius = 54;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const ownStrokeDash = completedCountVal > 0 ? (ownShare / 100) * donutCircumference : 0;

  const filteredTariffs = useMemo(() => {
    const list = general.tariffStats || [];
    if (!tariffSearch.trim()) return list;
    const q = tariffSearch.toLowerCase();
    return list.filter(t => (t.tariffName || '').toLowerCase().includes(q));
  }, [general.tariffStats, tariffSearch]);

  if (loading && !data) {
    return (
      <div className="bento-analytics-page">
        <div className="bento-loading-card">
          <div className="bento-spinner" />
          <p>Завантаження аналітичного дашборду...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bento-analytics-page">
        <div className="bento-error-card">{error}</div>
      </div>
    );
  }

  const getHeatmapCellClass = (percent, target) => {
    if (percent >= target) return 'heat-cell-deep';
    if (percent >= target * 0.65) return 'heat-cell-mid';
    if (percent > 0) return 'heat-cell-soft';
    return 'heat-cell-empty';
  };

  return (
    <div className="bento-analytics-page">
      {/* ВЕРХНІЙ ХЕДЕР ДАШБОРДУ */}
      <header className="bento-top-header">
        <div className="bento-title-block">
          <div className="bento-title-row">
            <h1>Аналітика та продуктивність</h1>
          </div>
          <p className="bento-subtitle">
            Операційне зведення замовлень, комісії, ручних виплат, SLA та утримання клієнтів
            {data?.periodStart && data?.periodEnd && period !== 'ALL' && (
              <span className="bento-date-chip">
                {data.periodStart} — {data.periodEnd}
              </span>
            )}
          </p>
        </div>

        <div className="bento-actions-bar">
          <div className="bento-period-capsule">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.key}
                type="button"
                className={`bento-period-btn ${period === opt.key ? 'active' : ''}`}
                onClick={() => setPeriod(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button type="button" className="bento-pill-action-btn" onClick={handleExportCsv}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Експорт</span>
          </button>

          <button
            type="button"
            className="bento-pill-primary-btn"
            onClick={() => loadAnalytics(period, startDate, endDate)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{loading ? 'Оновлення...' : 'Оновити'}</span>
          </button>
        </div>
      </header>

      {/* КАСТОМНИЙ ВИБІР ДАТ */}
      {period === 'CUSTOM' && (
        <form className="bento-custom-date-bar" onSubmit={handleApplyCustomDates}>
          <div className="bento-date-field">
            <label>Початок періоду</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="bento-date-field">
            <label>Кінець періоду</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button type="submit" className="bento-pill-primary-btn">
            Застосувати діапазон
          </button>
        </form>
      )}

      {/* РЯД 1: 4 ГОЛОВНІ KPI-КАРТКИ */}
      <section className="bento-top-kpi-grid">
        {/* КАРТКА 1: HERO ROYAL BLUE (Валовий обіг GMV & Чистий дохід) */}
        <div className="bento-kpi-card hero-blue">
          <div className="bento-kpi-top">
            <span className="bento-kpi-label">Валовий обіг поїздок (GMV)</span>
            <div className="bento-icon-circle white-circle" title="Гривня (UAH)">
              <span style={{ fontSize: '1.18rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1 }}>₴</span>
            </div>
          </div>

          <div className="bento-kpi-main">
            <span className="bento-kpi-number">{formatMoney(gmvVal)}</span>
            <span className="bento-trend-pill glass-pill">
              Чистий: {formatCompactMoney(netVal)}
            </span>
          </div>

          <div className="bento-kpi-footer">
            <span>Сер. чек: <strong>{formatMoney(avgClientCheckVal)}</strong></span>
            <span>Комісія: <strong>{formatCompactMoney(commVal)}</strong></span>
          </div>
        </div>

        {/* КАРТКА 2: Активні пасажири та Конверсія */}
        <div className="bento-kpi-card">
          <div className="bento-kpi-top">
            <span className="bento-kpi-label">Активні клієнти &amp; LTV</span>
            <div className="bento-icon-circle dark-circle">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>

          <div className="bento-kpi-main-with-spark">
            <div>
              <div className="bento-kpi-main">
                <span className="bento-kpi-number">{general.uniquePayingClientsCount || completedCountVal || 0}</span>
                <span className="bento-trend-pill blue-pill">
                  ↑ {(general.conversionRate ?? 0).toFixed(1)}%
                </span>
              </div>
              <div className="bento-kpi-footer">
                <span>Виконано: <strong>{completedCountVal}</strong></span>
                <span>Сер. LTV: <strong>{formatMoney(general.averageLtv)}</strong></span>
              </div>
            </div>

            <div className="bento-mini-bars" aria-hidden="true">
              <span style={{ height: '30%' }} />
              <span style={{ height: '45%' }} />
              <span style={{ height: '60%' }} />
              <span style={{ height: '52%' }} />
              <span style={{ height: '78%' }} className="active" />
              <span style={{ height: '95%' }} className="active" />
            </div>
          </div>
        </div>

        {/* КАРТКА 3: Таймінги пошуку та подачі авто (SLA) */}
        <div className="bento-kpi-card">
          <div className="bento-kpi-top">
            <span className="bento-kpi-label">Швидкість пошуку (SLA)</span>
            <div className="bento-icon-circle soft-blue-circle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>

          <div className="bento-kpi-main">
            <span className="bento-kpi-number">
              {kpis.avgTimeToAcceptSeconds ? `${kpis.avgTimeToAcceptSeconds.toFixed(0)} с` : '0 с'}
            </span>
            <span className={`bento-trend-pill ${(kpis.avgTimeToAcceptSeconds || 0) <= 120 ? 'green-pill' : 'amber-pill'}`}>
              Подача {formatDurationMin(sla.avgTimeToArriveSeconds || kpis.avgTimeToArriveSeconds)}
            </span>
          </div>

          <div className="bento-kpi-footer">
            <span>У дорозі: <strong>{formatDurationMin(sla.avgTripDurationSeconds)}</strong></span>
            <span>Дистанція: <strong>{(sla.avgTripDistanceKm || 0).toFixed(1)} км</strong></span>
          </div>
        </div>

        {/* КАРТКА 4: Швидкі відмови та Таймаути пошуку */}
        <div className="bento-kpi-card">
          <div className="bento-kpi-top">
            <span className="bento-kpi-label">Втрати та Відмови</span>
            <div className="bento-icon-circle blue-solid-circle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>

          <div className="bento-kpi-main">
            <span className="bento-kpi-number">
              {cancelBreak.totalCancelled || general.cancelledOrdersCount || (totalOrdersVal - completedCountVal)}
            </span>
            <span className="bento-trend-pill coral-pill">
              ↓ {(kpis.quickClientCancelPercent || 0).toFixed(1)}% &lt;60с
            </span>
          </div>

          <div className="bento-kpi-footer">
            <span>Таймаути &gt;3хв: <strong>{(kpis.timeoutCancelPercent || 0).toFixed(1)}%</strong></span>
            <span>Зрив подачі: <strong>{cancelBreak.cancelledAfterAccept || 0}</strong></span>
          </div>
        </div>
      </section>

      {/* РЯД 2: ГОЛОВНИЙ ГРАФІК ПОГОДИННОГО ПОПИТУ (2/3) + СПІДОМЕТР ВИВОЗИМОСТІ (1/3) */}
      <section className="bento-main-split-grid">
        {/* ЛІВА КАРТКА: Пікові години попиту */}
        <div className="bento-card">
          <div className="bento-card-header">
            <div>
              <div className="bento-card-title-group">
                <span className="bento-badge-icon blue">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M18 20V10M12 20V4M6 20v-6" />
                  </svg>
                </span>
                <h2>Динаміка попиту та вивозимості по годинах</h2>
              </div>
              <p className="bento-card-desc">
                Наведіть курсор на стовпчик години, щоб побачити кількість замовлень, процент вивозу та бусти
              </p>
            </div>

            <div className="bento-sub-pills">
              <button
                type="button"
                className={hourlyFilter === 'ALL' ? 'active' : ''}
                onClick={() => setHourlyFilter('ALL')}
              >
                24 год
              </button>
              <button
                type="button"
                className={hourlyFilter === 'DAY' ? 'active' : ''}
                onClick={() => setHourlyFilter('DAY')}
              >
                07:00–22:00
              </button>
              <button
                type="button"
                className={hourlyFilter === 'PEAK' ? 'active' : ''}
                onClick={() => setHourlyFilter('PEAK')}
              >
                Пікові години
              </button>
            </div>
          </div>

          <div className="bento-pill-chart-area">
            <div className="bento-y-axis">
              <span>{maxHourlyOrders}</span>
              <span>{Math.round(maxHourlyOrders * 0.75)}</span>
              <span>{Math.round(maxHourlyOrders * 0.5)}</span>
              <span>{Math.round(maxHourlyOrders * 0.25)}</span>
              <span>0</span>
            </div>

            <div className="bento-bars-stage">
              {full24Hours.map((h, colIdx) => {
                const heightPct = h.totalOrders > 0
                  ? Math.max(12, Math.round((h.totalOrders / maxHourlyOrders) * 100))
                  : 6;
                const isPeak = h.totalOrders > 0 && h.totalOrders >= peakHourThreshold;
                const isHovered = hoveredHour === h.hour;
                const isRightEdge = colIdx >= full24Hours.length - 4;
                const isLeftEdge = colIdx <= 2;
                const tooltipAlignStyle = isRightEdge
                  ? { right: 0, left: 'auto', transform: 'none' }
                  : isLeftEdge
                    ? { left: 0, right: 'auto', transform: 'none' }
                    : {};

                return (
                  <div
                    key={h.hour}
                    className={`bento-bar-column ${isHovered ? 'hovered' : ''}`}
                    onMouseEnter={() => setHoveredHour(h.hour)}
                    onMouseLeave={() => setHoveredHour(null)}
                  >
                    {isHovered && (
                      <div className="bento-floating-tooltip" style={tooltipAlignStyle}>
                        <div className="tooltip-title">{String(h.hour).padStart(2, '0')}:00 — {String(h.hour).padStart(2, '0')}:59</div>
                        <div className="tooltip-row">
                          <span className="dot gray" />
                          <span>Всього замовлень:</span>
                          <strong>{h.totalOrders}</strong>
                        </div>
                        <div className="tooltip-row">
                          <span className="dot blue" />
                          <span>Виконано ({h.fulfillmentRate.toFixed(0)}%):</span>
                          <strong>{h.completedOrders}</strong>
                        </div>
                        <div className="tooltip-row">
                          <span className="dot amber" />
                          <span>З бустом (+20₴):</span>
                          <strong>{h.boostOrders}</strong>
                        </div>
                      </div>
                    )}

                    <div className="bento-bar-track">
                      <div
                        className={`bento-bar-fill ${isPeak ? 'peak-striped' : h.totalOrders > 0 ? 'dark-slate' : 'empty-bar'}`}
                        style={{ height: `${heightPct}%` }}
                      >
                        {isHovered && h.totalOrders > 0 && (
                          <span className="bento-bar-node" />
                        )}
                      </div>
                    </div>
                    <span className="bento-bar-x-label">{String(h.hour).padStart(2, '0')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ПРАВА КАРТКА: Сегментований спідометр Вивозимості */}
        <div className="bento-card gauge-card">
          <div className="bento-card-header">
            <div className="bento-card-title-group">
              <h2>Ефективність вивозу</h2>
            </div>
            <span className="bento-more-badge" title="Операційний KPI">SLA</span>
          </div>

          <div className="bento-gauge-wrapper">
            <svg viewBox="0 0 260 145" className="bento-gauge-svg">
              {Array.from({ length: totalGaugeSegments }).map((_, idx) => {
                const startAngle = -180 + (idx * (180 / totalGaugeSegments)) + 2;
                const endAngle = -180 + ((idx + 1) * (180 / totalGaugeSegments)) - 2;
                const midAngleRad = ((startAngle + endAngle) / 2) * (Math.PI / 180);
                const cx = 130;
                const cy = 125;
                const rOuter = 98;
                const rInner = 64;
                const rMid = (rOuter + rInner) / 2;
                const x = cx + rMid * Math.cos(midAngleRad);
                const y = cy + rMid * Math.sin(midAngleRad);
                const rot = (startAngle + endAngle) / 2 + 90;

                let fillColor = '#eef2f6';
                if (idx < activeGaugeSegments) {
                  fillColor = idx < Math.ceil(activeGaugeSegments * 0.65) ? '#2563eb' : '#60a5fa';
                }

                return (
                  <rect
                    key={idx}
                    x={x - 6}
                    y={y - 18}
                    width="12"
                    height="36"
                    rx="6"
                    fill={fillColor}
                    transform={`rotate(${rot} ${x} ${y})`}
                  />
                );
              })}
            </svg>

            <div className="bento-gauge-center-text">
              <div className="gauge-big-pct">{fulfillmentVal.toFixed(1)}%</div>
              <div className="gauge-caption">Fulfillment Rate</div>
            </div>
          </div>

          <div className="bento-gauge-bottom-boxes">
            <div className="bento-mini-stat-box">
              <span className="mini-stat-title">Виконано поїздок</span>
              <div className="mini-stat-row">
                <strong>{completedCountVal}</strong>
                <span className="mini-badge amber">
                  Boost {(kpis.boostOrdersPercent || 0).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="bento-mini-stat-box">
              <span className="mini-stat-title">Вивіз після бусту</span>
              <div className="mini-stat-row">
                <strong>{(kpis.boostFulfillmentPercent || 0).toFixed(1)}%</strong>
                <span className="mini-badge dark">
                  +20/40 ₴
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* РЯД 3: 3-КОЛОНКОВИЙ BENTO GRID (Unit-економіка + Власний парк vs EvoS + Payback & Anti-Fraud) */}
      <section className="bento-three-col-grid">
        {/* КАРТКА 1: Фінансова Unit-економіка з комісією та ручним введенням своїх грошей/виплат */}
        <div className="bento-card">
          <div className="bento-card-header" style={{ marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div className="bento-icon-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="3" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <button
                type="button"
                className="bento-manual-toggle-btn"
                onClick={() => setShowManualForm(prev => !prev)}
              >
                {showManualForm ? '✕ Закрити' : '✎ Вписати вручну'}
              </button>
            </div>

            <div className="bento-right-metric">
              <span className={`bento-big-money ${netVal >= 0 ? 'pos' : 'neg'}`}>
                {formatMoney(netVal)}
              </span>
              <span className="bento-money-sub">Чистий прибуток компанії (Net)</span>
            </div>
          </div>

          {/* Вбудована форма ручного додавання доходів (+) або виплат (-) */}
          {showManualForm && (
            <form className="bento-manual-finance-form" onSubmit={handleAddManualFinance}>
              <div className="manual-type-switch">
                <button
                  type="button"
                  className={manualType === 'INCOME' ? 'active income' : ''}
                  onClick={() => setManualType('INCOME')}
                >
                  + Свої кошти / Дохід
                </button>
                <button
                  type="button"
                  className={manualType === 'EXPENSE' ? 'active expense' : ''}
                  onClick={() => setManualType('EXPENSE')}
                >
                  − Ручна виплата / Витрата
                </button>
              </div>
              <div className="manual-inputs-row">
                <input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="Сума (₴)"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Коментар (напр. Виплата на картку)"
                  value={manualComment}
                  onChange={(e) => setManualComment(e.target.value)}
                />
                <button type="submit" disabled={savingManual}>
                  {savingManual ? '...' : 'Додати'}
                </button>
              </div>
            </form>
          )}

          {/* РЕАЛЬНИЙ ІНТЕРАКТИВНИЙ ГРАФІК ДОХОДІВ ТА ПРОСІДАНЬ ПО ДНЯХ (ФІКСОВАНА ВИСОТА БЕЗ СТРИБКІВ) */}
          <div className="bento-real-rev-chart-container" style={{ margin: '0.25rem 0 0.75rem 0', width: '100%' }}>
            {/* Фіксована верхня інфо-панель (завжди має висоту 36px, тому графік ніколи не смикається при наведенні!) */}
            <div
              className="bento-rev-hover-banner"
              style={{
                height: '36px',
                minHeight: '36px',
                maxHeight: '36px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: hoveredRevPoint ? '#eff6ff' : '#f8fafc',
                border: `1px solid ${hoveredRevPoint ? '#bfdbfe' : '#e2e8f0'}`,
                borderRadius: '10px',
                padding: '0 0.75rem',
                marginBottom: '0.45rem',
                fontSize: '0.76rem',
                transition: 'background 0.15s ease, border-color 0.15s ease'
              }}
            >
              {hoveredRevPoint ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{hoveredRevPoint.date}</span>
                    <strong className={hoveredRevPoint.netRevenue >= 0 ? 'text-blue' : 'text-coral'} style={{ fontSize: '0.84rem' }}>
                      {formatMoney(hoveredRevPoint.netRevenue)}
                    </strong>
                    <span style={{ color: '#64748b', fontSize: '0.73rem' }}>
                      ({hoveredRevPoint.ordersCount || 0} поїздок)
                    </span>
                  </div>
                  {hoveredRevPoint.delta !== null && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.16rem 0.55rem',
                        borderRadius: '999px',
                        whiteSpace: 'nowrap',
                        background: hoveredRevPoint.delta < 0 ? '#fee2e2' : hoveredRevPoint.delta > 0 ? '#dcfce7' : '#e2e8f0',
                        color: hoveredRevPoint.delta < 0 ? '#b91c1c' : hoveredRevPoint.delta > 0 ? '#15803d' : '#475569'
                      }}
                    >
                      {hoveredRevPoint.delta < 0
                        ? `↓ Просідання ${formatMoney(hoveredRevPoint.delta)}`
                        : hoveredRevPoint.delta > 0
                          ? `↑ Ріст +${formatMoney(hoveredRevPoint.delta)}`
                          : 'Без змін'}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.74rem' }}>
                    Наведіть курсор на точку дня для деталей
                  </span>
                  {revChartGeometry.peakDay && (
                    <span style={{ fontSize: '0.73rem', color: '#334155', fontWeight: 600 }}>
                      Пік: <strong className="text-blue">{revChartGeometry.peakDay.label} ({formatMoney(revChartGeometry.peakDay.netRevenue)})</strong>
                    </span>
                  )}
                </>
              )}
            </div>

            <div
              className="bento-wave-chart-box"
              style={{ width: '100%', height: '165px', margin: 0, position: 'relative' }}
              onMouseLeave={() => setHoveredRevIdx(null)}
            >
              <svg viewBox="0 0 420 150" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="unitBlueWave" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Горизонтальні лінії сітки на всю ширину */}
                <line x1="8" y1="26" x2="412" y2="26" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="8" y1="74" x2="412" y2="74" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="8" y1="122" x2="412" y2="122" stroke="#cbd5e1" strokeWidth="1.2" />

                {/* Заливка під реальною кривою */}
                {revChartGeometry.areaPath && (
                  <path d={revChartGeometry.areaPath} fill="url(#unitBlueWave)" style={{ pointerEvents: 'none' }} />
                )}

                {/* Лінія реального доходу */}
                {revChartGeometry.linePath && (
                  <path
                    d={revChartGeometry.linePath}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Точки по днях */}
                {revChartGeometry.points.map((pt, idx) => {
                  const isHovered = hoveredRevIdx === idx;
                  const ptsLen = revChartGeometry.points.length;
                  const step = ptsLen <= 8 ? 1 : Math.ceil(ptsLen / 7);
                  const showLabel = idx === 0 || idx === ptsLen - 1 || idx % step === 0;
                  const colWidth = ptsLen > 1 ? 400 / ptsLen : 60;

                  return (
                    <g key={pt.date || idx}>
                      {isHovered && (
                        <line
                          x1={pt.x}
                          y1="14"
                          x2={pt.x}
                          y2="122"
                          stroke="#93c5fd"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          style={{ pointerEvents: 'none' }}
                        />
                      )}

                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6.5 : pt.isDip ? 5 : 4.2}
                        fill={pt.isDip ? '#ef4444' : '#ffffff'}
                        stroke={pt.isDip ? '#b91c1c' : '#2563eb'}
                        strokeWidth={isHovered ? '3.2' : '2.6'}
                        style={{ pointerEvents: 'none' }}
                      />

                      {/* Підпис суми над точкою, якщо в цей день був дохід або наведено курсор */}
                      {(pt.netRevenue > 0 || isHovered) && (
                        <text
                          x={pt.x}
                          y={Math.max(13, pt.y - 9)}
                          textAnchor="middle"
                          fontSize="9.5"
                          fontWeight="800"
                          fill={pt.isDip ? '#dc2626' : '#1d4ed8'}
                          style={{ pointerEvents: 'none' }}
                        >
                          {Math.round(pt.netRevenue)}₴
                        </text>
                      )}

                      {showLabel && (
                        <text
                          x={pt.x}
                          y="142"
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight={isHovered ? '800' : '600'}
                          fill={isHovered ? '#0f172a' : '#64748b'}
                          style={{ pointerEvents: 'none' }}
                        >
                          {pt.label}
                        </text>
                      )}

                      {/* Статична широка зона наведення на весь стовпчик дня (гарантує відсутність тремтіння!) */}
                      <rect
                        x={pt.x - colWidth / 2}
                        y="0"
                        width={colWidth}
                        height="148"
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredRevIdx(idx)}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            <div
              className="bento-rev-chart-legend"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.6rem',
                fontSize: '0.73rem',
                color: '#64748b',
                marginTop: '0.35rem',
                padding: '0.2rem 0.15rem 0 0.15rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
                  <span>Ріст / норма</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                  <span>Просідання доходу</span>
                </span>
              </div>
              {revChartGeometry.lowestDipDay && (
                <span>
                  Мін. день: <strong style={{ color: '#b91c1c' }}>{revChartGeometry.lowestDipDay.label} ({formatMoney(revChartGeometry.lowestDipDay.netRevenue)})</strong>
                </span>
              )}
            </div>
          </div>

          <div className="bento-econ-list">
            <div className="bento-econ-item">
              <span>Отримана комісія сервісу (Авто)</span>
              <strong className="text-blue">+{formatMoney(commVal)}</strong>
            </div>

            {(manualIncomeSum > 0 || manualExpenseSum > 0) && (
              <div className="bento-econ-item">
                <span>Вписано вручну (Дохід / Виплати)</span>
                <strong>
                  <span className="text-blue">+{formatMoney(manualIncomeSum)}</span>
                  {' / '}
                  <span className="text-coral">-{formatMoney(manualExpenseSum)}</span>
                </strong>
              </div>
            )}

            <div className="bento-econ-item">
              <span>Витрати на знижки (Promo Burn)</span>
              <strong className="text-coral">-{formatMoney(promoVal)}</strong>
            </div>

            <div className="bento-econ-item">
              <span>Платний простій / Сер. чек клієнта</span>
              <strong>{formatMoney(waitingVal)} / {formatMoney(avgClientCheckVal)}</strong>
            </div>

            <div className="bento-econ-item highlight">
              <span>Чиста маржа на 1 замовлення</span>
              <strong>{formatMoney(avgNetPerOrder)}</strong>
            </div>
          </div>

          {/* Список останніх ручних записів (якщо є) */}
          {manualEntries.length > 0 && (
            <div className="bento-manual-history">
              {manualEntries.slice(0, 3).map(entry => (
                <div key={entry.id} className="manual-history-row">
                  <span className="manual-history-comment" title={entry.comment}>
                    {entry.comment}
                  </span>
                  <div className="manual-history-right">
                    <strong className={entry.type === 'INCOME' ? 'text-blue' : 'text-coral'}>
                      {entry.type === 'INCOME' ? '+' : '-'}{formatMoney(entry.amount)}
                    </strong>
                    <button
                      type="button"
                      className="manual-delete-btn"
                      onClick={() => handleDeleteManualEntry(entry.id)}
                      title="Видалити запис"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* КАРТКА 2: Структура вивозу Власний парк vs EvoS */}
        <div className="bento-card">
          <div className="bento-card-header">
            <div>
              <h2>Власний парк vs EvoS</h2>
              <p className="bento-card-desc">Розподіл вивезених замовлень за каналами</p>
            </div>
            <span className="bento-tag-pill">Fleet Split</span>
          </div>

          <div className="bento-donut-layout">
            <div className="bento-donut-wrap">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle
                  cx="70"
                  cy="70"
                  r={donutRadius}
                  fill="none"
                  stroke="#dbeafe"
                  strokeWidth="16"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={donutRadius}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="16"
                  strokeDasharray={`${ownStrokeDash} ${donutCircumference}`}
                  strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                />
              </svg>
              <div className="bento-donut-center">
                <strong>{ownShare.toFixed(0)}%</strong>
                <span>Свої авто</span>
              </div>
            </div>

            <div className="bento-donut-legend">
              <div className="legend-row">
                <span className="legend-dot royal" />
                <div>
                  <div className="legend-title">Власні водії</div>
                  <div className="legend-val">{ownOrdersCount} зам. ({ownShare.toFixed(1)}%)</div>
                </div>
              </div>
              <div className="legend-row">
                <span className="legend-dot sky" />
                <div>
                  <div className="legend-title">Партнери EvoS</div>
                  <div className="legend-val">{evosOrdersCount} зам. ({evosShare.toFixed(1)}%)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bento-dispatch-modes">
            <div className="mode-chip">
              <span>Вільний ефір</span>
              <strong>{fleetSplit.etherOrdersCount ?? ownOrdersCount}</strong>
            </div>
            <div className="mode-chip">
              <span>Автофільтр</span>
              <strong>{fleetSplit.autoFilterOrdersCount || 0}</strong>
            </div>
            <div className="mode-chip">
              <span>Ланцюг (Chain)</span>
              <strong>{fleetSplit.chainOrdersCount || 0}</strong>
            </div>
            <div className="mode-chip">
              <span>Предзамовлення</span>
              <strong>{sla.scheduledOrdersCount || 0} ({(sla.scheduledFulfillmentRate || 0).toFixed(0)}%)</strong>
            </div>
          </div>
        </div>

        {/* КАРТКА 3: Окупність CAC + Anti-Fraud Shield */}
        <div className="bento-stacked-column">
          <div className="bento-blue-widget">
            <div className="blue-widget-top">
              <div>
                <h3>Окупність клієнта (Payback CAC)</h3>
                <p>Вихід у чистий плюс на {payback.targetRidesForPayback || 8}-й поїздці</p>
              </div>
              <span className="blue-widget-tag">Unit Economics</span>
            </div>

            <div className="blue-widget-main">
              <div className="blue-widget-stat">
                <span className="bw-label">CAC залучення</span>
                <strong className="bw-val">{payback.estimatedCac || 120} ₴</strong>
              </div>
              <div className="blue-widget-stat">
                <span className="bw-label">Комісія / поїздка</span>
                <strong className="bw-val">
                  {payback.avgCommissionPerOrder || (completedCountVal > 0 ? Math.round(commVal / completedCountVal) : 15)} ₴
                </strong>
              </div>
              <div className="blue-widget-stat highlight">
                <span className="bw-label">Час окупності</span>
                <strong className="bw-val">
                  {payback.avgDaysToPayback ? `${payback.avgDaysToPayback.toFixed(1)} дн.` : '—'}
                </strong>
              </div>
            </div>
          </div>

          <div className="bento-card antifraud-compact-card">
            <div className="bento-card-header" style={{ marginBottom: '0.75rem' }}>
              <div className="bento-card-title-group">
                <span className="bento-badge-icon coral">🛡️</span>
                <h2>Anti-Fraud Захист (Device ID)</h2>
              </div>
              <span className="bento-tag-pill danger">Active Shield</span>
            </div>

            <div className="bento-antifraud-grid">
              <div className="antifraud-box">
                <span className="af-num">{fraud.blockedPromoAttempts || 0}</span>
                <span className="af-label">Заблоковано промо-атак</span>
              </div>
              <div className="antifraud-box">
                <span className="af-num">{fraud.suspiciousDevicesCount || 0}</span>
                <span className="af-label">Мультиакаунт-пристроїв</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* РЯД 4: КОГОРТНА ТЕПЛОВА МАТРИЦЯ + ВОРОНКА КОНВЕРСІЇ */}
      <section className="bento-cohort-funnel-grid">
        {/* ЛІВА КАРТКА: Таблиця повернення клієнтів (Когортний аналіз простими словами) */}
        <div className="bento-card">
          <div className="bento-card-header">
            <div>
              <h2>Повернення клієнтів (Як часто замовляють знову)</h2>
              <p className="bento-card-desc">
                Показує, скільки нових пасажирів після своєї 1-ї поїздки повернулися вдруге, втретє та стали постійними (5+ поїздок)
              </p>
            </div>
            <span className="bento-tag-pill">Утримання клієнтів</span>
          </div>

          <div className="bento-heatmap-table-wrap">
            <table className="bento-heatmap-table">
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '19%' }} />
                <col style={{ width: '19%' }} />
                <col style={{ width: '19%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Період 1-ї поїздки</th>
                  <th>Нових пасажирів</th>
                  <th>Зробили 2+ поїздки</th>
                  <th>Зробили 3+ поїздки</th>
                  <th>Постійні (5+ поїздок)</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.length > 0 ? (
                  cohorts.slice(0, 8).map((cohort, idx) => {
                    const periodInfo = formatCohortPeriodLabel(cohort.cohortWeek);
                    const totalU = Number(cohort.totalUsers) || 0;
                    const c2 = Math.round((totalU * (Number(cohort.ride2RetentionPercent) || 0)) / 100);
                    const c3 = Math.round((totalU * (Number(cohort.ride3RetentionPercent) || 0)) / 100);
                    const c5 = Math.round((totalU * (Number(cohort.ride5PlusRetentionPercent) || 0)) / 100);

                    return (
                      <tr key={idx}>
                        <td className="cohort-week-cell">
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem' }}>{periodInfo.main}</div>
                          {periodInfo.sub && (
                            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>{periodInfo.sub}</div>
                          )}
                        </td>
                        <td>
                          <span className="cohort-users-pill">{formatClientsWord(totalU)}</span>
                        </td>
                        <td>
                          <div className={`bento-heat-cell ${getHeatmapCellClass(cohort.ride2RetentionPercent, 30)}`}>
                            <span>{cohort.ride2RetentionPercent.toFixed(0)}%</span>
                            <small style={{ display: 'block', fontSize: '0.67rem', opacity: 0.88, fontWeight: 600 }}>
                              ({c2} з {totalU})
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className={`bento-heat-cell ${getHeatmapCellClass(cohort.ride3RetentionPercent, 20)}`}>
                            <span>{cohort.ride3RetentionPercent.toFixed(0)}%</span>
                            <small style={{ display: 'block', fontSize: '0.67rem', opacity: 0.88, fontWeight: 600 }}>
                              ({c3} з {totalU})
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className={`bento-heat-cell ${getHeatmapCellClass(cohort.ride5PlusRetentionPercent, 15)}`}>
                            <span>{cohort.ride5PlusRetentionPercent.toFixed(0)}%</span>
                            <small style={{ display: 'block', fontSize: '0.67rem', opacity: 0.88, fontWeight: 600 }}>
                              ({c5} з {totalU})
                            </small>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="bento-empty-cell">
                      Дані про повернення пасажирів накопичуються
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ПРАВА КАРТКА: Продуктова воронка додатку пасажира */}
        <div className="bento-card">
          <div className="bento-card-header">
            <div>
              <h2>Воронка конверсії додатку</h2>
              <p className="bento-card-desc">Очищена по унікальних сесіях без дублів x2</p>
            </div>
            <span className="bento-trend-pill blue-pill">CR {funnelConversionRate}%</span>
          </div>

          <div className="bento-timeline-funnel">
            <div className="timeline-step">
              <div className="timeline-node blue">1</div>
              <div className="timeline-card">
                <div className="timeline-top">
                  <strong>Розрахунок маршруту (tariffs_view)</strong>
                  <span className="timeline-badge">{tariffsViewStat.sessions} сесій</span>
                </div>
                <p>Всього відкриттів панелі тарифів: {tariffsViewStat.count} • Відвал: <strong className="text-coral">{totalDropOffRate}%</strong></p>
              </div>
            </div>

            <div className="timeline-step">
              <div className="timeline-node sky">2</div>
              <div className="timeline-card">
                <div className="timeline-top">
                  <strong>Зміна класу авто (tariff_select)</strong>
                  <span className="timeline-badge">{tariffSelectStat.sessions} сесій</span>
                </div>
                <p>Ручних перемикань між тарифами: {tariffSelectStat.count} разів</p>
              </div>
            </div>

            <div className="timeline-step">
              <div className="timeline-node dark">3</div>
              <div className="timeline-card">
                <div className="timeline-top">
                  <strong>Натискання «Замовити» (click_order)</strong>
                  <span className="timeline-badge">{clickOrderStat.sessions} сесій</span>
                </div>
                <p>Всього кліків виклику авто: {clickOrderStat.count} • Конверсія: <strong className="text-blue">{funnelConversionRate}%</strong></p>
              </div>
            </div>

            <div className="timeline-step last">
              <div className="timeline-node green">4</div>
              <div className="timeline-card">
                <div className="timeline-top">
                  <strong>Успішно створено (order_created)</strong>
                  <span className="timeline-badge success">{orderCreatedStat.count || totalOrdersVal || 0} зам.</span>
                </div>
                <p>Пройшли валідацію сервера та передані в ефір водіям</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* РЯД 5: ТАРИФИ ТА ГЕОГРАФІЯ ПО СЕКТОРАХ */}
      <section className="bento-two-col-grid">
        {/* Таблиця тарифів */}
        <div className="bento-card">
          <div className="bento-card-header">
            <div>
              <h2>Ефективність та маржинальність тарифів</h2>
              <p className="bento-card-desc">Виторг (GMV), середній чек та комісія за класами авто</p>
            </div>
            <div className="bento-search-input-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Пошук тарифу..."
                value={tariffSearch}
                onChange={(e) => setTariffSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="bento-clean-table-wrap">
            <table className="bento-clean-table">
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '17%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Тариф</th>
                  <th className="center">Поїздки</th>
                  <th className="center">Сер. чек</th>
                  <th className="right">Обіг (GMV)</th>
                  <th className="right">Комісія (Маржа)</th>
                </tr>
              </thead>
              <tbody>
                {filteredTariffs.length > 0 ? (
                  filteredTariffs.map((tariff, idx) => {
                    const tRev = Number(tariff.totalRevenue) || 0;
                    const tNet = Number(tariff.netRevenue) || (tRev > 0 ? Math.round(tRev * 0.1) : 0);
                    return (
                      <tr key={idx}>
                        <td>
                          <div className="table-entity-cell">
                            <span className="entity-dot" />
                            <strong title={tariff.tariffName}>{tariff.tariffName}</strong>
                          </div>
                        </td>
                        <td className="center">
                          <span className="table-count-pill">{tariff.orderCount}</span>
                          {tariff.cancelledCount > 0 && (
                            <span className="table-sub-cancel">({tariff.cancelledCount} скас.)</span>
                          )}
                        </td>
                        <td className="center">
                          {formatMoney(tariff.avgCheck || (tariff.orderCount > 0 ? tRev / tariff.orderCount : 0))}
                        </td>
                        <td className="right font-bold">{formatMoney(tRev)}</td>
                        <td className={`right font-bold ${tNet >= 0 ? 'text-blue' : 'text-coral'}`}>
                          {formatMoney(tNet)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="5" className="bento-empty-cell">Тарифи не знайдено</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Географія попиту за секторами */}
        <div className="bento-card">
          <div className="bento-card-header">
            <div>
              <h2>Географія попиту за секторами та районами</h2>
              <p className="bento-card-desc">Топ зон подачі авто за кількістю викликів та процентом вивозу</p>
            </div>
            <span className="bento-tag-pill">Top Zones</span>
          </div>

          <div className="bento-clean-table-wrap">
            <table className="bento-clean-table">
              <colgroup>
                <col style={{ width: '36%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Сектор / Район</th>
                  <th className="center">Замовлень</th>
                  <th className="center">Виконано</th>
                  <th className="center">Вивіз %</th>
                  <th className="right">Сер. чек</th>
                </tr>
              </thead>
              <tbody>
                {sectorDemand.length > 0 ? (
                  sectorDemand.map((sec, idx) => (
                    <tr key={idx}>
                      <td><strong title={sec.sectorName}>{sec.sectorName}</strong></td>
                      <td className="center">{sec.totalOrders}</td>
                      <td className="center text-blue font-bold">{sec.completedOrders}</td>
                      <td className="center">
                        <span className={`bento-status-pill ${sec.fulfillmentRate >= 75 ? 'good' : sec.fulfillmentRate >= 50 ? 'mid' : 'low'}`}>
                          {sec.fulfillmentRate.toFixed(0)}%
                        </span>
                      </td>
                      <td className="right font-bold">{formatMoney(sec.avgPrice)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" className="bento-empty-cell">Немає замовлень у прив'язаних секторах за обраний період</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* РЯД 6: ПРИЧИНИ СКАСУВАНЬ 360° + МАРКЕТИНГОВІ ДЖЕРЕЛА (UTM) / ЕКРАННИЙ ЧАС */}
      <section className="bento-two-col-grid">
        {/* Причини скасувань 360° */}
        <div className="bento-card">
          <div className="bento-card-header">
            <div>
              <h2>Аналітика скасувань 360° ({cancelBreak.totalCancelled || general.cancelledOrdersCount || 0})</h2>
              <p className="bento-card-desc">
                До призначення: <strong>{cancelBreak.cancelledBeforeAccept || 0}</strong> • Після призначення: <strong>{cancelBreak.cancelledAfterAccept || 0}</strong> • EvoS: <strong>{cancelBreak.cancelledByPartnerEvos || 0}</strong> • Диспетчер: <strong>{cancelBreak.cancelledByDispatcher || 0}</strong>
              </p>
            </div>
          </div>

          <div className="bento-cancel-bars-list">
            {general.clientCancellationStats && general.clientCancellationStats.length > 0 ? (
              general.clientCancellationStats.map((item, idx) => (
                <div key={idx} className="bento-cancel-row">
                  <div className="bento-cancel-meta">
                    <strong>{item.reason}</strong>
                    <span>{item.count} разів ({item.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="bento-cancel-track">
                    <div
                      className={`bento-cancel-fill ${idx === 0 ? 'primary-bar' : 'secondary-bar'}`}
                      style={{ width: `${Math.max(4, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="bento-empty-cell">Дані про причини скасувань за обраний період відсутні</div>
            )}
          </div>
        </div>

        {/* Джерела трафіку (UTM) та Екранний час (Screen Time) */}
        <div className="bento-card">
          <div className="bento-card-header">
            <div>
              <h2>
                {bottomRightTab === 'TRAFFIC'
                  ? 'Джерела трафіку (UTM Атрибуція)'
                  : 'Час взаємодії з екранами (Screen Time)'}
              </h2>
              <p className="bento-card-desc">
                {bottomRightTab === 'TRAFFIC'
                  ? 'Канали залучення пасажирів у мобільний додаток'
                  : 'Середня тривалість сесії на кожному екрані додатку'}
              </p>
            </div>

            <div className="bento-sub-pills">
              <button
                type="button"
                className={bottomRightTab === 'TRAFFIC' ? 'active' : ''}
                onClick={() => setBottomRightTab('TRAFFIC')}
              >
                UTM Трафік
              </button>
              <button
                type="button"
                className={bottomRightTab === 'SCREENS' ? 'active' : ''}
                onClick={() => setBottomRightTab('SCREENS')}
              >
                Екрани
              </button>
            </div>
          </div>

          <div className="bento-clean-table-wrap">
            {bottomRightTab === 'TRAFFIC' ? (
              <table className="bento-clean-table">
                <colgroup>
                  <col style={{ width: '40%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '16%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Medium</th>
                    <th>Campaign</th>
                    <th className="right">Клієнтів</th>
                  </tr>
                </thead>
                <tbody>
                  {general.trafficStats && general.trafficStats.length > 0 ? (
                    general.trafficStats.map((traffic, idx) => (
                      <tr key={idx}>
                        <td><span className="bento-source-badge" title={traffic.source}>{traffic.source}</span></td>
                        <td><code className="bento-code-chip" title={traffic.medium}>{traffic.medium}</code></td>
                        <td className="muted-cell" title={traffic.campaign}>{traffic.campaign}</td>
                        <td className="right font-bold">{traffic.userCount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="bento-empty-cell">Дані про трафік відсутні</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="bento-clean-table">
                <colgroup>
                  <col style={{ width: '50%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '25%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Екран додатку</th>
                    <th className="center">Відвідувань</th>
                    <th className="right">Середній час</th>
                  </tr>
                </thead>
                <tbody>
                  {general.screenStats && general.screenStats.length > 0 ? (
                    general.screenStats.map((scr, idx) => (
                      <tr key={idx}>
                        <td><code className="bento-code-chip">{scr.screenName}</code></td>
                        <td className="center">{scr.visitCount}</td>
                        <td className="right font-bold text-blue">{scr.averageDurationSeconds.toFixed(1)} с</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3" className="bento-empty-cell">Дані про екрани накопичуються</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AnalyticsPage;