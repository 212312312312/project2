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
  
  // Кастомні стейти для глобальних календарних планів
  const [plans, setPlans] = useState([]);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({ 
    planType: 'REGISTRATION_DISCOUNT', // 'REGISTRATION_DISCOUNT' або 'FREE_MINIMUM'
    title: '', 
    description: '', 
    discountPercent: '20',
    maxDiscountAmount: '50',
    validityHours: '72',
    startDate: '', 
    endDate: '', 
    maxUses: '',
    estimatedMinFare: '75', // для калькулятора мінімалки
    testTripFare: '150'     // для живого прорахунку в калькуляторі
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
      const isReg = newPlan.planType === 'REGISTRATION_DISCOUNT';
      const planData = {
        title: newPlan.title,
        description: newPlan.description,
        planType: newPlan.planType,
        discountPercent: isReg ? (parseFloat(newPlan.discountPercent) || null) : null,
        maxDiscountAmount: isReg ? (parseFloat(newPlan.maxDiscountAmount) || null) : null,
        validityHours: isReg ? (parseInt(newPlan.validityHours) || null) : null,
        startDate: newPlan.startDate ? `${newPlan.startDate}:00` : new Date().toISOString(),
        endDate: newPlan.endDate ? `${newPlan.endDate}:00` : new Date().toISOString(),
        maxUses: newPlan.maxUses ? parseInt(newPlan.maxUses) : null,
        isActive: true
      };
      await createPromoPlan(planData);
      setIsPlanModalOpen(false);
      setNewPlan({ 
        planType: 'REGISTRATION_DISCOUNT',
        title: '', 
        description: '', 
        discountPercent: '20',
        maxDiscountAmount: '50',
        validityHours: '72',
        startDate: '', 
        endDate: '', 
        maxUses: '',
        estimatedMinFare: '75',
        testTripFare: '150'
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
    if (window.confirm("Видалити цей акційний план?")) {
      try {
        await deletePromoPlan(id);
        fetchPlans();
      } catch (e) {
        alert(e.message);
      }
    }
  };

  // Розрахунки для калькулятора
  const planUses = parseInt(newPlan.maxUses) || 0;
  const minFare = parseFloat(newPlan.estimatedMinFare) || 0;
  const discountPercent = parseFloat(newPlan.discountPercent) || 0;
  const maxDiscount = parseFloat(newPlan.maxDiscountAmount) || 0;
  const testFare = parseFloat(newPlan.testTripFare) || 0;

  // Симуляція разової поїздки при реєстрації
  const simDiscount = maxDiscount > 0 
    ? Math.min(testFare * (discountPercent / 100), maxDiscount)
    : testFare * (discountPercent / 100);
  const simClientPays = Math.max(1, Math.round(testFare - simDiscount));
  const simComp = Math.round(testFare - simClientPays);

  // Граничний бюджет кампанії
  const maxRegBudget = planUses > 0 && maxDiscount > 0 ? planUses * maxDiscount : null;
  const maxFreeMinBudget = planUses > 0 && minFare > 0 ? planUses * minFare : null;

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
      {/* --- СЕКЦІЯ 1: АКЦІЙНІ ЗАВДАННЯ --- */}
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
          <table className="main-table" style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th className="text-center" style={{ width: '45px', whiteSpace: 'nowrap' }}>ID</th>
                <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Назва</th>
                <th style={{ minWidth: '150px' }}>Опис</th>
                <th className="text-center" style={{ width: '110px', whiteSpace: 'nowrap' }}>Умова</th>
                <th className="text-center" style={{ width: '110px', whiteSpace: 'nowrap' }}>Тариф</th>
                <th className="text-center" style={{ width: '80px', whiteSpace: 'nowrap' }}>Знижка</th>
                <th className="text-center" style={{ width: '130px', whiteSpace: 'nowrap' }}>Термін завдання</th>
                <th className="text-center" style={{ width: '110px', whiteSpace: 'nowrap' }}>Дія знижки</th>
                <th className="text-center" style={{ width: '100px', whiteSpace: 'nowrap' }}>Макс. сума</th>
                <th className="text-center" style={{ width: '100px', whiteSpace: 'nowrap' }}>Ліміт місць</th>
                <th className="text-center" style={{ width: '90px', whiteSpace: 'nowrap' }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {promos.length > 0 ? (
                promos.map(p => (
                  <tr key={p.id}>
                    <td className="text-center text-subtle" style={{ whiteSpace: 'nowrap' }}>#{p.id}</td>
                    <td style={{ fontWeight: 500 }}>{p.title}</td>
                    <td className="text-subtle" style={{ fontSize: '0.88rem' }}>{p.description || '—'}</td>
                    <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                      {p.requiredDistanceMeters > 0 ? (
                        <span className="font-medium text-primary">
                          {(p.requiredDistanceMeters / 1000).toFixed(1)} км
                        </span>
                      ) : (
                        <span className="font-medium">{p.requiredRides} поїздок</span>
                      )}
                    </td>
                    <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                      {p.requiredTariff ? (
                        <span className="badge badge-success">{p.requiredTariff.name}</span>
                      ) : (
                        <span className="text-subtle">— Будь-який —</span>
                      )}
                    </td>
                    <td className="text-center font-medium text-success" style={{ whiteSpace: 'nowrap' }}>
                      {p.discountPercent}%
                    </td>
                    <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                      {p.expiresAt ? (
                        <span className="badge badge-primary" title={new Date(p.expiresAt).toLocaleString()}>
                          до {new Date(p.expiresAt).toLocaleDateString()}
                        </span>
                      ) : p.taskDurationDays ? (
                        <span className="badge badge-primary">{p.taskDurationDays} дн.</span>
                      ) : (
                        <span className="text-subtle">∞</span>
                      )}
                    </td>
                    <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                      {p.activeDaysDuration && p.activeDaysDuration > 0 ? (
                        <span className="badge badge-warning">{p.activeDaysDuration} дн.</span>
                      ) : (
                        <span className="text-subtle">∞</span>
                      )}
                    </td>
                    <td className="text-center font-medium" style={{ whiteSpace: 'nowrap' }}>
                      {p.maxDiscountAmount ? <span>до {p.maxDiscountAmount} ₴</span> : <span className="text-subtle">∞</span>}
                    </td>
                    <td className="text-center font-medium" style={{ whiteSpace: 'nowrap' }}>
                      {p.maxAllocations ? <span className="text-danger">{p.maxAllocations} чол.</span> : <span className="text-subtle">∞</span>}
                    </td>
                    <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-sm btn-ghost-danger" onClick={() => handleDelete(p.id)}>
                        Видалити
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="text-center text-subtle py-8">
                    Акцій немає. Створіть першу акцію!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- СЕКЦІЯ 2: ГЛОБАЛЬНІ ПЛАНИ --- */}
      <header className="page-header">
        <div className="header-title-group">
          <h1>Глобальні плани акцій</h1>
          <span className="count-badge">{plans.length}</span>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setIsPlanModalOpen(true)}>
            + Додати глобальний план
          </button>
        </div>
      </header>

      <div className="table-card">
        <div className="table-responsive">
          <table className="main-table">
            <thead>
              <tr>
                <th className="text-center" style={{ width: '45px' }}>ID</th>
                <th>Тип плану</th>
                <th>Назва та опис</th>
                <th className="text-center">Знижка</th>
                <th className="text-center">Час для клієнта</th>
                <th className="text-center">Період акції</th>
                <th className="text-center">Ліміт активацій</th>
                <th className="text-center">Статус</th>
                <th className="text-center" style={{ width: '180px' }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {plans.length > 0 ? (
                plans.map(plan => {
                  const isReg = plan.planType === 'REGISTRATION_DISCOUNT';
                  return (
                    <tr key={plan.id}>
                      <td className="text-center text-subtle">#{plan.id}</td>
                      <td>
                        {isReg ? (
                          <span className="badge badge-primary">Знижка при реєстрації</span>
                        ) : (
                          <span className="badge badge-warning">Безкоштовна мінімалка</span>
                        )}
                      </td>
                      <td>
                        <strong className="font-medium">{plan.title}</strong>
                        <div className="text-subtle" style={{ fontSize: '0.82rem', marginTop: '2px' }}>
                          {plan.description || 'Без опису'}
                        </div>
                      </td>
                      <td className="text-center font-medium">
                        {isReg ? (
                          <span className="text-success">
                            {plan.discountPercent}% {plan.maxDiscountAmount ? `(до ${plan.maxDiscountAmount} ₴)` : ''}
                          </span>
                        ) : (
                          <span className="text-success">100% (подача 0 ₴)</span>
                        )}
                      </td>
                      <td className="text-center text-subtle" style={{ fontSize: '0.85rem' }}>
                        {isReg && plan.validityHours ? `${plan.validityHours} год.` : 'До кінця акції'}
                      </td>
                      <td className="text-center text-subtle" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {new Date(plan.startDate).toLocaleDateString()} — {new Date(plan.endDate).toLocaleDateString()}
                      </td>
                      <td className="text-center font-medium">
                        {plan.maxUses ? (
                          <span className="text-primary">{plan.maxUses} акт.</span>
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="text-center text-subtle py-8">
                    Глобальних планів немає. Створіть перший план!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка завдань */}
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

      {/* Модалка глобального плану з калькулятором */}
      <Modal 
        isOpen={isPlanModalOpen} 
        onClose={() => setIsPlanModalOpen(false)} 
        title="Створення глобального акційного плану"
      >
        <form onSubmit={handleCreatePlan} className="modal-form">
          <div className="form-section">
            <h3 className="form-section-title">Тип та основна інформація</h3>
            
            <div className="form-grid-2col">
              <div className="form-group span-2">
                <label className="form-label">Тип глобального плану *</label>
                <select 
                  className="input-field font-medium"
                  value={newPlan.planType}
                  onChange={e => setNewPlan({
                    ...newPlan, 
                    planType: e.target.value,
                    title: e.target.value === 'REGISTRATION_DISCOUNT' ? 'Знижка новачкам 20%' : 'Безкоштовна мінімалка',
                    description: e.target.value === 'REGISTRATION_DISCOUNT' 
                      ? 'Отримайте 20% знижки на першу поїздку після реєстрації!'
                      : 'Мінімальна вартість поїздки 0 грн! Оплачується тільки кілометраж.'
                  })}
                >
                  <option value="REGISTRATION_DISCOUNT">🎁 Знижка з відсотком при реєстрації</option>
                  <option value="FREE_MINIMUM">🚀 Безкоштовна мінімалка (подача 0 грн)</option>
                </select>
              </div>

              <div className="form-group span-2">
                <label className="form-label">Назва акційного плану *</label>
                <input 
                  type="text" 
                  className="input-field"
                  required 
                  value={newPlan.title} 
                  onChange={e => setNewPlan({...newPlan, title: e.target.value})} 
                  placeholder="Наприклад: Вітальна знижка 20% для новачків"
                />
              </div>

              <div className="form-group span-2">
                <label className="form-label">Опис для мобільного додатку</label>
                <textarea 
                  className="input-field"
                  style={{ minHeight: '65px', resize: 'vertical' }}
                  value={newPlan.description} 
                  onChange={e => setNewPlan({...newPlan, description: e.target.value})} 
                  placeholder="Текст, який пасажир бачить у розділі Акції"
                />
              </div>
            </div>
          </div>

          {/* НАЛАШТУВАННЯ ПАРАМЕТРІВ ЗНИЖКИ */}
          {newPlan.planType === 'REGISTRATION_DISCOUNT' ? (
            <div className="form-section">
              <h3 className="form-section-title">Параметри знижки при реєстрації</h3>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">Відсоток знижки (%) *</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100"
                    required
                    className="input-field"
                    value={newPlan.discountPercent} 
                    onChange={e => setNewPlan({...newPlan, discountPercent: e.target.value})} 
                    placeholder="20"
                  />
                  <span className="form-hint">Скільки % скидається від суми замовлення</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Макс. сума знижки (не більше ніж, грн)</label>
                  <input 
                    type="number" 
                    min="1"
                    className="input-field"
                    value={newPlan.maxDiscountAmount} 
                    onChange={e => setNewPlan({...newPlan, maxDiscountAmount: e.target.value})} 
                    placeholder="50"
                  />
                  <span className="form-hint">Стеля компенсації на поїздку (пусто = без ліміту)</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Час дії після реєстрації (годин)</label>
                  <input 
                    type="number" 
                    min="1"
                    className="input-field"
                    value={newPlan.validityHours} 
                    onChange={e => setNewPlan({...newPlan, validityHours: e.target.value})} 
                    placeholder="72"
                  />
                  <span className="form-hint">За скільки годин згорить персональна знижка</span>
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
                  <span className="form-hint">Загальна кількість використань усіма клієнтами</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="form-section">
              <h3 className="form-section-title">Параметри мінімалки</h3>
              <div className="form-grid-2col">
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
                </div>
                <div className="form-group">
                  <label className="form-label">Середня вартість мінімалки (грн)</label>
                  <input 
                    type="number" 
                    min="1"
                    className="input-field"
                    value={newPlan.estimatedMinFare} 
                    onChange={e => setNewPlan({...newPlan, estimatedMinFare: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* ПЕРІОД ДІЇ АКЦІЇ */}
          <div className="form-section">
            <h3 className="form-section-title">Період проведення кампанії</h3>
            <div className="form-grid-2col">
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
            </div>

            {/* --- КАЛЬКУЛЯТОР ДЛЯ ЗНИЖКИ ПРИ РЕЄСТРАЦІЇ --- */}
            {newPlan.planType === 'REGISTRATION_DISCOUNT' ? (
              <div className="budget-calculator" style={{ marginTop: '1.2rem' }}>
                <div className="budget-calculator-header">
                  <h4 className="budget-calculator-title">🧮 Інтерактивний калькулятор знижки</h4>
                  <span className="budget-calculator-badge">Симуляція замовлення</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.88rem' }}>Приклад вартості поїздки:</span>
                  <input 
                    type="number"
                    min="10"
                    step="10"
                    className="input-field"
                    style={{ width: '100px', padding: '4px 8px' }}
                    value={newPlan.testTripFare}
                    onChange={e => setNewPlan({...newPlan, testTripFare: e.target.value})}
                  />
                  <span style={{ fontSize: '0.88rem' }}>грн</span>
                </div>

                <div className="budget-grid">
                  <div className="budget-metric">
                    <span className="budget-metric-label">Клієнт платить:</span>
                    <span className="budget-metric-value">{simClientPays} ₴</span>
                  </div>
                  <div className="budget-metric">
                    <span className="budget-metric-label">Знижка клієнта:</span>
                    <span className="budget-metric-value text-success">{simComp} ₴</span>
                  </div>
                  <div className="budget-metric">
                    <span className="budget-metric-label">Граничний бюджет кампанії:</span>
                    <span className="budget-metric-value highlight">
                      {maxRegBudget ? `${maxRegBudget.toLocaleString()} ₴` : '∞ (без ліміту)'}
                    </span>
                  </div>
                </div>
                {newPlan.validityHours && (
                  <p className="budget-description" style={{ marginTop: '8px', fontSize: '0.8rem' }}>
                    ⏱️ Клієнт повинен здійснити поїздку протягом <strong>{newPlan.validityHours} год.</strong> з моменту створення акаунту.
                  </p>
                )}
              </div>
            ) : (
              /* КАЛЬКУЛЯТОР ДЛЯ БЕЗКОШТОВНОЇ МІНІМАЛКИ */
              planUses > 0 ? (
                <div className="budget-calculator" style={{ marginTop: '1.2rem' }}>
                  <div className="budget-calculator-header">
                    <h4 className="budget-calculator-title">📊 Фінансовий розрахунок мінімалки</h4>
                    <span className="budget-calculator-badge">Бюджет зафіксовано</span>
                  </div>
                  <div className="budget-grid">
                    <div className="budget-metric">
                      <span className="budget-metric-label">Ліміт активацій:</span>
                      <span className="budget-metric-value">{planUses.toLocaleString()} поїздок</span>
                    </div>
                    <div className="budget-metric">
                      <span className="budget-metric-label">Вартість подачі:</span>
                      <span className="budget-metric-value">~{minFare} ₴</span>
                    </div>
                    <div className="budget-metric">
                      <span className="budget-metric-label">Макс. виплата автопарку:</span>
                      <span className="budget-metric-value highlight">{maxFreeMinBudget?.toLocaleString()} ₴</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="budget-calculator warning" style={{ marginTop: '1.2rem' }}>
                  <div className="budget-calculator-header">
                    <h4 className="budget-calculator-title">⚠️ Необмежений глобальний план</h4>
                    <span className="budget-calculator-badge">Увага</span>
                  </div>
                  <p className="budget-description">
                    Ліміт активацій не встановлено. Усі клієнти здійснюватимуть поїздки з нульовою мінімалкою без обмеження загального бюджету.
                  </p>
                </div>
              )
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