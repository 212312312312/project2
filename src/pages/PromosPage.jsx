import React, { useState, useEffect } from 'react';
import { 
  getAllPromos, createPromo, deletePromo, 
  getAllPromoPlans, createPromoPlan, deletePromoPlan, togglePromoPlan 
} from '../services/promoService';
import Modal from '../components/Modal';
import PromoForm from '../components/PromoForm';

const PromosPage = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Кастомные стейты для глобальных календарных планов
  const [plans, setPlans] = useState([]);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({ 
    title: '', description: '', startDate: '', endDate: '', maxUses: '' // <- ДОБАВЛЕНО maxUses
  });

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const data = await getAllPromos();
      setPromos(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const planData = await getAllPromoPlans();
      setPlans(planData);
    } catch (e) {
      console.error(e.message);
    }
  };

  useEffect(() => {
    fetchPromos();
    fetchPlans();
  }, []);

  const handleCreate = async (data) => {
    try {
      setIsSubmitting(true);
      await createPromo(data);
      setIsModalOpen(false);
      fetchPromos();
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Видалити цю акцію? Клієнти втратять прогрес по ній.")) {
      try {
        await deletePromo(id);
        fetchPromos();
      } catch (e) {
        alert(e.message);
      }
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      // Форматирование дат под Kotlin LocalDateTime (ISO-8601 формат)
      const planData = {
        ...newPlan,
        startDate: newPlan.startDate ? `${newPlan.startDate}:00` : new Date().toISOString(),
        endDate: newPlan.endDate ? `${newPlan.endDate}:00` : new Date().toISOString(),
        maxUses: newPlan.maxUses ? parseInt(newPlan.maxUses) : null, // <- ДОБАВЛЕНО
        isActive: true
      };
      await createPromoPlan(planData);
      setIsPlanModalOpen(false);
      setNewPlan({ title: '', description: '', startDate: '', endDate: '', maxUses: '' }); // <- ИСПРАВЛЕНО
      fetchPlans();
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePlan = async (id, currentStatus) => {
    try {
      await togglePromoPlan(id, !currentStatus);
      fetchPlans();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeletePlan = async (id) => {
    if (window.confirm("Видалити цей акційний план? Всі клієнти втратять доступ до безкоштовної мінімалки.")) {
      try {
        await deletePromoPlan(id);
        fetchPlans();
      } catch (e) {
        alert(e.message);
      }
    }
  };

  return (
    <div className="table-page-container">
      <div className="table-header">
        <h2>Акційні завдання</h2>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          + Створити акцію
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Назва</th>
              <th>Опис</th>
              <th>Умова</th>
              <th>Тариф</th>
              <th>Знижка</th>
              <th>Термін дії</th>
              <th>Макс. сума</th>
              <th>Ліміт місць</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {promos.length > 0 ? promos.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td><strong>{p.title}</strong></td>
                <td>{p.description}</td>
                <td>
                  {p.requiredDistanceMeters > 0 ? (
                    <span style={{color: '#2196F3', fontWeight: 'bold'}}>
                      {(p.requiredDistanceMeters / 1000).toFixed(1)} км
                    </span>
                  ) : (
                    <span>{p.requiredRides} поїздок</span>
                  )}
                </td>
                <td>
                  {p.requiredTariff ? (
                    <span className="status-online">{p.requiredTariff.name}</span>
                  ) : (
                    "— Будь-який —"
                  )}
                </td>
                <td>{p.discountPercent}%</td>
                <td style={{textAlign: 'center'}}>
                  {p.activeDaysDuration && p.activeDaysDuration > 0 ? (
                    <span className="badge badge-warning" style={{
                        background: '#fff3cd', 
                        color: '#856404',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.9em'
                    }}>
                      {p.activeDaysDuration} дн.
                    </span>
                  ) : (
                    <span style={{color: '#aaa'}}>∞</span>
                  )}
                </td>
                <td>
                  {p.maxDiscountAmount ? (
                    <span>до {p.maxDiscountAmount} грн</span>
                  ) : (
                    <span style={{color: '#aaa'}}>∞</span>
                  )}
                </td>
                <td>
                  {p.maxAllocations ? (
                    <span style={{fontWeight: 'bold', color: '#e91e63'}}>{p.maxAllocations} чол.</span>
                  ) : (
                    <span style={{color: '#aaa'}}>∞</span>
                  )}
                </td>
                <td>
                  <button className="btn-danger" onClick={() => handleDelete(p.id)}>
                    Видалити
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="10">Акцій немає. Створіть першу!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- СЕКЦИЯ ГЛОБАЛЬНЫХ ПЛАНОВ БЕСПЛАТНОЙ МИНИМАЛКИ --- */}
      <hr style={{ margin: '40px 0', border: '0', borderTop: '1px solid #eee' }} />

      <div className="table-header">
        <h2>Глобальні плани: Безкоштовна мінімалка</h2>
        <button className="btn-primary" style={{ background: '#4CAF50' }} onClick={() => setIsPlanModalOpen(true)}>
          + Додати план скидок
        </button>
      </div>

      <div className="table-container" style={{ marginBottom: '40px' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Назва плану</th>
              <th>Опис</th>
              <th>Дата початку</th>
              <th>Дата завершення</th>
              <th>Ліміт активацій</th>
              <th>Статус</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {plans.length > 0 ? plans.map(plan => (
              <tr key={plan.id}>
                <td>{plan.id}</td>
                <td><strong>{plan.title}</strong></td>
                <td>{plan.description || 'Без опису'}</td>
                <td>{new Date(plan.startDate).toLocaleString()}</td>
                <td>{new Date(plan.endDate).toLocaleString()}</td>
                <td>
                  {plan.maxUses ? (
                    <span style={{fontWeight: 'bold', color: '#4CAF50'}}>{plan.maxUses} актт.</span>
                  ) : (
                    <span style={{color: '#aaa'}}>∞</span>
                  )}
                </td>
                <td>
                  <span className={plan.isActive ? "status-online" : "status-offline"} style={{ marginRight: '10px' }}>
                    {plan.isActive ? 'Активний' : 'Вимкнено'}
                  </span>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '2px 6px', fontSize: '0.85em' }}
                    onClick={() => handleTogglePlan(plan.id, plan.isActive)}
                  >
                    {plan.isActive ? 'Вимкнути' : 'Увімкнути'}
                  </button>
                </td>
                <td>
                  <button className="btn-danger" onClick={() => handleDeletePlan(plan.id)}>
                    Видалити
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="8">Календарних планів немає. Створіть перший!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Модалка оригинальных акций-заданий */}
      <Modal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Нова Акція"
      >
        <PromoForm 
          onSubmit={handleCreate}
          onCancel={() => setIsModalOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Модалка создания глобального календарного плана */}
      <Modal 
        isOpen={isPlanModalOpen} 
        onClose={() => setIsPlanModalOpen(false)} 
        title="Новий Календарний План"
      >
        <form onSubmit={handleCreatePlan} className="form-container">
          <div className="form-group">
            <label>Назва акції</label>
            <input 
              type="text" 
              required 
              value={newPlan.title} 
              onChange={e => setNewPlan({...newPlan, title: e.target.value})} 
              placeholder="Наприклад: Акція на першу поїздку UNIT"
            />
          </div>
          <div className="form-group">
            <label>Опис для клиенту в додатку</label>
            <textarea 
              value={newPlan.description} 
              onChange={e => setNewPlan({...newPlan, description: e.target.value})} 
              placeholder="Мінімальна вартість поїздки 0 грн! Доплачуємо только за км."
            />
          </div>
          <div className="form-group">
            <label>Дата початку акції</label>
            <input 
              type="datetime-local" 
              required 
              value={newPlan.startDate} 
              onChange={e => setNewPlan({...newPlan, startDate: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label>Дата закінчення акції</label>
            <input 
              type="datetime-local" 
              required 
              value={newPlan.endDate} 
              onChange={e => setNewPlan({...newPlan, endDate: e.target.value})} 
            />
          </div>
          
          <div className="form-group">
            <label>Глобальний ліміт активацій (Кількість планів)</label>
            <input 
              type="number" min="1"
              value={newPlan.maxUses} 
              onChange={e => setNewPlan({...newPlan, maxUses: e.target.value})} 
              placeholder="Пусто = без обмежень"
            />
            <small style={{color: '#666', display: 'block', marginTop: '4px'}}>
              Скільки всього клієнтів в системі встигнуть скористатися планом
            </small>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsPlanModalOpen(false)}>
              Скасувати
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Збереження...' : 'Зберегти план'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PromosPage;