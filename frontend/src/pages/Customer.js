// src/pages/Customer.js
import React, {useEffect, useState} from 'react';
import SockJS from 'sockjs-client';
import {Stomp} from '@stomp/stompjs';

function Customer() {
    const [stompClient, setStompClient] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [orderResult, setOrderResult] = useState("");

    useEffect(() => {
        const socket = new SockJS('http://localhost:8080/ws-stomp');
        const client = Stomp.over(socket);

        client.connect({}, () => {
            console.log('Connected!');

            // 채팅 구독
            client.subscribe('/sub/chat', (msg) => {
                const newMessage = JSON.parse(msg.body);
                setMessages(prev => [...prev, newMessage]);
            });

            // 주문 알림 구독
            client.subscribe('/sub/orders', (msg) => {
                if (msg.body.includes("조리 중")) {
                    alert(msg.body);
                }
            });
        });

        setStompClient(client);

        return () => {
            if (client) client.disconnect();
        };
    }, []);

    const sendMessage = () => {
        if (stompClient && inputMessage) {
            stompClient.send("/pub/chat", {}, JSON.stringify({
                sender: "고객1",
                content: inputMessage
            }));
            setInputMessage("");
        }
    };

    const order = () => {
        fetch('http://localhost:8080/orders', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                customerId: "customer1",
                restaurantId: "store1",
                menuName: "황금올리브 치킨",
                price: 23000
            })
        })
            .then(res => res.text())
            .then(data => setOrderResult(data))
            .catch(err => setOrderResult("주문 실패"));
    };

    return (
        <div style={{padding: '20px'}}>
            <h2>고객 페이지</h2>

            <div style={{border: '1px solid #ddd', padding: '10px', marginBottom: '20px'}}>
                <h3>메뉴 주문</h3>
                <p>메뉴: 황금올리브 치킨 (23,000원)</p>
                <button onClick={order}>주문하기</button>
                <p style={{color: 'blue'}}>{orderResult}</p>
            </div>

            <div style={{border: '1px solid #ddd', padding: '10px', height: '300px', overflowY: 'scroll'}}>
                {messages.map((msg, idx) => (
                    <div key={idx}><b>{msg.sender}:</b> {msg.content}</div>
                ))}
            </div>
            <input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="문의사항 입력..."
            />
            <button onClick={sendMessage}>전송</button>
        </div>
    );
}

export default Customer;
