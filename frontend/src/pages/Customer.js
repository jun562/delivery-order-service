import React, {useEffect, useState} from 'react';
import SockJS from 'sockjs-client';
import {Stomp} from '@stomp/stompjs';

function Customer() {
    const [stompClient, setStompClient] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [orderResult, setOrderResult] = useState("");

    // 현재 진행 중인 주문 번호 (채팅방 ID 역할)
    const [currentOrderId, setCurrentOrderId] = useState(null);
    // 기존 주문 불러오기용 입력값
    const [manualOrderId, setManualOrderId] = useState("");
    const [isChatEnabled, setIsChatEnabled] = useState(false);

    // 1. 웹소켓 연결
    useEffect(() => {
        const socket = new SockJS('http://localhost:8080/ws-stomp');
        const client = Stomp.over(socket);

        client.connect({}, () => {
            console.log('Connected!');

            client.subscribe('/sub/orders', (msg) => {
                const body = msg.body;

                if (body.includes("조리 중")) {
                    alert("주문이 수락되었습니다! 채팅이 가능합니다.");
                    setIsChatEnabled(true);
                } else if (body.includes("취소되었습니다")) {
                    alert("주문이 취소되었습니다.");
                    setIsChatEnabled(false);
                    setCurrentOrderId(null);
                }
            });
        });

        setStompClient(client);

        return () => {
            if (client) client.disconnect();
        };
    }, []);

    // 2. 주문번호가 생기면 채팅방 구독 & 내역 조회
    useEffect(() => {
        if (!stompClient || !currentOrderId) return;

        console.log("💬 채팅방 입장: " + currentOrderId);

        const subscription = stompClient.subscribe(`/sub/chat/${currentOrderId}`, (msg) => {
            const newMessage = JSON.parse(msg.body);
            setMessages(prev => [...prev, newMessage]);
        });

        fetch(`http://localhost:8080/chat/${currentOrderId}/history`)
            .then(res => res.json())
            .then(data => {
                console.log("📜 이전 대화 내역 로드:", data);
                setMessages(data);
            })
            .catch(err => console.error("채팅 내역 로드 실패:", err));

        return () => {
            subscription.unsubscribe();
        };
    }, [currentOrderId, stompClient]);

    // 3. 메시지 전송
    const sendMessage = () => {
        if (!isChatEnabled) {
            alert("주문이 수락되어야 채팅할 수 있습니다!");
            return;
        }

        if (stompClient && inputMessage && currentOrderId) {
            stompClient.send(`/pub/chat/${currentOrderId}`, {}, JSON.stringify({
                sender: "고객1",
                content: inputMessage
            }));
            setInputMessage("");
        } else {
            alert("먼저 주문을 해야 채팅을 할 수 있어요!");
        }
    };

    // 4. 주문 요청
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
            .then(data => {
                setOrderResult(data);

                if (data.includes("주문번호:")) {
                    const orderId = data.split("주문번호: ")[1].trim();
                    setCurrentOrderId(orderId);
                    setManualOrderId(orderId); // 편의상 입력창에도 채워줌
                }
            })
            .catch(err => setOrderResult("주문 실패"));
    };

    // 5. 기존 주문 불러오기
    const loadMyOrder = () => {
        if (!manualOrderId) {
            alert("주문 번호를 입력하세요!");
            return;
        }
        setCurrentOrderId(manualOrderId.trim());
        setOrderResult("✅ 기존 주문 불러오기 완료");
    };

    return (
        <div style={{padding: '20px'}}>
            <h2>👤 고객 페이지</h2>

            <div style={{border: '1px solid #ddd', padding: '10px', marginBottom: '20px'}}>
                <h3>🍗 메뉴 주문 (신규)</h3>
                <p>메뉴: 황금올리브 치킨 (23,000원)</p>
                <button onClick={order}>주문하기</button>
                <p style={{color: 'blue', fontWeight: 'bold'}}>{orderResult}</p>
            </div>

            <div style={{
                border: '1px solid #ff9800',
                padding: '10px',
                marginBottom: '20px',
                backgroundColor: '#fff8e1'
            }}>
                <h3>📂 내 주문 불러오기 (기존)</h3>
                <input
                    type="text"
                    placeholder="주문 ID 입력 (UUID)"
                    value={manualOrderId}
                    onChange={(e) => setManualOrderId(e.target.value)}
                    style={{width: '300px', padding: '5px'}}
                />
                <button onClick={loadMyOrder} style={{marginLeft: '10px'}}>채팅방 재입장</button>
            </div>

            <h3>💬 1:1 문의 ({isChatEnabled ? "연결됨" : "주문 수락 대기중..."})</h3>

            {!isChatEnabled ? (
                <div style={{
                    border: '1px solid #ddd',
                    padding: '50px',
                    textAlign: 'center',
                    background: '#f0f0f0',
                    color: '#888'
                }}>
                    ⏳ 사장님이 주문을 수락하면 채팅이 활성화됩니다.
                </div>
            ) : (
                <div>
                    <div style={{
                        border: '1px solid #ddd',
                        padding: '10px',
                        height: '300px',
                        overflowY: 'scroll',
                        background: '#f9f9f9'
                    }}>
                        {messages.length === 0 &&
                            <div style={{textAlign: 'center', color: '#999', marginTop: '100px'}}>대화 내용이 없습니다.</div>}
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{textAlign: msg.sender === '고객1' ? 'right' : 'left', margin: '5px'}}>
            <span style={{
                background: msg.sender === '고객1' ? '#ffeb3b' : '#fff',
                padding: '5px 10px',
                borderRadius: '10px',
                border: '1px solid #ddd',
                display: 'inline-block'
            }}>
              <b>{msg.sender}:</b> {msg.content}
            </span>
                            </div>
                        ))}
                    </div>
                    <div style={{marginTop: '10px'}}>
                        <input
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="문의사항 입력..."
                            style={{width: '70%', padding: '10px'}}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        />
                        <button onClick={sendMessage} style={{width: '25%', padding: '10px', marginLeft: '5px'}}>전송
                        </button>
                    </div>
                </div>)}
        </div>
    );
}

export default Customer;
