import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import '../styles.css';

function Customer() {
    const [stompClient, setStompClient] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [orderResult, setOrderResult] = useState("");

    const [currentOrderId, setCurrentOrderId] = useState(null);
    const [manualOrderId, setManualOrderId] = useState("");
    const [isChatEnabled, setIsChatEnabled] = useState(false);
    const [menuList, setMenuList] = useState([]);

    const [selectedMenuName, setSelectedMenuName] = useState("");
    const [selectedMenuPrice, setSelectedMenuPrice] = useState("");

    const [isConnected, setIsConnected] = useState(false);
    const currentOrderIdRef = useRef(currentOrderId);

    useEffect(() => {
        currentOrderIdRef.current = currentOrderId;
    }, [currentOrderId]);

    // 웹소켓 연결
    useEffect(() => {
        const socket = new SockJS('http://localhost:8080/ws-stomp');
        const client = Stomp.over(socket);

        client.connect({}, () => {
            console.log('Connected!');
            setIsConnected(true);

            client.subscribe('/sub/orders', (msg) => {
                const body = msg.body;
                const myOrderId = currentOrderIdRef.current;

                if (myOrderId && body.includes(myOrderId)) {
                    if (body.includes("수락")) {
                        alert("주문이 수락되었습니다! (조리 중)");
                        setIsChatEnabled(true);
                    } else if (body.includes("조리가 완료")) {
                        alert("조리가 완료되었습니다!");
                    } else if (body.includes("배달이 시작")) {
                        alert("배달이 시작되었습니다!");
                    } else if (body.includes("배달이 완료")) {
                        alert("배달이 완료되었습니다. 맛있게 드세요!");
                    } else if (body.includes("취소") || body.includes("거절")) {
                        alert("주문이 가게 사정으로 취소되었습니다.");
                        setCurrentOrderId(null);
                        setIsChatEnabled(false);
                    }
                }
            });
        });

        setStompClient(client);

        return () => {
            if (client) client.disconnect();
        };
    }, []);

    // 메뉴 로드
    useEffect(() => {
        fetch('http://localhost:8080/menus')
            .then(res => res.json())
            .then(data => setMenuList(data))
            .catch(err => console.error("메뉴 로드 실패:", err));
    }, []);

    // 채팅방 구독
    useEffect(() => {
        if (!stompClient || !currentOrderId || !isConnected) return;

        console.log("채팅방 입장: " + currentOrderId);

        const subscription = stompClient.subscribe(`/sub/chat/${currentOrderId}`, (msg) => {
            const newMessage = JSON.parse(msg.body);
            setMessages(prev => [...prev, newMessage]);
        });

        fetch(`http://localhost:8080/chat/${currentOrderId}/history`)
            .then(res => res.json())
            .then(data => setMessages(data))
            .catch(err => console.error("채팅 내역 로드 실패:", err));

        return () => {
            subscription.unsubscribe();
        };
    }, [currentOrderId, stompClient, isConnected]);

    const sendMessage = () => {
        if (!isChatEnabled) {
            alert("주문이 수락되어야 채팅할 수 있습니다!");
            return;
        }
        if (stompClient && inputMessage && currentOrderId) {
            stompClient.send(`/pub/chat/${currentOrderId}`, {}, JSON.stringify({
                sender: "고객",
                content: inputMessage
            }));
            setInputMessage("");
        } else {
            alert("먼저 주문을 해야 채팅을 할 수 있어요!");
        }
    };

    const order = () => {
        fetch('http://localhost:8080/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: "customer1",
                restaurantId: "store1",
                menuName: selectedMenuName || "기본 메뉴",
                price: parseInt(selectedMenuPrice || 0)
            })
        })
            .then(res => res.text())
            .then(data => {
                setOrderResult(data);
                if (data.includes("주문번호:")) {
                    const orderId = data.split("주문번호: ")[1].trim();
                    setCurrentOrderId(orderId);
                    setManualOrderId(orderId);
                }
            })
            .catch(err => setOrderResult("주문 실패"));
    };

    const loadMyOrder = () => {
        if (!manualOrderId) {
            alert("주문 번호를 입력하세요!");
            return;
        }
        const oid = manualOrderId.trim();
        setCurrentOrderId(oid);
        setIsChatEnabled(true);
        setOrderResult("기존 주문 불러오기 완료");
    };

    return (
        <div className="page-container">
            {/* Navigation Header */}
            <nav className="nav-header">
                <Link to="/" className="nav-back">
                    ← 홈으로
                </Link>
                <h1 className="nav-title">고객 주문</h1>
                <div className="nav-status">
                    <span className={`connection-dot ${isConnected ? '' : 'disconnected'}`}></span>
                    <span style={{ fontSize: '0.85rem', color: '#666' }}>
                        {isConnected ? '연결됨' : '연결중...'}
                    </span>
                </div>
            </nav>

            <div className="content-container">
                {/* 메뉴판 섹션 */}
                <section className="section">
                    <div className="card">
                        <div className="card-header">
                            <span className="card-icon">📜</span>
                            <h2 className="card-title">메뉴판</h2>
                        </div>
                        <div className="menu-grid">
                            {menuList.length === 0 && (
                                <div className="empty-state">
                                    <p>등록된 메뉴가 없습니다.</p>
                                </div>
                            )}
                            {menuList.map(menu => (
                                <div
                                    key={menu.id}
                                    onClick={() => {
                                        setSelectedMenuName(menu.name);
                                        setSelectedMenuPrice(menu.price);
                                    }}
                                    className={`menu-card ${selectedMenuName === menu.name ? 'selected' : ''}`}
                                >
                                    <div className="menu-card-name">{menu.name}</div>
                                    <div className="menu-card-price">{menu.price?.toLocaleString()}원</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 주문 섹션 */}
                <section className="section">
                    <div className="card">
                        <div className="card-header">
                            <span className="card-icon">🛒</span>
                            <h2 className="card-title">주문하기</h2>
                        </div>
                        <div className="form-group">
                            <label className="form-label">선택한 메뉴</label>
                            <input
                                className="form-input"
                                value={selectedMenuName}
                                onChange={(e) => setSelectedMenuName(e.target.value)}
                                placeholder="메뉴를 선택하세요"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">가격</label>
                            <input
                                className="form-input"
                                type="number"
                                value={selectedMenuPrice || ''}
                                onChange={(e) => setSelectedMenuPrice(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <button onClick={order} className="btn btn-primary btn-block btn-lg">
                            주문하기
                        </button>
                        {orderResult && (
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                background: '#E8F7F6',
                                borderRadius: '8px',
                                color: '#1FA9A5',
                                fontWeight: '500'
                            }}>
                                {orderResult}
                            </div>
                        )}
                    </div>
                </section>

                {/* 주문 불러오기 */}
                <section className="section">
                    <div className="card" style={{ background: '#FFF8E1' }}>
                        <div className="card-header">
                            <span className="card-icon">📂</span>
                            <h2 className="card-title">기존 주문 불러오기</h2>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="주문 ID 입력 (UUID)"
                                value={manualOrderId}
                                onChange={(e) => setManualOrderId(e.target.value)}
                            />
                            <button onClick={loadMyOrder} className="btn btn-warning">
                                불러오기
                            </button>
                        </div>
                    </div>
                </section>

                {/* 채팅 섹션 */}
                <section className="section">
                    <div className="card">
                        <div className="card-header">
                            <span className="card-icon">💬</span>
                            <h2 className="card-title">
                                1:1 문의 {isChatEnabled ? '(연결됨)' : '(대기중)'}
                            </h2>
                        </div>

                        {!isChatEnabled ? (
                            <div className="chat-disabled">
                                <div className="chat-disabled-icon">⏳</div>
                                <p>사장님이 주문을 수락하면 채팅이 활성화됩니다.</p>
                            </div>
                        ) : (
                            <div className="chat-container">
                                <div className="chat-messages">
                                    {messages.length === 0 && (
                                        <div className="empty-state">
                                            <p>대화 내용이 없습니다.</p>
                                        </div>
                                    )}
                                    {messages.map((msg, idx) => (
                                        <div key={idx} className={`chat-message ${msg.sender === '고객' ? 'sent' : 'received'}`}>
                                            <div className="chat-bubble">
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="chat-input-container">
                                    <input
                                        className="chat-input"
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        placeholder="문의사항 입력..."
                                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    />
                                    <button onClick={sendMessage} className="btn btn-primary">
                                        전송
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Customer;
