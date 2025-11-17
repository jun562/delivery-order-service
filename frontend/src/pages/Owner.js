import React, {useEffect, useState} from 'react';
import SockJS from 'sockjs-client';
import {Stomp} from '@stomp/stompjs';

function Owner() {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const socket = new SockJS('http://localhost:8080/ws-stomp');
        const client = Stomp.over(socket);

        client.connect({}, () => {
            console.log('Owner Connected!');

            // 주문 알림 구독
            client.subscribe('/sub/orders', (msg) => {
                setNotifications(prev => [...prev, msg.body]);
            });
        });

        return () => {
            if (client) client.disconnect();
        };
    }, []);

    const acceptOrder = (noti) => {
        if (!noti.includes("주문번호:")) return;

        const orderId = noti.split("주문번호: ")[1].trim(); // 파싱 주의!

        fetch('http://localhost:8080/orders/accept', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({orderId: orderId})
        }).then(() => {
            alert("주문을 수락했습니다!");
        });
    };

    return (
        <div style={{padding: '20px', backgroundColor: '#f0f8ff', minHeight: '100vh'}}>
            <h2>👨‍🍳 사장님 페이지 (주문 대기중...)</h2>

            <div>
                {notifications.map((noti, idx) => (
                    <div key={idx}
                         style={{background: 'white', padding: '10px', margin: '10px', border: '1px solid blue'}}>
                        {noti}
                        {noti.includes("새 주문") && (
                            <button
                                onClick={() => acceptOrder(noti)}
                                style={{marginLeft: '10px', background: 'red', color: 'white'}}
                            >
                                수락하기
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Owner;
