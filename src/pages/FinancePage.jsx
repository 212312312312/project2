import React, { useState, useEffect } from 'react';
import { getAllSettings, saveTextSettings, getCompanyBalance, getAllTransactions } from '../services/settingsService';
import '../assets/Form.css';
import '../assets/TableStyles.css'; // Убедись, что этот файл существует (он был в твоем проекте)

const FinancePage = () => {
    const [commission, setCommission] = useState('10');
    const [companyBalance, setCompanyBalance] = useState(0.0);
    const [loading, setLoading] = useState(false);

    // Стейт для таблицы транзакций
    const [transactions, setTransactions] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loadingTx, setLoadingTx] = useState(false);

    useEffect(() => {
        loadSettingsAndBalance();
        loadTransactions(0);
    }, []);

    const loadSettingsAndBalance = async () => {
        try {
            const settings = await getAllSettings();
            if (settings.driver_commission_percent) {
                setCommission(settings.driver_commission_percent);
            }
            const balanceData = await getCompanyBalance();
            if (balanceData && balanceData.totalBalance !== undefined) {
                setCompanyBalance(balanceData.totalBalance);
            }
        } catch (error) {
            console.error("Error loading finance data:", error);
        }
    };

    const loadTransactions = async (pageNum) => {
        setLoadingTx(true);
        try {
            const data = await getAllTransactions(pageNum, 20); // 20 на страницу
            setTransactions(data.content || []);
            setTotalPages(data.totalPages);
            setPage(data.currentPage);
        } catch (error) {
            console.error("Error loading transactions:", error);
        } finally {
            setLoadingTx(false);
        }
    };

    const handleSaveCommission = async () => {
        setLoading(true);
        try {
            await saveTextSettings({ driver_commission_percent: commission });
            alert("Комісію оновлено!");
        } catch (e) {
            alert("Помилка: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Хелпер для форматирования даты
    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleString('uk-UA');
    };

    // Хелпер для типа операции
    const getTypeLabel = (type) => {
        switch(type) {
            case 'DEPOSIT': return <span className="badge badge-success">Поповнення</span>;
            case 'COMMISSION': return <span className="badge badge-warning">Комісія</span>;
            case 'WITHDRAWAL': return <span className="badge badge-danger">Виведення</span>;
            case 'PENALTY': return <span className="badge badge-danger">Штраф</span>;
            case 'BONUS': return <span className="badge badge-primary">Бонус</span>;
            default: return type;
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>💰 Фінанси компанії</h2>
            </div>

            <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                
                {/* --- CARD 1: Commission Settings --- */}
                <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#2e7d32' }}>⚙️ Налаштування Комісії</h3>
                    <p style={{ color: '#666', marginBottom: '20px', fontSize: '0.9rem' }}>
                        Цей відсоток автоматично списується з балансу водія при успішному завершенні замовлення.
                    </p>

                    <div className="form-group">
                        <label style={{ fontWeight: 'bold' }}>Комісія сервісу (%):</label>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            <input 
                                type="number" 
                                step="0.1" 
                                className="form-control"
                                style={{ flex: 1 }}
                                value={commission} 
                                onChange={(e) => setCommission(e.target.value)}
                            />
                            <button 
                                className="btn-primary" 
                                onClick={handleSaveCommission}
                                disabled={loading}
                            >
                                {loading ? "Збереження..." : "Зберегти"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- CARD 2: Company Wallet --- */}
                <div className="card" style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px dashed #ccc', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#555' }}>🏦 Дохід Компанії</h3>
                    <p style={{ fontSize: '0.9rem', color: '#666' }}>Накопичена комісія за весь час (віртуальна)</p>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#333', margin: '10px 0' }}>
                        {companyBalance.toFixed(2)} ₴
                    </div>
                    <small style={{ color: '#2e7d32' }}>
                        * Це сума всіх списаних комісій. Реальні гроші знаходяться на рахунку LiqPay.
                    </small>
                </div>
            </div>

            {/* --- ТАБЛИЦА ИСТОРИИ ТРАНЗАКЦИЙ --- */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3>📜 Історія транзакцій</h3>
                    <button className="btn-secondary" onClick={() => loadTransactions(0)}>🔄 Оновити</button>
                </div>
                
                {loadingTx ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Завантаження...</div>
                ) : (
                    <>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Дата</th>
                                    <th>Водій</th>
                                    <th>Тип</th>
                                    <th>Сума</th>
                                    <th>Опис</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length > 0 ? (
                                    transactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td>{tx.id}</td>
                                            <td>{formatDate(tx.createdAt)}</td>
                                            <td>
                                                <div>{tx.driverName}</div>
                                                <small style={{color: '#888'}}>{tx.driverPhone}</small>
                                            </td>
                                            <td>{getTypeLabel(tx.operationType)}</td>
                                            <td style={{ 
                                                fontWeight: 'bold', 
                                                color: tx.amount >= 0 ? '#2e7d32' : '#c62828' 
                                            }}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} ₴
                                            </td>
                                            <td>{tx.description}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                                            Транзакцій не знайдено
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Пагинация */}
                        <div className="pagination" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                            <button 
                                className="btn-secondary" 
                                disabled={page === 0} 
                                onClick={() => loadTransactions(page - 1)}
                            >
                                ← Назад
                            </button>
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                                Сторінка {page + 1} з {totalPages || 1}
                            </span>
                            <button 
                                className="btn-secondary" 
                                disabled={page >= totalPages - 1} 
                                onClick={() => loadTransactions(page + 1)}
                            >
                                Вперед →
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default FinancePage;