import React, { useState, useEffect, useRef } from 'react';
import { supportService } from '../services/supportService';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import '../assets/SupportPage.css';

const SupportPage = () => {
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState('ACTIVE'); // ACTIVE, IN_PROGRESS, NO_MSG, CLOSED
  const messagesEndRef = useRef(null);

  const loadTickets = async () => {
    try {
      const res = await supportService.getTickets();
      setTickets(res.data);
    } catch (e) {
      console.error('Помилка завантаження тікетів:', e);
    }
  };

  const loadMessages = async (ticketId) => {
    try {
      const res = await supportService.getTicketMessages(ticketId);
      setMessages(res.data);
    } catch (e) {
      console.error('Помилка завантаження повідомлень:', e);
    }
  };

  useEffect(() => {
    loadTickets();

    const wsUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:8080/ws-taxi'
      : 'https://api.unitua.com/ws-taxi';
    const socket = new SockJS(wsUrl);
    const token = localStorage.getItem('token');

    const stompClient = new Client({
      webSocketFactory: () => socket,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        stompClient.subscribe('/topic/support/tickets', () => {
          loadTickets();
        });
      }
    });

    stompClient.activate();
    return () => stompClient.deactivate();
  }, []);

  useEffect(() => {
    if (!activeTicket) return;

    loadMessages(activeTicket.id);

    const wsUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:8080/ws-taxi'
      : 'https://api.unitua.com/ws-taxi';
    const socket = new SockJS(wsUrl);
    const token = localStorage.getItem('token');

    const stompClient = new Client({
      webSocketFactory: () => socket,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        stompClient.subscribe(`/topic/support/messages/${activeTicket.id}`, (msg) => {
          const newMsg = JSON.parse(msg.body);
          setMessages((prev) => [...prev, newMsg]);
        });
      }
    });

    stompClient.activate();
    return () => stompClient.deactivate();
  }, [activeTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartChat = async () => {
    if (!activeTicket) return;
    try {
      await supportService.startChat(activeTicket.id);
      setActiveTicket({ ...activeTicket, status: 'IN_PROGRESS' });
      loadTickets();
    } catch (e) {
      console.error('Помилка взяття в роботу:', e);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeTicket) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      await supportService.sendMessage(activeTicket.id, textToSend);
    } catch (e) {
      console.error('Помилка відправки:', e);
    }
  };

  const handleCloseTicket = async () => {
    if (!activeTicket) return;
    if (!window.confirm('Закрити це звернення?')) return;

    try {
      await supportService.closeTicket(activeTicket.id);
      setActiveTicket({ ...activeTicket, status: 'CLOSED' });
      loadTickets();
    } catch (e) {
      console.error('Помилка закриття:', e);
    }
  };

  // Фільтрація списку тікетів за вкладками
  const filteredTickets = tickets.filter((t) => {
    const hasMessage = Boolean(t.lastMessage && t.lastMessage.trim().length > 0);

    if (activeTab === 'ACTIVE') {
      // Тільки активні OPEN тікети, де клієнт РЕАЛЬНО написав повідомлення
      return t.status === 'OPEN' && hasMessage;
    }
    if (activeTab === 'IN_PROGRESS') {
      return t.status === 'IN_PROGRESS';
    }
    if (activeTab === 'NO_MSG') {
      // Клієнт тільки поділився номером, але не написав проблему
      return t.status === 'OPEN' && !hasMessage;
    }
    if (activeTab === 'CLOSED') {
      return t.status === 'CLOSED';
    }
    return true;
  });

  return (
    <div className="support-container">
      {/* Ліва колонка */}
      <div className="support-sidebar">
        <div className="support-sidebar-header">
          <div className="support-tabs">
            <button
              className={`support-tab ${activeTab === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setActiveTab('ACTIVE')}
            >
              Активні
            </button>
            <button
              className={`support-tab ${activeTab === 'IN_PROGRESS' ? 'active' : ''}`}
              onClick={() => setActiveTab('IN_PROGRESS')}
            >
              В роботі
            </button>
            <button
              className={`support-tab ${activeTab === 'NO_MSG' ? 'active' : ''}`}
              onClick={() => setActiveTab('NO_MSG')}
            >
              Без тексту
            </button>
            <button
              className={`support-tab ${activeTab === 'CLOSED' ? 'active' : ''}`}
              onClick={() => setActiveTab('CLOSED')}
            >
              Закриті
            </button>
          </div>
        </div>

        <div className="ticket-list">
          {filteredTickets.map((t) => (
            <div
              key={t.id}
              className={`ticket-item ${activeTicket?.id === t.id ? 'active' : ''}`}
              onClick={() => setActiveTicket(t)}
            >
              <div className="ticket-item-top">
                <span className="ticket-phone">{t.phoneNumber}</span>
                <span className={`ticket-badge badge-${t.status}`}>{t.status}</span>
              </div>
              <div className="ticket-preview">
                {t.lastMessage || 'Очікує повідомлення...'}
              </div>
            </div>
          ))}
          {filteredTickets.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
              Немає діалогів у цьому розділі
            </div>
          )}
        </div>
      </div>

      {/* Права колонка */}
      <div className="support-chat-area">
        {activeTicket ? (
          <>
            <div className="chat-header">
              <div className="chat-header-info">
                <h3>{activeTicket.phoneNumber}</h3>
                <span>{activeTicket.userName} ({activeTicket.userRole})</span>
              </div>
              <div className="chat-actions">
                {activeTicket.status === 'OPEN' && (
                  <button className="btn-start-chat" onClick={handleStartChat}>
                    💬 Почати чат
                  </button>
                )}
                {activeTicket.status !== 'CLOSED' && (
                  <button className="btn-close-ticket" onClick={handleCloseTicket}>
                    🔒 Закрити
                  </button>
                )}
              </div>
            </div>

            <div className="chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`message-bubble msg-${m.senderType}`}>
                  <div>{m.text}</div>
                  <div className="msg-time">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {activeTicket.status !== 'CLOSED' ? (
              <form className="chat-input-area" onSubmit={handleSend}>
                <input
                  type="text"
                  placeholder="Введіть відповідь..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button type="submit">Надіслати</button>
              </form>
            ) : (
              <div style={{ padding: '8px', textAlign: 'center', background: '#e2e8f0', color: '#475569', fontSize: '11px' }}>
                Тікет закритий (автовидалення через 3 дні).
              </div>
            )}
          </>
        ) : (
          <div className="empty-chat">
            <span>Оберіть діалог для перегляду</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportPage;