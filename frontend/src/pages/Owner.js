import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import '../styles.css';

function Owner() {
    const [stompClient, setStompClient] = useState(null);
    const [activeOrders, setActiveOrders] = useState([]);

    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const chatSubscriptionRef = useRef(null);

    const [menuName, setMenuName] = useState("");
    const [menuPrice, setMenuPrice] = useState("");

    // 웹소켓 연결
    useEffect(() => {
        const socket = new SockJS('http://localhost:8080/ws-stomp');
        const client = Stomp.over(socket);

        client.connect({}, () => {
            console.log('Owner Connected!');

            client.subscribe('/sub/orders', (msg) => {
                const body = msg.body;

                if (body.includes("새 주문")) {
                    const parts = body.split("주문번호: ");
                    if (parts.length > 1) {
                        const orderId = parts[1].trim();
                        const menuPart = body.split("]")[0];

                        setActiveOrders(prev => {
                            if (prev.find(o => o.id === orderId)) return prev;
                            return [...prev, { id: orderId, title: menuPart + "]", status: 'PENDING' }];
                        });
                    }
                } else if (body.includes("주문번호:")) {
                    const parts = body.split("주문번호: ");
                    if (parts.length > 1) {
                        const orderId = parts[1].split(")")[0].trim();
                        let newStatus = null;
                        if (body.includes("배달이 시작")) newStatus = 'DELIVERING';
                        else if (body.includes("배달이 완료")) newStatus = 'COMPLETE';

                        if (newStatus) {
                            setActiveOrders(prev => prev.map(o =>
                                o.id === orderId ? { ...o, status: newStatus } : o
                            ));
                            if (newStatus === 'COMPLETE') {
                                setTimeout(() => setActiveOrders(prev => prev.filter(o => o.id !== orderId)), 2000);
                            }
                        }
                    }
                }
            });
        });

        setStompClient(client);
        return () => {
            if (client) client.disconnect();
        };
    }, []);

    // 채팅방 선택 시
    useEffect(() => {
        if (!stompClient || !selectedOrderId) return;

        if (chatSubscriptionRef.current) chatSubscriptionRef.current.unsubscribe();

        console.log("채팅방 입장: " + selectedOrderId);
        setChatMessages([]);

        const subscription = stompClient.subscribe(`/sub/chat/${selectedOrderId}`, (msg) => {
            const newMessage = JSON.parse(msg.body);
            setChatMessages(prev => [...prev, newMessage]);
        });
        chatSubscriptionRef.current = subscription;

        fetch(`http://localhost:8080/chat/${selectedOrderId}/history`)
            .then(res => res.json())
            .then(data => setChatMessages(data))
            .catch(err => console.error("채팅 로드 실패:", err));

    }, [selectedOrderId, stompClient]);

    const sendChatMessage = () => {
        if (stompClient && chatInput && selectedOrderId) {
            stompClient.send(`/pub/chat/${selectedOrderId}`, {}, JSON.stringify({
                sender: "사장님",
                content: chatInput
            }));
            setChatInput("");
        }
    };

    const changeStatus = (orderId, status) => {
        if (status === 'REJECTED' && !window.confirm("정말 거절하시겠습니까?")) return;

        fetch('http://localhost:8080/orders/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: orderId, status: status })
        }).then(() => {
            setActiveOrders(prev => prev.map(o =>
                o.id === orderId ? { ...o, status: status } : o
            ));

            if (status === 'REJECTED') {
                setTimeout(() => setActiveOrders(prev => prev.filter(o => o.id !== orderId)), 1000);
            }
        });
    };

    const addMenu = () => {
        if (!menuName || !menuPrice) {
            alert("메뉴명과 가격을 입력해주세요.");
            return;
        }
        fetch('http://localhost:8080/menus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: menuName, price: parseInt(menuPrice), description: "추천" })
        }).then(() => {
            alert("메뉴 등록 완료!");
            setMenuName("");
            setMenuPrice("");
        });
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'PENDING': { text: '대기중', class: 'status-pending' },
            'ACCEPTED': { text: '조리중', class: 'status-accepted' },
            'COOKED': { text: '배달대기', class: 'status-cooked' },
            'DELIVERING': { text: '배달중', class: 'status-delivering' },
            'COMPLETE': { text: '완료', class: 'status-complete' }
        };
        const info = statusMap[status] || { text: status, class: '' };
        return <span className={`status-badge ${info.class}`}>{info.text}</span>;
    };

    return (
        <div className="split-layout">
            {/* Sidebar - 주문 목록 */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem' }}>
                        ← 홈으로
                    </Link>
                    <h1 className="sidebar-title" style={{ marginTop: '8px' }}>사장님 관리</h1>
                </div>

                <div className="sidebar-content">
                    {/* 메뉴 등록 */}
                    <div className="card" style={{ marginBottom: '16px' }}>
                        <div className="card-header">
                            <span className="card-icon">🍔</span>
                            <h3 className="card-title">메뉴 등록</h3>
                        </div>
                        <div className="form-group">
                            <input
                                className="form-input"
                                placeholder="메뉴명"
                                value={menuName}
                                onChange={(e) => setMenuName(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <input
                                className="form-input"
                                type="number"
                                placeholder="가격"
                                value={menuPrice}
                                onChange={(e) => setMenuPrice(e.target.value)}
                            />
                        </div>
                        <button onClick={addMenu} className="btn btn-primary btn-block">
                            메뉴 추가
                        </button>
                    </div>

                    {/* 주문 목록 */}
                    <div className="section-header">
                        <h3 className="section-title">📋 접수된 주문</h3>
                    </div>

                    {activeOrders.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-state-icon">📭</div>
                            <p>대기 중인 주문이 없습니다</p>
                        </div>
                    )}

                    {activeOrders.map(order => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrderId(order.id)}
                            className={`order-card ${selectedOrderId === order.id ? 'selected' : ''}`}
                        >
                            <div className="order-card-header">
                                <span className="order-card-title">{order.title}</span>
                                {getStatusBadge(order.status)}
                            </div>
                            <div className="order-card-id">ID: {order.id.substring(0, 8)}...</div>

                            <div style={{ marginTop: '12px' }}>
                                {order.status === 'PENDING' && (
                                    <div className="btn-group">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); changeStatus(order.id, 'ACCEPTED'); }}
                                            className="btn btn-success btn-sm"
                                            style={{ flex: 1 }}
                                        >
                                            수락
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); changeStatus(order.id, 'REJECTED'); }}
                                            className="btn btn-danger btn-sm"
                                            style={{ flex: 1 }}
                                        >
                                            거절
                                        </button>
                                    </div>
                                )}
                                {order.status === 'ACCEPTED' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); changeStatus(order.id, 'COOKED'); }}
                                        className="btn btn-warning btn-block btn-sm"
                                    >
                                        조리 완료
                                    </button>
                                )}
                                {order.status === 'COOKED' && (
                                    <div className="status-badge status-cooked" style={{ width: '100%', textAlign: 'center', padding: '8px' }}>
                                        🛵 라이더 대기중...
                                    </div>
                                )}
                                {order.status === 'DELIVERING' && (
                                    <div className="status-badge status-delivering" style={{ width: '100%', textAlign: 'center', padding: '8px' }}>
                                        🚀 배달 중
                                    </div>
                                )}
                                {order.status === 'COMPLETE' && (
                                    <div className="status-badge status-complete" style={{ width: '100%', textAlign: 'center', padding: '8px' }}>
                                        ✅ 배달 완료
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content - 채팅 */}
            <div className="main-content">
                <div className="main-header">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                        💬 고객 문의
                        {selectedOrderId && (
                            <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: '8px' }}>
                                (주문: {selectedOrderId.substring(0, 8)}...)
                            </span>
                        )}
                    </h2>
                </div>

                <div className="main-body">
                    {selectedOrderId && activeOrders.find(o => o.id === selectedOrderId)?.status !== 'PENDING' ? (
                        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div className="chat-messages" style={{ flex: 1, maxHeight: 'none' }}>
                                {chatMessages.length === 0 && (
                                    <div className="empty-state">
                                        <p>대화 내용이 없습니다</p>
                                    </div>
                                )}
                                {chatMessages.map((msg, idx) => (
                                    <div key={idx} className={`chat-message ${msg.sender === '사장님' ? 'sent' : 'received'}`}>
                                        <div className="chat-bubble">
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="chat-input-container">
                                <input
                                    className="chat-input"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="메시지 입력..."
                                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                                />
                                <button onClick={sendChatMessage} className="btn btn-primary">
                                    전송
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div className="empty-state-icon">
                                {selectedOrderId ? '🚫' : '👈'}
                            </div>
                            <p className="empty-state-text">
                                {selectedOrderId ? '주문을 수락하면 채팅이 가능합니다' : '주문을 선택해주세요'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Owner;
