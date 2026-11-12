import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../services/api';

// Імпортуємо ВСІ сторінки
import OrdersPage from './OrdersPage';
import DriversPage from './DriversPage'; 
import ClientsPage from './ClientsPage';
import AnalyticsPage from './AnalyticsPage';
import TariffsPage from './TariffsPage'; 
import DispatchersPage from './DispatchersPage';
import PromosPage from './PromosPage';         
import PromoCodesPage from './PromoCodesPage'; 
import NewsPage from './NewsPage';             
import ServicesPage from './Services';         
import SettingsPage from './SettingsPage';     
import SectorsPage from './SectorsPage';
import RatingsPage from './RatingsPage';
import CarRequestsPage from './CarRequestsPage';
import DriverRequestsPage from './DriverRequestsPage'; 
import ClientInfoPage from './ClientInfoPage';
import FinancePage from './FinancePage';
import PhotoControl from './PhotoControl';
import DriverPhotoUploadWebView from './DriverPhotoUploadWebView';
import SupportPage from './SupportPage';

// --- ФІРМОВЕ ЛОГО UNIT (підтягує файл з public/ або малює точний вектор з кольором #ffe03b) ---
const UnitBrandLogo = () => {
  const [srcIndex, setSrcIndex] = useState(0);
  const candidateSources = ['/unit-logo.jpg', '/UNIT LOGO JPEG.jpg', '/unit-logo.png'];

  if (srcIndex < candidateSources.length) {
    return (
      <img
        src={candidateSources[srcIndex]}
        alt="Unit Logo"
        className="brand-logo-img"
        onError={() => setSrcIndex((prev) => prev + 1)}
      />
    );
  }

  // Точна векторна копія логотипу UNIT із фірмовим кружечком #ffe03b
  return (
    <svg
      className="brand-logo-img"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Unit Logo"
    >
      <defs>
        <mask id="unit-ring-cutout">
          <rect width="100" height="100" fill="white" />
          <circle cx="73" cy="73" r="16" fill="black" />
        </mask>
      </defs>
      <rect width="100" height="100" rx="20" fill="#000000" />
      <g mask="url(#unit-ring-cutout)">
        <circle cx="50" cy="50" r="34" stroke="#ffffff" strokeWidth="9.5" fill="none" />
      </g>
      <circle cx="50" cy="50" r="16" fill="#ffffff" />
      <circle cx="73" cy="73" r="11.5" fill="#ffe03b" />
    </svg>
  );
};

