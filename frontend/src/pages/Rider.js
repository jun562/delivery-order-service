import React, {useEffect, useState} from 'react';
import SockJS from 'sockjs-client';
import {Stomp} from '@stomp/stompjs';

function Rider() {
    const [availableOrders, setAvailableOrders] = useState([]);
    const [myDelivery, setMyDelivery] = useState(null);

    // 1. 웹소켓 연결
    useEffect(() => {
        const socket = new SockJS('http://localhost:8080/ws-stomp');
        const client = Stomp.over(socket);

        client.connect({}, () => {
            console.log('Rider Connected!');

            // 주문 알림 구독
            client.subscribe('/sub/orders', (msg) => {
                if (msg.body.includes("배달 대기")) {
                    alert("새로운 배달 콜이 있습니다!");
                }
            });
        });

        return () => {
            if (client && client.connected) client.disconnect();
        };
    }, []);

    // 2. "배달 가능한(COOKED)" 주문 목록 가져오기
    const loadDeliveryCalls = () => {
        fetch('http://localhost:8080/menus')

        fetch('http://localhost:8080/orders?customerId=customer1')
            .then(res => res.json())
            .then(data => {
                // "COOKED" 상태인 주문만 필터링
                const calls = data.filter(o => o.status === 'COOKED');
                setAvailableOrders(calls);
            })
            .catch(e => console.error(e));
    };

    useEffect(() => {
        loadDeliveryCalls();
    }, []);

    // 3. 배차 받기 & 배달 완료
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
                alert("배차 완료! 안전 운전하세요.");
            } else if (status === 'COMPLETE') {
                // 배달 완료 -> 초기화
                setMyDelivery(null);
                alert("배달 완료! 수고하셨습니다. 🏁");
            }
        });
    };

    return (
        <div style={{padding: '20px'}}>
            <h2>🛵 라이더 전용 페이지</h2>

            {myDelivery ? (
                <div style={{
                    border: '3px solid #2196F3',
                    padding: '20px',
                    marginBottom: '30px',
                    borderRadius: '10px',
                    background: '#e3f2fd'
                }}>
                    <h3 style={{margin: '0 0 10px 0'}}>🚀 현재 배달 중...</h3>
                    <p><b>가게:</b> Store1</p>
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
                    background: '#eee',
                    borderRadius: '10px'
                }}>
                    현재 배달 중인 건이 없습니다. 콜을 잡아주세요.
                </div>
            )}

            <hr/>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3>📡 실시간 배달 콜</h3>
                <button onClick={loadDeliveryCalls} style={{padding: '5px 10px'}}>🔄 목록 새로고침</button>
            </div>

            {availableOrders.length === 0 && <p>현재 대기 중인 콜이 없습니다.</p>}

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
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <div>
                        <div style={{fontWeight: 'bold', fontSize: '1.1em'}}>{order.menuName}</div>
                        <div style={{fontSize: '12px', color: '#888'}}>{order.price}원 / {order.orderId}</div>
                        <div style={{color: 'green', fontSize: '12px'}}>✅ 조리 완료 (픽업 대기)</div>
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
