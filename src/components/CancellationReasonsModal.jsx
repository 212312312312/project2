import React, { useState, useEffect } from 'react';
import { getCancellationReasons, createCancellationReason, deleteCancellationReason } from '../services/cancellationReasonService';
import '../assets/Modal.css'; 

const CancellationReasonsModal = ({ onClose, target }) => {
    const [reasons, setReasons] = useState([]);
    const [newText, setNewText] = useState('');
    const [newPenalty, setNewPenalty] = useState(50); 
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchReasons();
    }, [target]);

    const fetchReasons = async () => {
        try {
            const data = await getCancellationReasons(target);
            setReasons(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newText.trim()) return;
        setLoading(true);
        try {
            await createCancellationReason(newText.trim(), newPenalty, target);
            setNewText('');
            setNewPenalty(50);
            fetchReasons();
        } catch (e) {
            alert('Помилка при створенні: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Ви впевнені, що хочете видалити цю причину?')) return;
        try {
            await deleteCancellationReason(id);
            fetchReasons();
        } catch (e) {
            alert('Помилка при видаленні: ' + e.message);
        }
    };

    const isClient = target === 'CLIENT';

    return (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="modal-content" style={{ maxWidth: '580px', width: '100%', boxSizing: 'border-box' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                        ⛔ Причини скасування ({isClient ? 'Клієнти' : 'Водії'})
                    </h3>
                    <button className="close-button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>
                        &times;
                    </button>
                </div>
                
                <div className="modal-body" style={{ padding: 0 }}>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px', lineHeight: '1.4' }}>
                        {isClient 
                            ? 'Клієнт зможе обрати одну з цих причин у додатку при скасуванні замовлення. Штрафи для клієнтів не застосовуються.'
                            : 'Водій зможе обрати одну з цих причин при скасуванні замовлення. Якщо штраф > 0, рейтинг водія буде знижено автоматично.'}
                    </p>

                    {/* Форма додавання */}
                    <form onSubmit={handleAdd} style={{ 
                        display: 'grid', 
                        gridTemplateColumns: isClient ? '1fr auto' : '1fr 90px auto', 
                        gap: '10px', 
                        alignItems: 'end',
                        marginBottom: '16px', 
                        padding: '12px', 
                        background: '#f8fafc', 
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        boxSizing: 'border-box'
                    }}>
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                                Текст причини
                            </label>
                            <input 
                                type="text" 
                                className="input-field" 
                                value={newText} 
                                onChange={e => setNewText(e.target.value)} 
                                placeholder={isClient ? "Напр: Довго чекати машину" : "Напр: Клієнт не вийшов"}
                                required
                                style={{ margin: 0, width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                        
                        {!isClient && (
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                                    Штраф
                                </label>
                                <input 
                                    type="number" 
                                    className="input-field" 
                                    value={newPenalty} 
                                    onChange={e => setNewPenalty(e.target.value)}
                                    style={{ margin: 0, width: '100%', boxSizing: 'border-box', textAlign: 'center' }}
                                />
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            disabled={loading} 
                            style={{ height: '38px', padding: '0 16px', whiteSpace: 'nowrap', fontWeight: 600 }}
                        >
                            {loading ? '...' : '+ Додати'}
                        </button>
                    </form>

                    {/* Таблиця причин (без скролу і з чіткими пропорціями) */}
                    <div style={{ 
                        maxHeight: '340px', 
                        overflowY: 'auto', 
                        overflowX: 'hidden', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        boxSizing: 'border-box'
                    }}>
                        <table style={{ 
                            width: '100%', 
                            minWidth: 'unset', 
                            maxWidth: '100%', 
                            tableLayout: 'fixed', 
                            borderCollapse: 'collapse', 
                            margin: 0 
                        }}>
                            <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.8rem', color: '#475569', fontWeight: 700, width: isClient ? '75%' : '58%' }}>
                                        Причина
                                    </th>
                                    {!isClient && (
                                        <th style={{ padding: '10px 6px', textAlign: 'center', fontSize: '0.8rem', color: '#475569', fontWeight: 700, width: '20%' }}>
                                            Штраф
                                        </th>
                                    )}
                                    <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.8rem', color: '#475569', fontWeight: 700, width: isClient ? '25%' : '22%' }}>
                                        Дія
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {reasons.map(r => (
                                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '10px 12px', fontSize: '0.88rem', color: '#0f172a', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.3' }}>
                                            {r.reasonText}
                                        </td>
                                        {!isClient && (
                                            <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, fontSize: '0.88rem', color: r.penaltyScore > 0 ? '#dc2626' : '#16a34a' }}>
                                                {r.penaltyScore > 0 ? `-${r.penaltyScore}` : '0'}
                                            </td>
                                        )}
                                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                            <button 
                                                style={{ 
                                                    padding: '5px 10px', 
                                                    fontSize: '0.78rem', 
                                                    fontWeight: 600, 
                                                    border: '1px solid #fecaca', 
                                                    backgroundColor: '#fef2f2', 
                                                    color: '#b91c1c', 
                                                    borderRadius: '6px', 
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onClick={() => handleDelete(r.id)}
                                            >
                                                Видалити
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {reasons.length === 0 && (
                                    <tr>
                                        <td colSpan={isClient ? "2" : "3"} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                                            Список порожній. Додайте першу причину.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CancellationReasonsModal;