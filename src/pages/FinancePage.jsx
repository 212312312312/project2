import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getAllSettings, saveTextSettings, getCompanyBalance, getAllTransactions } from '../services/settingsService';
import { getAllDrivers } from '../services/driverService';
import { DriverPayoutsPanel } from '../components/DriverPayoutsPanel';
import '../assets/FinancePage.css';

const FinancePage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const getTabFromUrl = (params) => {
        const t = (params.get('tab') || '').toLowerCase();
        if (t === 'payouts') return 'PAYOUTS';
        if (t === 'debtors') return 'DEBTORS';
        return 'ANALYTICS';
    };

    const [activeTab, setActiveTab] = useState(() => getTabFromUrl(searchParams)); // 'ANALYTICS' | 'PAYOUTS' | 'DEBTORS'
    const [commission, setCommission] = useState('10');
    const [companyBalance, setCompanyBalance] = useState(0.0);
    const [loading, setLoading] = useState(false);

    // Стейт для таблиці транзакцій
    const [transactions, setTransactions] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loadingTx, setLoadingTx] = useState(false);

    // Стейт для списку водіїв-боржників (balance < 0)
    const [debtors, setDebtors] = useState([]);
    const [loadingDebtors, setLoadingDebtors] = useState(false);

    useEffect(() => {
        setActiveTab(getTabFromUrl(searchParams));
    }, [searchParams]);

    const handleTabSwitch = (nextTab) => {
        setActiveTab(nextTab);
        if (nextTab === 'PAYOUTS') {
            setSearchParams({ tab: 'payouts' });
        } else if (nextTab === 'DEBTORS') {
            setSearchParams({ tab: 'debtors' });
        } else {
            setSearchParams({});
        }
    };

    useEffect(() => {
        loadSettingsAndBalance();
        loadTransactions(0);
        loadDebtors();
    }, []);

    const loadSettingsAndBalance = async () => {
        try {
            const settings = await getAllSettings();
            if (settings && settings.driver_commission_percent) {
                setCommission(settings.driver_commission_percent);
            }
            const balanceData = await getCompanyBalance();
            if (balanceData && balanceData.totalBalance !== undefined) {
                setCompanyBalance(balanceData.totalBalance);
            }
        } catch (error) {
            console.error("Помилка завантаження фінансових даних:", error);
        }
    };

    const loadTransactions = async (pageNum) => {
        setLoadingTx(true);
        try {
            const data = await getAllTransactions(pageNum, 20);
            setTransactions(data.content || []);
            setTotalPages(data.totalPages || 0);
            setPage(data.currentPage || pageNum);
        } catch (error) {
            console.error("Помилка завантаження транзакцій:", error);
        } finally {
            setLoadingTx(false);
        }
    };

    const loadDebtors = async () => {
        setLoadingDebtors(true);
        try {
            const allDrivers = await getAllDrivers();
            const debtorList = (Array.isArray(allDrivers) ? allDrivers : [])
                .filter((d) => (d.balance || 0) < 0)
                .sort((a, b) => (a.balance || 0) - (b.balance || 0));
            setDebtors(debtorList);
        } catch (error) {
            console.error("Помилка завантаження боржників:", error);
        } finally {
            setLoadingDebtors(false);
        }
    };

    const handleSaveCommission = async () => {
        setLoading(true);
        try {
            await saveTextSettings({ driver_commission_percent: commission });
            alert("Комісію успішно оновлено!");
        } catch (e) {
            alert("Помилка: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        return new Date(dateString).toLocaleString('uk-UA', {
            dateStyle: 'short',
            timeStyle: 'short'
        });
    };

    const getTypeBadge = (type) => {
        switch(type) {
            case 'DEPOSIT': return <span className="badge badge-success">Поповнення</span>;
            case 'COMMISSION': return <span className="badge badge-info">Комісія</span>;
            case 'WITHDRAWAL': return <span className="badge badge-danger">Виведення</span>;
            case 'PENALTY': return <span className="badge badge-danger">Штраф</span>;
            case 'BONUS': return <span className="badge badge-success">Бонус</span>;
            default: return <span className="badge badge-muted">{type}</span>;
        }
    };

    const handleRefreshAll = () => {
        loadSettingsAndBalance();
        loadTransactions(0);
        loadDebtors();
    };

    const totalDebtSum = debtors.reduce((acc, d) => acc + Math.abs(d.balance || 0), 0);

    return (
        <div className="page-wrapper">
            <header className="page-header">
                <div className="header-title-group">
                    <h1>Фінанси компанії</h1>
                </div>
                <button className="btn btn-secondary" onClick={handleRefreshAll}>
                    Оновити дані
                </button>
            </header>

            {/* ПЕРЕМИКАЧ ЗАЛЕЖНИХ ФІНАНСОВИХ РОЗДІЛІВ */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button
                    className={`payouts-subtab-btn ${activeTab === 'ANALYTICS' ? 'active' : ''}`}
                    onClick={() => handleTabSwitch('ANALYTICS')}
                >
                    📊 Загальна фінансова статистика
                </button>
                <button
                    className={`payouts-subtab-btn ${activeTab === 'PAYOUTS' ? 'active' : ''}`}
                    onClick={() => handleTabSwitch('PAYOUTS')}
                >
                    💸 Виплати водіям (Борги компанії)
                </button>
                <button
                    className={`payouts-subtab-btn ${activeTab === 'DEBTORS' ? 'active' : ''}`}
                    onClick={() => handleTabSwitch('DEBTORS')}
                >
                    ⚠️ Заборгованість водіїв ({debtors.length})
                </button>
            </div>

            {activeTab === 'ANALYTICS' && (
                <>
                    {/* ВЕРХНІ КАРТКИ: КОМІСІЯ ТА БАЛАНС */}
                    <div className="finance-grid-top mb-4">
                        
                        {/* НАЛАШТУВАННЯ КОМІСІЇ */}
                        <div className="card">
                            <h3 className="card-title">Налаштування комісії</h3>
                            <p className="text-subtle text-sm mb-3">
                                Цей відсоток автоматично списується з балансу водія при успішному завершенні замовлення.
                            </p>

                            <div className="input-group-field">
                                <label className="field-label">Комісія сервісу (%)</label>
                                <div className="inline-input-action">
                                    <input 
                                        type="number" 
                                        step="0.1" 
                                        className="input-field"
                                        value={commission} 
                                        onChange={(e) => setCommission(e.target.value)}
                                        placeholder="10"
                                    />
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={handleSaveCommission}
                                        disabled={loading}
                                    >
                                        {loading ? "Збереження..." : "Зберегти"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ДОХІД КОМПАНІЇ */}
                        <div className="card metric-card">
                            <div>
                                <span className="card-subtitle">Дохід компанії</span>
                                <div className="metric-primary text-primary mt-1">
                                    {companyBalance.toFixed(2)} ₴
                                </div>
                                <p className="text-subtle text-sm mt-1">
                                    Накопичена комісія за весь час (віртуальний баланс)
                                </p>
                            </div>
                            <div className="finance-note">
                                * Сума всіх списаних комісій. Реальні гроші знаходяться на рахунку LiqPay.
                            </div>
                        </div>

                    </div>

                    {/* ТАБЛИЦЯ ІСТОРІЇ ТРАНЗАКЦІЙ */}
                    <div className="table-card">
                        <div className="table-card-header">
                            <h3 className="table-title">Історія транзакцій</h3>
                            <button className="btn btn-sm btn-secondary" onClick={() => loadTransactions(page)}>
                                Оновити історію
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table className="main-table finance-table">
                                <thead>
                                    <tr>
                                        <th className="text-center">ID</th>
                                        <th>Дата</th>
                                        <th>Водій</th>
                                        <th className="text-center">Тип</th>
                                        <th className="text-center">Сума</th>
                                        <th>Опис</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingTx ? (
                                        <tr>
                                            <td colSpan="6" className="text-center text-subtle py-8">
                                                Завантаження транзакцій...
                                            </td>
                                        </tr>
                                    ) : transactions.length > 0 ? (
                                        transactions.map(tx => (
                                            <tr key={tx.id}>
                                                <td className="text-center text-subtle">{tx.id}</td>
                                                <td className="text-subtle text-sm">{formatDate(tx.createdAt)}</td>
                                                <td>
                                                    <div className="font-medium">{tx.driverName || "Система"}</div>
                                                    <div className="text-subtle text-sm">{tx.driverPhone || "—"}</div>
                                                </td>
                                                <td className="text-center">{getTypeBadge(tx.operationType)}</td>
                                                <td className={`text-center font-medium ${tx.amount >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} ₴
                                                </td>
                                                <td className="tx-desc-cell">{tx.description || "—"}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="text-center text-subtle py-8">
                                                Транзакцій не знайдено
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Пагінація */}
                        {totalPages > 1 && (
                            <div className="pagination-bar">
                                <button 
                                    className="btn btn-sm btn-secondary" 
                                    disabled={page === 0 || loadingTx} 
                                    onClick={() => loadTransactions(page - 1)}
                                >
                                    Назад
                                </button>
                                <span className="pagination-info">
                                    Сторінка {page + 1} з {totalPages}
                                </span>
                                <button 
                                    className="btn btn-sm btn-secondary" 
                                    disabled={page >= totalPages - 1 || loadingTx} 
                                    onClick={() => loadTransactions(page + 1)}
                                >
                                    Вперед
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'PAYOUTS' && (
                <DriverPayoutsPanel />
            )}

            {activeTab === 'DEBTORS' && (
                <div className="table-card">
                    <div className="table-card-header">
                        <div>
                            <h3 className="table-title">Водії з від’ємним балансом гаманця ({debtors.length})</h3>
                            <span className="text-subtle" style={{ fontSize: '0.85rem' }}>
                                Сумарна заборгованість перед сервісом: <strong className="text-danger">{totalDebtSum.toFixed(2)} ₴</strong>
                            </span>
                        </div>
                        <button className="btn btn-sm btn-secondary" onClick={loadDebtors}>
                            Оновити список
                        </button>
                    </div>

                    <div className="table-responsive">
                        <table className="main-table">
                            <thead>
                                <tr>
                                    <th className="text-center" style={{ width: '70px' }}>ID</th>
                                    <th>ПІБ Водія</th>
                                    <th>Телефон</th>
                                    <th className="text-center">Автомобіль</th>
                                    <th className="text-center">Статус</th>
                                    <th className="text-center">Поточний борг</th>
                                    <th className="text-center" style={{ width: '190px' }}>Дія</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingDebtors ? (
                                    <tr>
                                        <td colSpan="7" className="text-center text-subtle py-8">
                                            Завантаження списку боржників...
                                        </td>
                                    </tr>
                                ) : debtors.length > 0 ? (
                                    debtors.map((driver) => (
                                        <tr key={driver.id}>
                                            <td className="text-center text-subtle">#{driver.id}</td>
                                            <td className="font-medium">{driver.fullName}</td>
                                            <td>
                                                <a href={`tel:${driver.phoneNumber}`} className="phone-link">
                                                    {driver.phoneNumber || '—'}
                                                </a>
                                            </td>
                                            <td className="text-center">
                                                {driver.car
                                                    ? `${driver.car.make} ${driver.car.model} (${driver.car.plateNumber || '—'})`
                                                    : '—'}
                                            </td>
                                            <td className="text-center">
                                                {driver.isBlocked ? (
                                                    <span className="badge badge-danger">Заблоковано</span>
                                                ) : (
                                                    <span className="badge badge-info">Активний</span>
                                                )}
                                            </td>
                                            <td className="text-center font-medium text-danger">
                                                {(driver.balance || 0).toFixed(2)} ₴
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => navigate(`/drivers?openId=${driver.id}&wallet=1`)}
                                                >
                                                    Відкрити гаманець
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center text-subtle py-8">
                                            Немає водіїв із заборгованістю по балансу
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancePage;