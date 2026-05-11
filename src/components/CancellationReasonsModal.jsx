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
    }, [target]); // Перезавантажуємо, якщо змінюється target

    const fetchReasons = async () => {
        try {
            const data = await getCancellationReasons(target);
            setReasons(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newText) return;
        setLoading(true);
        try {
            await createCancellationReason(newText, newPenalty, target);
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
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h3>⛔ Причини скасування ({isClient ? 'Клієнти' : 'Водії'})</h3>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                
                <div className="modal-body">
                    <p style={{fontSize: '0.9em', color: '#666', marginBottom: '15px'}}>
                        {isClient 
                            ? 'Клієнт зможе обрати одну з цих причин у додатку при скасуванні замовлення. Штрафи для клієнтів не застосовуються.'
                            : 'Водій зможе обрати одну з цих причин при скасуванні замовлення. Якщо штраф > 0, рейтинг водія буде знижено автоматично.'}
                    </p>

                    {/* Форма додавання */}
                    <form onSubmit={handleAdd} style={{ 
                        display: 'flex', 
                        gap: '10px', 
                        marginBottom: '20px', 
                        padding: '15px', 
                        background: '#f8f9fa', 
                        borderRadius: '8px',
                        border: '1px solid #eee'
                    }}>
                        <div style={{ flex: 2 }}>
                            <label style={{ fontSize: '0.85em', fontWeight: 'bold' }}>Текст причини</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                value={newText} 
                                onChange={e => setNewText(e.target.value)} 
                                placeholder={isClient ? "Напр: Довго чекати машину" : "Напр: Клієнт не вийшов"}
                                required
                                style={{ width: '100%', marginTop: '5px' }}
                            />
                        </div>
                        
                        {!isClient && (
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.85em', fontWeight: 'bold' }}>Штраф (бали)</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    value={newPenalty} 
                                    onChange={e => setNewPenalty(e.target.value)}
                                    style={{ width: '100%', marginTop: '5px' }}
                                />
                            </div>
                        )}

                        <div style={{ alignSelf: 'flex-end' }}>
                            <button type="submit" className="btn-primary" disabled={loading} style={{ height: '38px' }}>
                                {loading ? '...' : '+ Додати'}
                            </button>
                        </div>
                    </form>

                    {/* Список існуючих причин */}
                    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#eee', position: 'sticky', top: 0 }}>
                                <tr>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Причина</th>
                                    {!isClient && <th style={{ padding: '10px', textAlign: 'center' }}>Штраф</th>}
                                    <th style={{ padding: '10px', textAlign: 'right' }}>Дія</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reasons.map(r => (
                                    <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: '10px' }}>{r.reasonText}</td>
                                        {!isClient && (
                                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: r.penaltyScore > 0 ? '#d32f2f' : '#388e3c' }}>
                                                {r.penaltyScore > 0 ? `-${r.penaltyScore}` : '0'}
                                            </td>
                                        )}
                                        <td style={{ padding: '10px', textAlign: 'right' }}>
                                            <button 
                                                className="btn-secondary" 
                                                style={{ padding: '4px 10px', backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2' }}
                                                onClick={() => handleDelete(r.id)}
                                            >
                                                Видалити
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {reasons.length === 0 && (
                                    <tr>
                                        <td colSpan={isClient ? "2" : "3"} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
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