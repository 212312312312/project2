import React, { useState, useEffect } from 'react';
import { 
  getAllPromos, createPromo, deletePromo, 
  getAllPromoPlans, createPromoPlan, deletePromoPlan, togglePromoPlan 
} from '../services/promoService';
import Modal from '../components/Modal';
import PromoForm from '../components/PromoForm';
import '../assets/Form.css';

const PromosPage = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Кастомные стейты для глобальных календарных планов
  const [plans, setPlans] = useState([]);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({ 
    title: '', 
    description: '', 
    startDate: '', 
    endDate: '', 
    maxUses: '',
    estimatedMinFare: '75' // Базовая стоимость минималки по умолчанию для калькулятора
  });

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const data = await getAllPromos();
      setPromos(Array.isArray(data) ? data : []);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const planData = await getAllPromoPlans();
      setPlans(Array.isArray(planData) ? planData : []);
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
      const planData = {
        title: newPlan.title,
        description: newPlan.description,
        startDate: newPlan.startDate ? `${newPlan.startDate}:00` : new Date().toISOString(),
        endDate: newPlan.endDate ? `${newPlan.endDate}:00` : new Date().toISOString(),
        maxUses: newPlan.maxUses ? parseInt(newPlan.maxUses) : null,
        isActive: true
      };
      await createPromoPlan(planData);
      setIsPlanModalOpen(false);
      setNewPlan({ 
        title: '', 
        description: '', 
        startDate: '', 
        endDate: '', 
        maxUses: '',
        estimatedMinFare: '75'
      });
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

  // Расчеты для калькулятора глобального плана
  const planUses = parseInt(newPlan.maxUses) || 0;
  const minFare = parseFloat(newPlan.estimatedMinFare) || 0;
  const maxPlanBudget = planUses > 0 && minFare > 0 ? planUses * minFare : null;

  // Расчет продолжительности плана
  let planDurationHours = null;
  if (newPlan.startDate && newPlan.endDate) {
    const diffMs = new Date(newPlan.endDate) - new Date(newPlan.startDate);
    if (diffMs > 0) {
      planDurationHours = Math.round(diffMs / (1000 * 60 * 60));
    }
  }

  if (loading) return <div className="loading-spinner">Завантаження акцій...</div>;

  return (
    <div className="page-wrapper">
      {/* --- СЕКЦИЯ 1: АКЦИОННЫЕ ЗАДАНИЯ --- */}
      <header className="page-header">
        <div className="header-title-group">
          <h1>Акційні завдання</h1>
          <span className="count-badge">{promos.length}</span>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Створити акцію
          </button>
        </div>
      </header>

      <div className="table-card" style={{ marginBottom: '2.5rem' }}>
        <div className="table-responsive">
          <table className="main-table">
            <thead>
              <tr>
                <th className="text-center" style={{ width: '50px' }}>ID</th>
                <th>Назва</th>
                <th>Опис</th>
                <th className="text-center">Умова</th>
                <th className="text-center">Тариф</th>
                <th className="text-center">Знижка</th>
                <th className="text-center">Термін дії</th>
                <th className="text-center">Макс. сума</th>
                <th className="text-center">Ліміт місць</th>
                <th className="text-center" style={{ width: '120px' }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {promos.length > 0 ? (
                promos.map(p => (
                  <tr key={p.id}>
                    <td className="text-center text-subtle">#{p.id}</td>
                    <td>
                      <strong className="font-medium">{p.title}</strong>
                    </td>
                    <td className="text-subtle" style={{ fontSize: '0.88rem' }}>{p.description || '—'}</td>
                    <td className="text-center">
                      {p.requiredDistanceMeters > 0 ? (
                        <span className="font-medium text-primary">
                          {(p.requiredDistanceMeters / 1000).toFixed(1)} км
                        </span>
                      ) : (
                        <span className="font-medium">{p.requiredRides} поїздок</span>
                      )}
                    </td>
                    <td className="text-center">
                      {p.requiredTariff ? (
                        <span className="badge badge-success">{p.requiredTariff.name}</span>
                      ) : (
                        <span className="text-subtle">— Будь-який —</span>
                      )}
                    </td>
                    <td className="text-center font-medium text-success">{p.discountPercent}%</td>
                    <td className="text-center">
                      {p.activeDaysDuration && p.activeDaysDuration > 0 ? (
                        <span className="badge badge-warning">
                          {p.activeDaysDuration} дн.
                        </span>
                      ) : (
                        <span className="text-subtle">∞</span>
                      )}
                    </td>
                    <td className="text-center font-medium">
                      {p.maxDiscountAmount ? (
                        <span>до {p.maxDiscountAmount} ₴</span>
                      ) : (
                        <span className="text-subtle">∞</span>
                      )}
                    </td>
                    <td className="text-center font-medium">
                      {p.maxAllocations ? (
                        <span className="text-danger">{p.maxAllocations} чол.</span>
                      ) : (
                        <span className="text-subtle">∞</span>
                      )}
                    </td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-ghost-danger" onClick={() => handleDelete(p.id)}>
                        Видалити
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="text-center text-subtle py-8">
                    Акцій немає. Створіть першу акцію!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- СЕКЦИЯ 2: ГЛОБАЛЬНЫЕ ПЛАНЫ БЕСПЛАТНОЙ МИНИМАЛКИ --- */}
      <header className="page-header">
        <div className="header-title-group">
          <h1>Глобальні плани: Безкоштовна мінімалка</h1>
          <span className="count-badge">{plans.length}</span>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setIsPlanModalOpen(true)}>
            + Додати план знижок
          </button>
        </div>
      </header>

      <div className="table-card">
        <div className="table-responsive">
          <table className="main-table">
            <thead>
              <tr>
                <th className="text-center" style={{ width: '50px' }}>ID</th>
                <th>Назва плану</th>
                <th>Опис</th>
                <th className="text-center">Дата початку</th>
                <th className="text-center">Дата завершення</th>
                <th className="text-center">Ліміт активацій</th>
                <th className="text-center">Статус</th>
                <th className="text-center" style={{ width: '210px' }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {plans.length > 0 ? (
                plans.map(plan => (
                  <tr key={plan.id}>
                    <td className="text-center text-subtle">#{plan.id}</td>
                    <td>
                      <strong className="font-medium">{plan.title}</strong>
                    </td>
                    <td className="text-subtle" style={{ fontSize: '0.88rem' }}>{plan.description || 'Без опису'}</td>
                    <td className="text-center text-subtle" style={{ fontSize: '0.85rem' }}>
                      {new Date(plan.startDate).toLocaleString()}
                    </td>
                    <td className="text-center text-subtle" style={{ fontSize: '0.85rem' }}>
                      {new Date(plan.endDate).toLocaleString()}
                    </td>
                    <td className="text-center font-medium">
                      {plan.maxUses ? (
                        <span className="text-success">{plan.maxUses} акт.</span>
                      ) : (
                        <span className="text-subtle">∞</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={`badge ${plan.isActive ? 'badge-success' : 'badge-muted'}`}>
                        {plan.isActive ? 'АКТИВНИЙ' : 'ВИМКНЕНО'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="btn-group justify-center">
                        <button 
                          className={`btn btn-sm ${plan.isActive ? 'btn-outline' : 'btn-ghost'}`}
                          onClick={() => handleTogglePlan(plan.id, plan.isActive)}
                        >
                          {plan.isActive ? 'Вимкнути' : 'Увімкнути'}
                        </button>
                        <button className="btn btn-sm btn-ghost-danger" onClick={() => handleDeletePlan(plan.id)}>
                          Видалити
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center text-subtle py-8">
                    Календарних планів немає. Створіть перший план!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка акций-заданий */}
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

      {/* Модалка создания глобального календарного плана с калькулятором */}
      <Modal 
        isOpen={isPlanModalOpen} 
        onClose={() => setIsPlanModalOpen(false)} 
        title="Новий Календарний План: Безкоштовна мінімалка"
      >
        <form onSubmit={handleCreatePlan} className="modal-form">
          <div className="form-section">
            <h3 className="form-section-title">Параметри календарного плану</h3>
            
            <div className="form-grid-2col">
              <div className="form-group span-2">
                <label className="form-label">Назва акційного плану *</label>
                <input 
                  type="text" 
                  className="input-field"
                  required 
                  value={newPlan.title} 
                  onChange={e => setNewPlan({...newPlan, title: e.target.value})} 
                  placeholder="Наприклад: Безкоштовний старт у вихідні"
                />
              </div>

              <div className="form-group span-2">
                <label className="form-label">Опис для клієнтського додатку</label>
                <textarea 
                  className="input-field"
                  style={{ minHeight: '65px', resize: 'vertical' }}
                  value={newPlan.description} 
                  onChange={e => setNewPlan({...newPlan, description: e.target.value})} 
                  placeholder="Мінімальна вартість поїздки 0 грн! Оплачується тільки кілометраж."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Дата початку акції *</label>
                <input 
                  type="datetime-local" 
                  className="input-field"
                  required 
                  value={newPlan.startDate} 
                  onChange={e => setNewPlan({...newPlan, startDate: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Дата завершення акції *</label>
                <input 
                  type="datetime-local" 
                  className="input-field"
                  required 
                  value={newPlan.endDate} 
                  onChange={e => setNewPlan({...newPlan, endDate: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Глобальний ліміт активацій (поїздок)</label>
                <input 
                  type="number" 
                  min="1"
                  className="input-field"
                  value={newPlan.maxUses} 
                  onChange={e => setNewPlan({...newPlan, maxUses: e.target.value})} 
                  placeholder="Пусто = без обмежень"
                />
                <span className="form-hint">Загальна кількість безкоштовних мінімалок</span>
              </div>

              <div className="form-group">
                <label className="form-label">Середня вартість мінімалки (грн)</label>
                <input 
                  type="number" 
                  min="1"
                  className="input-field"
                  value={newPlan.estimatedMinFare} 
                  onChange={e => setNewPlan({...newPlan, estimatedMinFare: e.target.value})} 
                  placeholder="Напр. 75"
                />
                <span className="form-hint">Використовується для розрахунку компенсацій водіям</span>
              </div>
            </div>

            {/* --- КАЛЬКУЛЯТОР ВЫПЛАТ ДЛЯ БЕСПЛАТНОЙ МИНИМАЛКИ --- */}
            {planUses > 0 ? (
              <div className="budget-calculator">
                <div className="budget-calculator-header">
                  <h4 className="budget-calculator-title">📊 Фінансовий розрахунок навантаження</h4>
                  <span className="budget-calculator-badge">Бюджет зафіксовано</span>
                </div>
                <p className="budget-description">
                  При використанні ліміту в <strong>{planUses.toLocaleString()}</strong> безкоштовних мінімалок 
                  {planDurationHours ? ` за період ${planDurationHours} год.` : ''}, максимальна сума компенсацій автопарку складе:
                </p>
                <div className="budget-grid">
                  <div className="budget-metric">
                    <span className="budget-metric-label">Ліміт активацій:</span>
                    <span className="budget-metric-value">{planUses.toLocaleString()} поїздок</span>
                  </div>
                  <div className="budget-metric">
                    <span className="budget-metric-label">Вартість мінімалки:</span>
                    <span className="budget-metric-value">~{minFare} ₴</span>
                  </div>
                  <div className="budget-metric">
                    <span className="budget-metric-label">Макс. виплата водіям:</span>
                    <span className="budget-metric-value highlight">{maxPlanBudget?.toLocaleString()} ₴</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="budget-calculator warning">
                <div className="budget-calculator-header">
                  <h4 className="budget-calculator-title">⚠️ Необмежений глобальний план</h4>
                  <span className="budget-calculator-badge">Високий ризик</span>
                </div>
                <p className="budget-description">
                  Ліміт активацій не встановлено. Усі клієнти у вказаний проміжок часу здійснюватимуть поїздки з нульовою мінімалкою, а повна вартість мінімального тарифу компенсуватиметься сервісом без обмеження суми ($\infty$).
                </p>
              </div>
            )}
          </div>

          <div className="form-actions justify-end">
            <button type="button" className="btn btn-secondary" onClick={() => setIsPlanModalOpen(false)}>
              Скасувати
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Збереження...' : 'Зберегти план'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PromosPage;