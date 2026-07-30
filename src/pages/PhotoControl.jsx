import React, { useEffect, useState, useMemo } from 'react';
import { photoControlService } from '../services/photoControlService';

const PhotoControl = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Вкладки: 'SUBMITTED' (На перевірці), 'PENDING' (Очікує фото), 'ARCHIVE' (Архів)
  const [activeTab, setActiveTab] = useState('SUBMITTED');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await photoControlService.getAllPhotoControls();
      setItems(data || []);
    } catch (err) {
      alert('Помилка завантаження даних фотоконтролю');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Фильтрация элементов по вкладкам
  const submittedItems = useMemo(() => {
    return items.filter(item => item.status === 'SUBMITTED');
  }, [items]);

  const pendingItems = useMemo(() => {
    return items.filter(item => item.status === 'PENDING');
  }, [items]);

  const archiveItems = useMemo(() => {
    return items.filter(item => ['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(item.status));
  }, [items]);

  const displayedItems = useMemo(() => {
    if (activeTab === 'SUBMITTED') return submittedItems;
    if (activeTab === 'PENDING') return pendingItems;
    return archiveItems;
  }, [activeTab, submittedItems, pendingItems, archiveItems]);

  const isArchiveTab = activeTab === 'ARCHIVE';

  const toggleRow = (id) => {
    // В архиве запрещаем раскрывать детали
    if (isArchiveTab) return;

    if (expandedId === id) {
      setExpandedId(null);
      setRejectReason('');
    } else {
      setExpandedId(id);
      setRejectReason('');
    }
  };

  const handleReview = async (id, approved) => {
    if (!approved && !rejectReason.trim()) {
      alert('Будь ласка, вкажіть причину відмови');
      return;
    }

    try {
      await photoControlService.reviewPhotoControl(id, approved, rejectReason);
      setExpandedId(null);
      setRejectReason('');
      loadData();
    } catch (err) {
      alert('Помилка обробки фотоконтролю');
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Ви впевнені, що хочете скасувати цей запит на фотоконтроль?')) {
      try {
        await photoControlService.cancelPhotoControl(id);
        if (expandedId === id) setExpandedId(null);
        loadData();
      } catch (err) {
        alert('Помилка скасування: ' + err.message);
      }
    }
  };

  const renderStatusBadge = (status) => {
    const badgeStyles = {
      padding: '0.35rem 0.75rem',
      borderRadius: '12px',
      fontSize: '0.85rem',
      fontWeight: '700',
      display: 'inline-block',
      whiteSpace: 'nowrap'
    };

    switch (status) {
      case 'PENDING':
        return (
          <span style={{ ...badgeStyles, backgroundColor: '#fef3c7', color: '#d97706' }}>
            Очікує фото
          </span>
        );
      case 'SUBMITTED':
        return (
          <span style={{ ...badgeStyles, backgroundColor: '#e0f2fe', color: '#0369a1' }}>
            На перевірці
          </span>
        );
      case 'APPROVED':
        return (
          <span style={{ ...badgeStyles, backgroundColor: '#dcfce7', color: '#15803d' }}>
            Схвалено
          </span>
        );
      case 'REJECTED':
        return (
          <span style={{ ...badgeStyles, backgroundColor: '#fee2e2', color: '#b91c1c' }}>
            Відхилено
          </span>
        );
      case 'EXPIRED':
        return (
          <span style={{ ...badgeStyles, backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }}>
            Прострочено
          </span>
        );
      case 'CANCELLED':
        return (
          <span style={{ ...badgeStyles, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
            Скасовано
          </span>
        );
      default:
        return <span style={badgeStyles}>{status}</span>;
    }
  };

  const renderPhotoCard = (label, url) => (
    <div>
      <div className="photo-card-label">{label}</div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="photo-card-link">
          <img src={url} alt={label} className="photo-card-img" />
        </a>
      ) : (
        <div className="photo-card-placeholder">Немає фото</div>
      )}
    </div>
  );

  return (
    <div className="page-wrapper">
      {/* ШАПКА СТРАНИЦЫ */}
      <header className="page-header">
        <div className="header-title-group">
          <h1>Модерація Фотоконтролю</h1>
          <span className="count-badge">{displayedItems.length}</span>
        </div>

        <div className="header-actions">
          {/* ВКЛАДКИ */}
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${activeTab === 'SUBMITTED' ? 'active' : ''}`}
              onClick={() => { setActiveTab('SUBMITTED'); setExpandedId(null); }}
            >
              На перевірці ({submittedItems.length})
            </button>
            <button
              type="button"
              className={`toggle-btn ${activeTab === 'PENDING' ? 'active' : ''}`}
              onClick={() => { setActiveTab('PENDING'); setExpandedId(null); }}
            >
              Очікує фото ({pendingItems.length})
            </button>
            <button
              type="button"
              className={`toggle-btn ${activeTab === 'ARCHIVE' ? 'active' : ''}`}
              onClick={() => { setActiveTab('ARCHIVE'); setExpandedId(null); }}
            >
              Архів ({archiveItems.length})
            </button>
          </div>

          <button className="btn btn-secondary" onClick={loadData}>
            Оновити
          </button>
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      {loading ? (
        <div className="empty-state-card">
          <p className="text-subtle">Завантаження даних...</p>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="empty-state-card">
          <p className="text-subtle">
            {activeTab === 'SUBMITTED' && 'Заявок на перевірці немає'}
            {activeTab === 'PENDING' && 'Запитів, що очікують на завантаження фото, немає'}
            {activeTab === 'ARCHIVE' && 'Архівні записи відсутні'}
          </p>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="main-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '900px' }}>
              <thead>
                <tr>
                  <th className="text-center" style={{ width: '70px' }}>ID</th>
                  <th style={{ width: '250px' }}>Водій</th>
                  <th style={{ width: '160px' }}>Статус</th>
                  <th style={{ width: '200px' }}>Дедлайн</th>
                  <th className="text-center" style={{ width: '160px' }}>Дії</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item) => {
                  const isExpanded = expandedId === item.id && !isArchiveTab;
                  return (
                    <React.Fragment key={item.id}>
                      {/* ОСНОВНАЯ СТРОКА */}
                      <tr
                        className={`${!isArchiveTab ? 'clickable-row' : ''} ${isExpanded ? 'row-expanded' : ''}`}
                        onClick={() => toggleRow(item.id)}
                      >
                        <td className="text-center font-medium">#{item.id}</td>
                        <td>
                          <div className="font-medium" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.driverName || 'Водій'}
                          </div>
                          <div className="text-subtle text-sm">ID водія: {item.driverId}</div>
                        </td>
                        <td>{renderStatusBadge(item.status)}</td>
                        <td>
                          {item.deadlineAt
                            ? new Date(item.deadlineAt).toLocaleString('uk-UA')
                            : '—'}
                        </td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          {!isArchiveTab ? (
                            <div className="btn-group justify-center">
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => toggleRow(item.id)}
                              >
                                {isExpanded ? 'Згорнути' : 'Деталі'}
                              </button>
                              {item.status === 'PENDING' && (
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleCancel(item.id)}
                                >
                                  Скасувати
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-subtle">—</span>
                          )}
                        </td>
                      </tr>

                      {/* РАСКРЫВАЮЩАЯСЯ ДЕТАЛЬНАЯ КАРТОЧКА (ТОЛЬКО ДЛЯ АКТИВНЫХ ВНОСОВ) */}
                      {isExpanded && (
                        <tr className="expanded-details-row">
                          <td colSpan="5" className="p-0">
                            <div className="expanded-content-box">
                              <div className="expanded-header-bar">
                                <h3 className="expanded-title">
                                  Фотоконтроль водія: {item.driverName} (ID: {item.driverId})
                                </h3>
                                <div className="expanded-actions">
                                  {renderStatusBadge(item.status)}
                                </div>
                              </div>

                              {/* СЕТКА С ФОТОГРАФИЯМИ */}
                              <div className="photos-section">
                                <div className="docs-subtitle">Знімки автомобіля та салону</div>
                                <div className="photos-grid">
                                  {renderPhotoCard('Спереду', item.frontUrl)}
                                  {renderPhotoCard('Ззаду', item.backUrl)}
                                  {renderPhotoCard('Зліва', item.leftUrl)}
                                  {renderPhotoCard('Справа', item.rightUrl)}
                                  {renderPhotoCard('Салон спереду', item.interiorFrontUrl)}
                                  {renderPhotoCard('Салон ззаду', item.interiorBackUrl)}
                                </div>
                              </div>

                              {/* ФОРМА ПРИНЯТИЯ РЕШЕНИЯ */}
                              {item.status === 'SUBMITTED' && (
                                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                                  <div className="input-group-field" style={{ marginBottom: '1rem' }}>
                                    <label className="field-label">Причина відмови (в разі відхилення)</label>
                                    <textarea
                                      className="input-field"
                                      placeholder="Вкажіть причину..."
                                      rows="2"
                                      value={rejectReason}
                                      onChange={(e) => setRejectReason(e.target.value)}
                                    />
                                  </div>

                                  <div className="btn-group">
                                    <button
                                      className="btn btn-outline-success"
                                      onClick={() => handleReview(item.id, true)}
                                    >
                                      Схвалити фотоконтроль
                                    </button>
                                    <button
                                      className="btn btn-outline-danger"
                                      onClick={() => handleReview(item.id, false)}
                                    >
                                      Відхилити
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoControl;