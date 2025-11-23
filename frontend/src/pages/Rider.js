import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import '../styles.css';

function Rider() {
    const [availableOrders, setAvailableOrders] = useState([]);
    const [myDelivery, setMyDelivery] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    const loadDeliveryCalls = useCallback(() => {
        fetch('http://localhost:8080/orders')
            .then(res => res.json())
            .then(data => {
                const calls = data.filter(o => o.status === 'COOKED');
                setAvailableOrders(calls);

                const delivering = data.find(o => o.status === 'DELIVERING');
                if (delivering) setMyDelivery(delivering);
            })
            .catch(e => console.error("목록 로드 실패:", e));
    }, []);

    // 웹소켓 연결
    useEffect(() => {
        loadDeliveryCalls();

        const socket = new SockJS('http://localhost:8080/ws-stomp');
        const client = Stomp.over(socket);

        client.connect({}, () => {
            console.log('Rider Connected!');
            setIsConnected(true);

            client.subscribe('/sub/orders', (msg) => {
                const body = msg.body;

                if (body.includes("배달 대기") || body.includes("조리가 완료")) {
                    console.log("새 콜 발생! 목록을 갱신합니다.");
                    loadDeliveryCalls();
                }
            });
        });

        return () => {
            if (client && client.connected) client.disconnect();
        };
    }, [loadDeliveryCalls]);

    const updateStatus = (orderId, status) => {
        fetch('http://localhost:8080/orders/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, status })
        }).then(() => {
            if (status === 'DELIVERING') {
                const order = availableOrders.find(o => o.orderId === orderId);
                setMyDelivery(order);
                setAvailableOrders(prev => prev.filter(o => o.orderId !== orderId));
                alert("배차 완료! 안전 운전하세요.");
            } else if (status === 'COMPLETE') {
                setMyDelivery(null);
                alert("배달 완료! 수고하셨습니다.");
            }
        });
    };

    return (
        <div className="page-container">
            {/* Navigation Header */}
            <nav className="nav-header">
                <Link to="/" className="nav-back">
                    ← 홈으로
                </Link>
                <h1 className="nav-title">라이더</h1>
                <div className="nav-status">
                    <span className={`connection-dot ${isConnected ? '' : 'disconnected'}`}></span>
                    <span style={{ fontSize: '0.85rem', color: '#666' }}>
                        {isConnected ? '연결됨' : '연결중...'}
                    </span>
                </div>
            </nav>

            <div className="content-container">
                {/* 현재 배달 중 */}
                {myDelivery ? (
                    <section className="section">
                        <div className="card current-delivery">
                            <div className="current-delivery-header">
                                <span className="current-delivery-badge">배달 중</span>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>
                                    {myDelivery.menuName}
                                </div>
                                <div style={{ color: '#666', fontSize: '0.9rem' }}>
                                    주문번호: {myDelivery.orderId?.substring(0, 8)}...
                                </div>
                            </div>
                            <button
                                onClick={() => updateStatus(myDelivery.orderId, 'COMPLETE')}
                                className="btn btn-primary btn-block btn-lg"
                            >
                                배달 완료
                            </button>
                        </div>
                    </section>
                ) : (
                    <section className="section">
                        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🛵</div>
                            <p style={{ color: '#666' }}>현재 배달 중인 건이 없습니다</p>
                        </div>
                    </section>
                )}

                {/* 배달 대기 목록 */}
                <section className="section">
                    <div className="section-header">
                        <h2 className="section-title">📡 배달 대기 목록</h2>
                        <button onClick={loadDeliveryCalls} className="btn btn-outline btn-sm">
                            새로고침
                        </button>
                    </div>

                    {availableOrders.length === 0 ? (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-state-icon">📭</div>
                                <p className="empty-state-text">대기 중인 콜이 없습니다</p>
                            </div>
                        </div>
                    ) : (
                        availableOrders.map(order => (
                            <div key={order.orderId} className="delivery-card">
                                <div className="delivery-info">
                                    <div className="delivery-menu">{order.menuName}</div>
                                    <div className="delivery-price">
                                        {order.price?.toLocaleString() || 0}원
                                    </div>
                                    <div className="delivery-id">
                                        ID: {order.orderId?.substring(0, 8)}...
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateStatus(order.orderId, 'DELIVERING')}
                                    className="btn btn-success"
                                >
                                    배차 받기
                                </button>
                            </div>
                        ))
                    )}
                </section>
            </div>
        </div>
    );
}

export default Rider;
