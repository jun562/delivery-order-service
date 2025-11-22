import React, {useCallback, useEffect, useState} from 'react';
import SockJS from 'sockjs-client';
import {Stomp} from '@stomp/stompjs';

function Rider() {
    const [availableOrders, setAvailableOrders] = useState([]);
    const [myDelivery, setMyDelivery] = useState(null);

    // 2. 주문 목록 가져오기 (useCallback 사용)
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

    // 1. 웹소켓 연결
    useEffect(() => {
        loadDeliveryCalls();

        const socket = new SockJS('http://localhost:8080/ws-stomp');
        const client = Stomp.over(socket);

        client.connect({}, () => {
            console.log('Rider Connected!');

            client.subscribe('/sub/orders', (msg) => {
                const body = msg.body;

                if (body.includes("배달 대기") || body.includes("조리가 완료")) {
                    console.log("🔔 새 콜 발생! 목록을 갱신합니다.");
                    loadDeliveryCalls();
                }
            });
        });

        return () => {
            if (client && client.connected) client.disconnect();
        };
    }, [loadDeliveryCalls]); // 의존성 추가

    // 3. 상태 변경 (배차 받기 / 배달 완료)
    const updateStatus = (orderId, status) => {
        fetch('http://localhost:8080/orders/status', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({orderId, status})
        }).then(() => {
            if (status === 'DELIVERING') {
                const order = availableOrders.find(o => o.orderId === orderId);
                setMyDelivery(order);
                setAvailableOrders(prev => prev.filter(o => o.orderId !== orderId));
                alert("배차 완료! 안전 운전하세요. 🛵");
            } else if (status === 'COMPLETE') {
                setMyDelivery(null);
                alert("배달 완료! 수고하셨습니다. 🏁");
            }
        });
    };

    return (
        <div style={{padding: '20px', maxWidth: '600px', margin: '0 auto'}}>
            <h2>🛵 라이더 페이지</h2>

            {/* 1. 내 배달 현황 */}
            {myDelivery ? (
                <div style={{
                    border: '2px solid #2196F3',
                    padding: '20px',
                    marginBottom: '30px',
                    borderRadius: '10px',
                    background: '#e3f2fd'
                }}>
                    <h3 style={{margin: '0 0 10px 0'}}>🚀 현재 배달 중...</h3>
                    <p><b>메뉴:</b> {myDelivery.menuName}</p>
                    <p><b>주문번호:</b> {myDelivery.orderId}</p>
                    <button onClick={() => updateStatus(myDelivery.orderId, 'COMPLETE')}
                            style={{
                                width: '100%',
                                padding: '15px',
                                background: '#673ab7',
                                color: 'white',
                                border: 'none',
                                fontSize: '18px',
                                cursor: 'pointer',
                                borderRadius: '5px'
                            }}>
                        배달 완료 확인
                    </button>
                </div>
            ) : (
                <div style={{
                    marginBottom: '20px',
                    color: '#666',
                    padding: '20px',
                    background: '#f5f5f5',
                    borderRadius: '10px',
                    textAlign: 'center'
                }}>
                    현재 배달 중인 건이 없습니다.
                </div>
            )}

            <hr/>

            {/* 2. 콜 목록 */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                <h3>📡 배달 대기 목록</h3>
                <button onClick={loadDeliveryCalls} style={{padding: '5px 10px', cursor: 'pointer'}}>🔄 수동 새로고침</button>
            </div>

            {availableOrders.length === 0 && <p style={{textAlign: 'center', color: '#999'}}>현재 대기 중인 콜이 없습니다.</p>}

            {availableOrders.map(order => (
                <div key={order.orderId} style={{
                    border: '1px solid #ccc',
                    padding: '15px',
                    marginBottom: '10px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                    <div>
                        <div style={{fontWeight: 'bold', fontSize: '1.1em'}}>{order.menuName}</div>
                        <div
                            style={{fontSize: '12px', color: '#888'}}>{order.price ? order.price.toLocaleString() : 0}원
                        </div>
                        <div style={{fontSize: '11px', color: '#aaa'}}>ID: {order.orderId.substring(0, 8)}...</div>
                    </div>
                    <button onClick={() => updateStatus(order.orderId, 'DELIVERING')}
                            style={{
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}>
                        배차 받기
                    </button>
                </div>
            ))}
        </div>
    );
}

export default Rider;