// --- SVG ІКОНКИ ДЛЯ НАВІГАЦІЇ ТА ЛАУНЧЕРА ---
const NavIcon = ({ name, size = 18 }) => {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: { flexShrink: 0 }
  };

  switch (name) {
    case 'dispatch':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
    case 'drivers':
      return (
        <svg {...props}>
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      );
    case 'finance':
      return (
        <svg {...props}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <path d="M6 15h.01M10 15h4" />
        </svg>
      );
    case 'clients':
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'tariffs':
      return (
        <svg {...props}>
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      );
    case 'system':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'grid':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="5" height="5" rx="1" />
          <rect x="10" y="3" width="4" height="5" rx="1" />
          <rect x="16" y="3" width="5" height="5" rx="1" />
          <rect x="3" y="10" width="5" height="4" rx="1" />
          <rect x="10" y="10" width="4" height="4" rx="1" />
          <rect x="16" y="10" width="5" height="4" rx="1" />
          <rect x="3" y="16" width="5" height="5" rx="1" />
          <rect x="10" y="16" width="4" height="5" rx="1" />
          <rect x="16" y="16" width="5" height="5" rx="1" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...props}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'sidebar':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      );
    case 'chevron':
      return (
        <svg {...props} width={15} height={15}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );
    default:
      return null;
  }
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const isAdmin = user && user.role === 'ADMINISTRATOR';

  const location = useLocation();
  const navigate = useNavigate();
  const pathnameRef = useRef(location.pathname);

  // Стан бічної панелі (збереження в localStorage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('unit_sidebar_collapsed') === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Стан випадаючих меню у топбарі (Центр непрочитаних дій + Google App Launcher)
  const [actionCenterOpen, setActionCenterOpen] = useState(false);
  const [appLauncherOpen, setAppLauncherOpen] = useState(false);
  const actionCenterRef = useRef(null);
  const appLauncherRef = useRef(null);

  // Стан для SOS
  const [sosAlert, setSosAlert] = useState(false);
  const [sosList, setSosList] = useState([]);

  // Стан усіх лічильників (бейджи непрочитаних дій)
  const [badges, setBadges] = useState({
    searchingOrders: 0,
    activeOrdersTotal: 0,
    openSupportTickets: 0,
    inProgressSupportTickets: 0,
    submittedPhotoControls: 0,
    pendingRegistrations: 0,
    pendingCars: 0,
    pendingDeletions: 0,
    pendingPayouts: 0,
    pendingPayoutsAmount: 0,
    debtorDriversCount: 0,
    totalDriversDebt: 0,
    loading: false
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('unit_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Закриття поповерів при кліку поза ними
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionCenterRef.current && !actionCenterRef.current.contains(e.target)) {
        setActionCenterOpen(false);
      }
      if (appLauncherRef.current && !appLauncherRef.current.contains(e.target)) {
        setAppLauncherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    pathnameRef.current = location.pathname;
    if (location.pathname === '/news') {
      setSosAlert(false);
    }
    setMobileMenuOpen(false);
    setActionCenterOpen(false);
    setAppLauncherOpen(false);
  }, [location.pathname, location.search]);

  // --- УНІВЕРСАЛЬНЕ ЗАВАНТАЖЕННЯ ЛІЧИЛЬНИКІВ НЕПРОЧИТАНИХ ДІЙ ---
  const fetchNavigationBadges = useCallback(async () => {
    try {
      const res = await api.get('/admin/stats/navigation-badges');
      const d = res.data;
      if (d && d.drivers && d.orders) {
        setBadges({
          searchingOrders: d.orders?.searching || 0,
          activeOrdersTotal: d.orders?.activeTotal || 0,
          openSupportTickets: d.support?.openTickets || 0,
          inProgressSupportTickets: d.support?.inProgressTickets || 0,
          submittedPhotoControls: d.drivers?.submittedPhotoControls || 0,
          pendingRegistrations: d.drivers?.pendingRegistrations || 0,
          pendingCars: d.drivers?.pendingCars || 0,
          pendingDeletions: d.drivers?.pendingDeletions || 0,
          pendingPayouts: d.finance?.pendingPayouts || 0,
          pendingPayoutsAmount: d.finance?.pendingPayoutsAmount || 0,
          debtorDriversCount: d.finance?.debtorDriversCount || 0,
          totalDriversDebt: d.finance?.totalDriversDebt || 0,
          loading: false
        });
        return;
      }
    } catch (_) {
      // Резервне паралельне опитування існуючих ендпоінтів
    }

    try {
      const requests = [
        api.get('/admin/orders/active'),
        api.get('/support/admin/tickets', { params: { status: 'OPEN' } }),
        api.get('/photo-control/admin/all'),
        api.get('/admin/drivers/pending-deletion'),
        api.get('/admin/drivers/pending-registration'),
        api.get('/api/admin/payouts/pending')
      ];

      if (isAdmin) {
        requests.push(api.get('/admin/drivers/cars/pending'));
        requests.push(api.get('/admin/drivers'));
      }

      const results = await Promise.allSettled(requests);

      const activeOrdersData = results[0]?.status === 'fulfilled' ? (results[0].value.data || []) : [];
      const openTicketsData = results[1]?.status === 'fulfilled' ? (results[1].value.data || []) : [];
      const photoControlsData = results[2]?.status === 'fulfilled' ? (results[2].value.data || []) : [];
      const pendingDelData = results[3]?.status === 'fulfilled' ? (results[3].value.data || []) : [];
      const pendingRegData = results[4]?.status === 'fulfilled' ? (results[4].value.data || []) : [];
      const pendingPayoutsData = results[5]?.status === 'fulfilled' ? (results[5].value.data || []) : [];
      const pendingCarsData = (isAdmin && results[6]?.status === 'fulfilled') ? (results[6].value.data || []) : [];
      const allDriversData = (isAdmin && results[7]?.status === 'fulfilled') ? (results[7].value.data || []) : [];

      const searchingCount = Array.isArray(activeOrdersData)
        ? activeOrdersData.filter((o) => o.status === 'REQUESTED').length
        : 0;
      const submittedPcCount = Array.isArray(photoControlsData)
        ? photoControlsData.filter((p) => p.status === 'SUBMITTED').length
        : 0;
      const debtors = Array.isArray(allDriversData)
        ? allDriversData.filter((drv) => (drv.balance || 0) < 0)
        : [];
      const totalDebt = debtors.reduce((acc, drv) => acc + Math.abs(drv.balance || 0), 0);
      const payoutsSum = Array.isArray(pendingPayoutsData)
        ? pendingPayoutsData.reduce((acc, p) => acc + (p.amount || 0), 0)
        : 0;

      setBadges({
        searchingOrders: searchingCount,
        activeOrdersTotal: Array.isArray(activeOrdersData) ? activeOrdersData.length : 0,
        openSupportTickets: Array.isArray(openTicketsData)
          ? openTicketsData.filter((t) => t.status === 'OPEN').length
          : 0,
        inProgressSupportTickets: 0,
        submittedPhotoControls: submittedPcCount,
        pendingRegistrations: Array.isArray(pendingRegData) ? pendingRegData.length : 0,
        pendingCars: Array.isArray(pendingCarsData) ? pendingCarsData.length : 0,
        pendingDeletions: Array.isArray(pendingDelData) ? pendingDelData.length : 0,
        pendingPayouts: Array.isArray(pendingPayoutsData) ? pendingPayoutsData.length : 0,
        pendingPayoutsAmount: payoutsSum,
        debtorDriversCount: debtors.length,
        totalDriversDebt: totalDebt,
        loading: false
      });
    } catch (err) {
      console.error('Помилка оновлення лічильників навігації:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchNavigationBadges();
  }, [fetchNavigationBadges, location.pathname, location.search]);

  useEffect(() => {
    const interval = setInterval(fetchNavigationBadges, 15000);
    return () => clearInterval(interval);
  }, [fetchNavigationBadges]);

  // --- WEBSOCKET CONNECTION ---
  useEffect(() => {
    const wsUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8080/ws-taxi' 
      : 'https://api.unitua.com/ws-taxi';

    const stompClient = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      beforeConnect: () => {
        const currentToken = localStorage.getItem('token');
        stompClient.connectHeaders = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
      },
      onConnect: () => {
        stompClient.subscribe('/topic/admin/sos', (message) => {
          const newSos = JSON.parse(message.body);
          setSosList((prev) => [newSos, ...prev]);
          if (pathnameRef.current !== '/news') {
            setSosAlert(true);
          }
        });

        stompClient.subscribe('/topic/support/tickets', () => {
          fetchNavigationBadges();
        });

        stompClient.subscribe('/topic/admin/drivers', () => {
          fetchNavigationBadges();
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
      },
    });
    stompClient.activate();

    return () => stompClient.deactivate();
  }, [fetchNavigationBadges]);

  const sosCount = sosList.length;

  // --- СТРУКТУРА ДВОРІВНЕВОЇ НАВІГАЦІЇ ---
  const navigationGroups = useMemo(() => {
    const groups = [
      {
        id: 'dispatch',
        title: 'Операційний центр',
        icon: 'dispatch',
        badge: badges.searchingOrders + badges.openSupportTickets + (sosAlert ? Math.max(1, sosCount) : 0),
        badgeType: sosAlert ? 'danger-pulse' : (badges.searchingOrders > 0 ? 'danger' : 'info'),
        items: [
          {
            id: 'orders-active',
            label: 'Активні замовлення',
            description: 'Живий ефір та призначення авто',
            to: '/',
            matchPaths: ['/'],
            matchQuery: (search) => !search.includes('tab=archive'),
            badge: badges.searchingOrders,
            badgeType: 'danger',
            badgeTooltip: 'Замовлення в пошуку водія'
          },
          {
            id: 'orders-archive',
            label: 'Архів замовлень',
            description: 'Історія поїздок та треки на карті',
            to: '/?tab=archive',
            matchPaths: ['/'],
            matchQuery: (search) => search.includes('tab=archive'),
            badge: 0
          },
          {
            id: 'support',
            label: 'Чат підтримки',
            description: 'Звернення з Telegram-боту',
            to: '/support',
            matchPaths: ['/support'],
            badge: badges.openSupportTickets,
            badgeType: 'info',
            badgeTooltip: 'Нові відкриті тікети'
          },
          ...(isAdmin
            ? [
                {
                  id: 'news-sos',
                  label: 'Сповіщення та SOS',
                  description: 'Екстрені сигнали та новини',
                  to: '/news',
                  matchPaths: ['/news'],
                  badge: sosAlert ? Math.max(1, sosCount) : sosCount,
                  badgeType: sosAlert ? 'danger-pulse' : 'warning',
                  badgeTooltip: 'Сигнали тривоги SOS'
                }
              ]
            : [])
        ]
      },
      {
        id: 'drivers',
        title: 'Водії та Автопарк',
        icon: 'drivers',
        badge:
          badges.submittedPhotoControls +
          (isAdmin ? badges.pendingRegistrations + badges.pendingCars + badges.pendingDeletions : 0),
        badgeType: 'warning',
        items: [
          {
            id: 'drivers-all',
            label: 'База водіїв',
            description: 'Усі зареєстровані водії та картки',
            to: '/drivers',
            matchPaths: ['/drivers'],
            matchQuery: (search) => !search.includes('view=DEBTORS') && !search.includes('view=PENDING_DELETE'),
            badge: 0
          },
          {
            id: 'photo-control',
            label: 'Фотоконтроль',
            description: 'Перевірка фотографій авто та документів',
            to: '/photo-control',
            matchPaths: ['/photo-control'],
            badge: badges.submittedPhotoControls,
            badgeType: 'warning',
            badgeTooltip: 'Звіти фотоконтролю на перевірці'
          },
          ...(isAdmin
            ? [
                {
                  id: 'driver-requests',
                  label: 'Реєстрація водіїв',
                  description: 'Анкетні заявки нових водіїв',
                  to: '/driver-requests',
                  matchPaths: ['/driver-requests'],
                  badge: badges.pendingRegistrations,
                  badgeType: 'warning',
                  badgeTooltip: 'Нові анкети водіїв на модерації'
                },
                {
                  id: 'car-requests',
                  label: 'Заявки на авто',
                  description: 'Нові автомобілі на перевірці',
                  to: '/car-requests',
                  matchPaths: ['/car-requests'],
                  badge: badges.pendingCars,
                  badgeType: 'info',
                  badgeTooltip: 'Автомобілі очікують схвалення'
                },
                {
                  id: 'drivers-debtors',
                  label: 'Боржники (Баланс < 0)',
                  description: 'Водії з від’ємним балансом гаманця',
                  to: '/drivers?view=DEBTORS',
                  matchPaths: ['/drivers'],
                  matchQuery: (search) => search.includes('view=DEBTORS'),
                  badge: badges.debtorDriversCount,
                  badgeType: 'danger',
                  badgeTooltip: 'Водії із заборгованістю по комісії'
                },
                {
                  id: 'drivers-deletion',
                  label: 'Черга на видалення',
                  description: 'Запити на видалення акаунтів',
                  to: '/drivers?view=PENDING_DELETE',
                  matchPaths: ['/drivers'],
                  matchQuery: (search) => search.includes('view=PENDING_DELETE'),
                  badge: badges.pendingDeletions,
                  badgeType: 'muted'
                }
              ]
            : [])
        ]
      },
      {
        id: 'finance',
        title: 'Фінанси та Аналітика',
        icon: 'finance',
        badge: isAdmin ? badges.pendingPayouts + badges.debtorDriversCount : 0,
        badgeType: badges.pendingPayouts > 0 || badges.debtorDriversCount > 0 ? 'danger' : 'success',
        items: [
          ...(isAdmin
            ? [
                {
                  id: 'finance-main',
                  label: 'Каса та транзакції',
                  description: 'Баланс компанії, комісія та історія операцій',
                  to: '/finance',
                  matchPaths: ['/finance'],
                  matchQuery: (search) => !search.includes('tab=payouts') && !search.includes('tab=debtors'),
                  badge: 0
                },
                {
                  id: 'finance-payouts',
                  label: 'Виплати водіям (Борги)',
                  description: 'Незакриті розрахунки та виплати на карту',
                  to: '/finance?tab=payouts',
                  matchPaths: ['/finance'],
                  matchQuery: (search) => search.includes('tab=payouts'),
                  badge: badges.pendingPayouts,
                  badgeType: 'danger',
                  badgeTooltip: 'Заявки на виплату боргу водіям'
                },
                {
                  id: 'finance-debtors',
                  label: 'Заборгованість водіїв',
                  description: 'Зведення по водіях з мінусовим балансом',
                  to: '/finance?tab=debtors',
                  matchPaths: ['/finance'],
                  matchQuery: (search) => search.includes('tab=debtors'),
                  badge: badges.debtorDriversCount,
                  badgeType: 'warning',
                  badgeTooltip: 'Кількість водіїв з мінусовим балансом'
                }
              ]
            : []),
          {
            id: 'analytics',
            label: 'Аналітика сервісу',
            description: 'Графіки замовлень, виручки та скасувань',
            to: '/analytics',
            matchPaths: ['/analytics'],
            badge: 0
          }
        ]
      },
      {
        id: 'clients',
        title: 'Клієнти та Відгуки',
        icon: 'clients',
        badge: 0,
        badgeType: 'info',
        items: [
          {
            id: 'clients-list',
            label: 'База клієнтів',
            description: 'Профілі пасажирів, історія поїздок та блокування',
            to: '/clients',
            matchPaths: ['/clients', '/client-info'],
            badge: 0
          },
          ...(isAdmin
            ? [
                {
                  id: 'ratings',
                  label: 'Відгуки та рейтинг',
                  description: 'Оцінки поїздок та коментарі клієнтів',
                  to: '/ratings',
                  matchPaths: ['/ratings'],
                  badge: 0
                }
              ]
            : [])
        ]
      }
    ];

    if (isAdmin) {
      groups.push(
        {
          id: 'tariffs',
          title: 'Тарифи та Геозони',
          icon: 'tariffs',
          badge: 0,
          badgeType: 'info',
          items: [
            {
              id: 'tariffs-main',
              label: 'Тарифи автопарку',
              description: 'Базові ціни, кілометраж та класи авто',
              to: '/tariffs',
              matchPaths: ['/tariffs'],
              matchQuery: (search) => !search.includes('tab=surge'),
              badge: 0
            },
            {
              id: 'tariffs-surge',
              label: 'Коефіцієнти (Surge / Погода)',
              description: 'Години пік та автоматичні погодні множники',
              to: '/tariffs?tab=surge',
              matchPaths: ['/tariffs'],
              matchQuery: (search) => search.includes('tab=surge'),
              badge: 0
            },
            {
              id: 'sectors',
              label: 'Сектори на карті',
              description: 'Полігони геозон міста та передмістя',
              to: '/sectors',
              matchPaths: ['/sectors'],
              badge: 0
            },
            {
              id: 'services',
              label: 'Додаткові послуги',
              description: 'Опції до замовлення (кондиціонер, тварини тощо)',
              to: '/services',
              matchPaths: ['/services'],
              badge: 0
            }
          ]
        },
        {
          id: 'system',
          title: 'Маркетинг та Система',
          icon: 'system',
          badge: 0,
          badgeType: 'muted',
          items: [
            {
              id: 'promos',
              label: 'Акції та квести',
              description: 'Промо-кампанії та персональні завдання',
              to: '/promos',
              matchPaths: ['/promos'],
              badge: 0
            },
            {
              id: 'promocodes',
              label: 'Промокоди',
              description: 'Купони на знижку для клієнтів',
              to: '/promocodes',
              matchPaths: ['/promocodes'],
              badge: 0
            },
            {
              id: 'dispatchers',
              label: 'Диспетчери',
              description: 'Облікові записи операторів диспетчерської',
              to: '/dispatchers',
              matchPaths: ['/dispatchers'],
              badge: 0
            },
            {
              id: 'settings',
              label: 'Налаштування',
              description: 'Платіжні методи, іконки та причини скасувань',
              to: '/settings',
              matchPaths: ['/settings'],
              badge: 0
            }
          ]
        }
      );
    }

    return groups;
  }, [badges, isAdmin, sosAlert, sosCount]);

  // Перевірка активності конкретного підпункту
  const isSubItemActive = useCallback(
    (item) => {
      const pathMatches = item.matchPaths.includes(location.pathname);
      if (!pathMatches) return false;
      if (item.matchQuery) {
        return item.matchQuery(location.search);
      }
      return true;
    },
    [location.pathname, location.search]
  );

  const activeGroup = useMemo(() => {
    return (
      navigationGroups.find((g) => g.items.some((item) => isSubItemActive(item))) ||
      navigationGroups.find((g) => g.items.some((item) => item.matchPaths.includes(location.pathname))) ||
      navigationGroups[0]
    );
  }, [navigationGroups, isSubItemActive, location.pathname]);

  const activeSubItem = useMemo(() => {
    if (!activeGroup) return null;
    return (
      activeGroup.items.find((item) => isSubItemActive(item)) ||
      activeGroup.items.find((item) => item.matchPaths.includes(location.pathname)) ||
      activeGroup.items[0]
    );
  }, [activeGroup, isSubItemActive, location.pathname]);

  const [expandedGroups, setExpandedGroups] = useState(() => ({
    dispatch: true,
    drivers: true,
    finance: true
  }));

  useEffect(() => {
    if (activeGroup?.id) {
      setExpandedGroups((prev) => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [activeGroup?.id]);

  const handleGroupClick = (group) => {
    if (sidebarCollapsed) {
      navigate(group.items[0].to);
      return;
    }
    const isCurrentlyExpanded = !!expandedGroups[group.id];
    setExpandedGroups((prev) => ({ ...prev, [group.id]: !isCurrentlyExpanded }));
    if (activeGroup?.id !== group.id && group.items.length > 0) {
      navigate(group.items[0].to);
    }
  };

  // --- СПИСОК КАРТОК ДЛЯ "ЦЕНТРУ НЕПРОЧИТАНИХ ДІЙ" ---
  const actionItems = useMemo(() => {
    const list = [
      {
        id: 'act-sos',
        title: 'Сигнали тривоги SOS',
        subtitle: sosCount > 0 ? `Отримано ${sosCount} екстрених сигналів` : 'Активних тривог немає',
        count: sosAlert ? Math.max(1, sosCount) : sosCount,
        tone: 'danger',
        to: '/news',
        visible: isAdmin && (sosAlert || sosCount > 0)
      },
      {
        id: 'act-orders',
        title: 'Замовлення в пошуку авто',
        subtitle: `Усього активних замовлень в ефірі: ${badges.activeOrdersTotal}`,
        count: badges.searchingOrders,
        tone: 'danger',
        to: '/',
        visible: true
      },
      {
        id: 'act-payouts',
        title: 'Виплати водіям (Борги компанії)',
        subtitle:
          badges.pendingPayoutsAmount > 0
            ? `Очікують переказу на суму ${badges.pendingPayoutsAmount.toFixed(0)} ₴`
            : 'Незакриті заявки на виплату водіям',
        count: badges.pendingPayouts,
        tone: 'danger',
        to: '/finance?tab=payouts',
        visible: isAdmin
      },
      {
        id: 'act-debtors',
        title: 'Заборгованість водіїв (Баланс < 0)',
        subtitle:
          badges.totalDriversDebt > 0
            ? `Сумарний борг водіїв: ${badges.totalDriversDebt.toFixed(0)} ₴`
            : 'Водії з від’ємним балансом гаманця',
        count: badges.debtorDriversCount,
        tone: 'warning',
        to: '/finance?tab=debtors',
        visible: isAdmin
      },
      {
        id: 'act-photocontrol',
        title: 'Фотоконтроль на перевірці',
        subtitle: 'Водії надіслали фото авто та чекають схвалення',
        count: badges.submittedPhotoControls,
        tone: 'warning',
        to: '/photo-control',
        visible: true
      },
      {
        id: 'act-driver-reg',
        title: 'Реєстрація нових водіїв',
        subtitle: 'Нові анкети водіїв очікують модерації',
        count: badges.pendingRegistrations,
        tone: 'warning',
        to: '/driver-requests',
        visible: isAdmin
      },
      {
        id: 'act-car-req',
        title: 'Автомобілі на перевірці',
        subtitle: 'Заявки на додавання або зміну авто',
        count: badges.pendingCars,
        tone: 'info',
        to: '/car-requests',
        visible: isAdmin
      },
      {
        id: 'act-support',
        title: 'Нові чати техпідтримки',
        subtitle: 'Непрочитані звернення користувачів у Telegram',
        count: badges.openSupportTickets,
        tone: 'info',
        to: '/support',
        visible: true
      },
      {
        id: 'act-deletions',
        title: 'Запити на видалення акаунтів',
        subtitle: 'Водії в черзі на видалення профілю',
        count: badges.pendingDeletions,
        tone: 'muted',
        to: '/drivers?view=PENDING_DELETE',
        visible: isAdmin && badges.pendingDeletions > 0
      }
    ];
    return list.filter((item) => item.visible);
  }, [badges, isAdmin, sosAlert, sosCount]);

  const totalActionRequired = useMemo(() => {
    return actionItems.reduce((sum, item) => sum + (item.count || 0), 0);
  }, [actionItems]);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      {/* МОБІЛЬНИЙ ОВЕРЛЕЙ */}
      {mobileMenuOpen && (
        <div className="mobile-sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* ==================== ЛІВА БОКОВА ПАНЕЛЬ (SIDEBAR) ==================== */}
      <aside className={`app-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* БРЕНД-ШАПКА САЙДБАРУ З ФІРМОВИМ ЛОГОТИПОМ UNIT */}
        <div className="sidebar-brand">
          <div className="brand-logo-box" onClick={() => navigate('/')} title="На головну (Ефір)">
            <UnitBrandLogo />
            {!sidebarCollapsed && (
              <div className="brand-text">
                <span className="brand-title">Unit-App</span>
                <span className="brand-subtitle">Диспетчерський центр</span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Розгорнути панель' : 'Згорнути панель у компактний режим'}
          >
            <NavIcon name="sidebar" size={18} />
          </button>
        </div>

        {/* ВІДЖЕТ НЕПРОЧИТАНИХ ДІЙ У САЙДБАРІ */}
        <div className="sidebar-attention-box">
          <button
            type="button"
            className={`attention-summary-btn ${totalActionRequired > 0 ? 'has-alerts' : ''}`}
            onClick={() => setActionCenterOpen((prev) => !prev)}
            title="Відкрити центр непрочитаних дій"
          >
            <span className="attention-dot" />
            {!sidebarCollapsed ? (
              <>
                <span className="attention-label">
                  {totalActionRequired > 0 ? 'Потребують уваги' : 'Усі задачі виконано'}
                </span>
                <span className={`attention-count ${totalActionRequired > 0 ? 'active' : ''}`}>
                  {totalActionRequired}
                </span>
              </>
            ) : (
              <span className={`attention-count-mini ${totalActionRequired > 0 ? 'active' : ''}`}>
                {totalActionRequired}
              </span>
            )}
          </button>
        </div>

        {/* СПИСОК КАТЕГОРІЙ ТА ЗАЛЕЖНИХ СТОРІНОК */}
        <nav className="sidebar-nav-scroll">
          {navigationGroups.map((group) => {
            const isGroupActive = activeGroup?.id === group.id;
            const isExpanded = !!expandedGroups[group.id];

            return (
              <div
                key={group.id}
                className={`sidebar-group ${isGroupActive ? 'group-active' : ''} ${
                  isExpanded ? 'group-expanded' : ''
                }`}
              >
                <button
                  type="button"
                  className={`sidebar-group-header ${isGroupActive ? 'active' : ''}`}
                  onClick={() => handleGroupClick(group)}
                  title={sidebarCollapsed ? `${group.title}${group.badge ? ` (${group.badge})` : ''}` : ''}
                >
                  <span className="group-icon-wrap">
                    <NavIcon name={group.icon} size={19} />
                    {sidebarCollapsed && group.badge > 0 && (
                      <span className={`sidebar-mini-badge badge-${group.badgeType || 'info'}`}>
                        {group.badge > 99 ? '99+' : group.badge}
                      </span>
                    )}
                  </span>

                  {!sidebarCollapsed && (
                    <>
                      <span className="group-title-text">{group.title}</span>
                      {group.badge > 0 && (
                        <span className={`nav-pill-badge badge-${group.badgeType || 'info'}`}>
                          {group.badge}
                        </span>
                      )}
                      <span className={`group-chevron ${isExpanded ? 'rotated' : ''}`}>
                        <NavIcon name="chevron" size={14} />
                      </span>
                    </>
                  )}
                </button>

                {/* Вкладені залежні сторінки (Sub-Pages) */}
                {!sidebarCollapsed && isExpanded && (
                  <div className="sidebar-subitems">
                    {group.items.map((item) => {
                      const active = isSubItemActive(item);
                      return (
                        <NavLink
                          key={item.id}
                          to={item.to}
                          className={() => `sidebar-sublink ${active ? 'sublink-active' : ''}`}
                          title={item.description}
                        >
                          <span className="sublink-bullet" />
                          <span className="sublink-label">{item.label}</span>
                          {item.badge > 0 && (
                            <span
                              className={`nav-pill-badge badge-${item.badgeType || 'info'}`}
                              title={item.badgeTooltip || ''}
                            >
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* НИЖНЯ КАРТКА КОРИСТУВАЧА В САЙДБАРІ */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="user-avatar-circle">
              {(user?.fullName || user?.role || 'U').charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="user-meta-text">
                <div className="user-name-line">{user?.fullName || 'Оператор'}</div>
                <div className="user-role-badge">
                  {isAdmin ? 'Адміністратор' : 'Диспетчер'}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ==================== ПРАВА РОБОЧА ОБЛАСТЬ ==================== */}
      <div className="app-main-area">
        {/* ВЕРХНІЙ ХЕДЕР */}
        <header className="dashboard-header">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-trigger"
              onClick={() => setMobileMenuOpen(true)}
              title="Меню"
            >
              ☰
            </button>

            <div className="breadcrumbs-bar">
              <span className="breadcrumb-group">{activeGroup?.title || 'Диспетчерська'}</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">{activeSubItem?.label || 'Огляд'}</span>
              {activeSubItem?.description && (
                <span className="breadcrumb-desc">— {activeSubItem.description}</span>
              )}
            </div>
          </div>

          <div className="topbar-right">
            {(sosAlert || sosCount > 0) && (
              <button
                type="button"
                className="sos-topbar-pill"
                onClick={() => navigate('/news')}
                title="Перейти до списку SOS-сигналів"
              >
                🚨 SOS Тривога ({Math.max(1, sosCount)})
              </button>
            )}

            {/* КНОПКА "ЦЕНТР НЕПРОЧИТАНИХ ДІЙ" */}
            <div className="topbar-dropdown-wrap" ref={actionCenterRef}>
              <button
                type="button"
                className={`topbar-icon-btn action-hub-btn ${
                  totalActionRequired > 0 ? 'has-unread' : ''
                }`}
                onClick={() => {
                  setActionCenterOpen((prev) => !prev);
                  setAppLauncherOpen(false);
                }}
                title="Непрочитані дії та задачі на перевірку"
              >
                <NavIcon name="bell" size={18} />
                <span className="topbar-btn-label">Центр дій</span>
                <span
                  className={`topbar-counter-badge ${
                    totalActionRequired > 0 ? 'badge-danger' : 'badge-neutral'
                  }`}
                >
                  {totalActionRequired}
                </span>
              </button>

              {actionCenterOpen && (
                <div className="topbar-popover action-center-popover">
                  <div className="popover-header">
                    <div>
                      <strong>Непрочитані дії та модерація</strong>
                      <span className="popover-subtitle">
                        Оновлюється автоматично кожні 15 сек
                      </span>
                    </div>
                    <button
                      type="button"
                      className="popover-refresh-btn"
                      onClick={fetchNavigationBadges}
                    >
                      ↻ Оновити
                    </button>
                  </div>

                  <div className="action-center-list">
                    {actionItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`action-center-item ${item.count > 0 ? 'item-active' : ''}`}
                        onClick={() => navigate(item.to)}
                      >
                        <div className="action-item-text">
                          <span className="action-item-title">{item.title}</span>
                          <span className="action-item-sub">{item.subtitle}</span>
                        </div>
                        <span
                          className={`nav-pill-badge ${
                            item.count > 0 ? `badge-${item.tone}` : 'badge-muted'
                          }`}
                        >
                          {item.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* GOOGLE APP MANAGER LAUNCHER ("ПЛИТКА 3x3") */}
            <div className="topbar-dropdown-wrap" ref={appLauncherRef}>
              <button
                type="button"
                className={`topbar-icon-btn launcher-trigger-btn ${
                  appLauncherOpen ? 'active' : ''
                }`}
                onClick={() => {
                  setAppLauncherOpen((prev) => !prev);
                  setActionCenterOpen(false);
                }}
                title="Менеджер розділів (Швидкий перехід)"
              >
                <NavIcon name="grid" size={18} />
                <span className="topbar-btn-label">Усі розділи</span>
              </button>

              {appLauncherOpen && (
                <div className="topbar-popover app-launcher-popover">
                  <div className="popover-header">
                    <div>
                      <strong>Менеджер модулів диспетчерської</strong>
                      <span className="popover-subtitle">
                        Швидкий доступ до всіх розділів та залежних сторінок
                      </span>
                    </div>
                  </div>

                  <div className="launcher-groups-grid">
                    {navigationGroups.map((group) => (
                      <div key={group.id} className="launcher-group-card">
                        <div className="launcher-group-title">
                          <NavIcon name={group.icon} size={16} />
                          <span>{group.title}</span>
                          {group.badge > 0 && (
                            <span className={`nav-pill-badge badge-${group.badgeType || 'info'}`}>
                              {group.badge}
                            </span>
                          )}
                        </div>
                        <div className="launcher-links-list">
                          {group.items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className={`launcher-tile-btn ${
                                isSubItemActive(item) ? 'tile-active' : ''
                              }`}
                              onClick={() => navigate(item.to)}
                            >
                              <span className="tile-label">{item.label}</span>
                              {item.badge > 0 && (
                                <span
                                  className={`nav-pill-badge badge-${item.badgeType || 'info'}`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ПРОФІЛЬ ТА ВИХІД */}
            <div className="user-info">
              <span className="user-info-name">{user?.fullName}</span>
              <button type="button" className="logout-btn" onClick={logout}>
                Вийти
              </button>
            </div>
          </div>
        </header>

        {/* ==================== КОНТЕКСТНА ПАНЕЛЬ ЗАЛЕЖНИХ СТОРІНОК ==================== */}
        {activeGroup && activeGroup.items.length > 0 && (
          <nav className="dashboard-subnav" aria-label="Залежні сторінки розділу">
            <div className="subnav-tabs-list">
              {activeGroup.items.map((item) => {
                const active = isSubItemActive(item);
                return (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    className={() => `subnav-tab-pill ${active ? 'active' : ''}`}
                    title={item.description}
                  >
                    <span>{item.label}</span>
                    {item.badge > 0 && (
                      <span className={`nav-pill-badge badge-${item.badgeType || 'info'}`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        )}

        {/* ==================== ОСНОВНИЙ КОНТЕНТ СТОРІНКИ ==================== */}
        <main className="dashboard-content">
          <Routes>
            {/* Загальні роути */}
            <Route path="/" element={<OrdersPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/client-info" element={<ClientInfoPage />} />
            <Route path="/photo-control" element={<PhotoControl />} />
            
            {/* Публічний WebView роут для водія */}
            <Route path="/driver/photo-upload" element={<DriverPhotoUploadWebView />} />
            
            {/* Роути ТІЛЬКИ ДЛЯ АДМІНА */}
            {isAdmin ? (
              <>
                <Route path="/news" element={<NewsPage sosList={sosList} setSosList={setSosList} />} />
                <Route path="/ratings" element={<RatingsPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/tariffs" element={<TariffsPage />} />
                <Route path="/dispatchers" element={<DispatchersPage />} />
                <Route path="/promos" element={<PromosPage />} />
                <Route path="/promocodes" element={<PromoCodesPage />} />
                <Route path="/sectors" element={<SectorsPage />} />
                <Route path="/driver-requests" element={<DriverRequestsPage />} />
                <Route path="/car-requests" element={<CarRequestsPage />} />
                <Route path="/finance" element={<FinancePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </>
            ) : (
              <>
                {/* Захист роутів для звичайного диспетчера */}
                <Route path="/news" element={<Navigate to="/" replace />} />
                <Route path="/ratings" element={<Navigate to="/" replace />} />
                <Route path="/services" element={<Navigate to="/" replace />} />
                <Route path="/tariffs" element={<Navigate to="/" replace />} />
                <Route path="/dispatchers" element={<Navigate to="/" replace />} />
                <Route path="/promos" element={<Navigate to="/" replace />} />
                <Route path="/promocodes" element={<Navigate to="/" replace />} />
                <Route path="/sectors" element={<Navigate to="/" replace />} />
                <Route path="/car-requests" element={<Navigate to="/" replace />} />
                <Route path="/driver-requests" element={<Navigate to="/" replace />} />
                <Route path="/finance" element={<Navigate to="/" replace />} />
                <Route path="/settings" element={<Navigate to="/" replace />} />
              </>
            )}
            
            <Route path="*" element={<h2>Сторінка не знайдена</h2>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;