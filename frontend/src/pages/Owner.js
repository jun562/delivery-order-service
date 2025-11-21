import React, {useEffect, useRef, useState} from 'react';
import SockJS from 'sockjs-client';
import {Stomp} from '@stomp/stompjs';

function Owner() {
    const [stompClient, setStompClient] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);

    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const chatSubscriptionRef = useRef(null);
    const [menuName, setMenuName] = useState("");
    const [menuPrice, setMenuPrice] = useState("");

    // 1. 웹소켓 연결
    useEffect(() => {
        const socket = new SockJS('http://localhost:8080/ws-stomp');
        const client = Stomp.over(socket);

        client.connect({}, () => {
            console.log('Owner Connected!');

            client.subscribe('/sub/orders', (msg) => {
                const body = msg.body;
                setNotifications(prev => [body, ...prev]);

                if (body.includes("새 주문")) {
                    const parts = body.split("주문번호: ");
                    if (parts.length > 1) {
                        const orderId = parts[1].trim();
                        const menuPart = body.split("]")[0];

                        setActiveOrders(prev => {
                            if (prev.find(o => o.id === orderId)) return prev;
                            return [...prev, {id: orderId, text: body, title: menuPart + "]", status: '주문 대기중'}];
                        });
                    }
                }
            });
        });

        setStompClient(client);

        return () => {
            if (client) client.disconnect();
        };
    }, []);

    // 2. 채팅방 선택 시 동작
    useEffect(() => {
        if (!stompClient || !selectedOrderId) return;

        if (chatSubscriptionRef.current) {
            chatSubscriptionRef.current.unsubscribe();
        }

        console.log("💬 사장님 채팅방 입장: " + selectedOrderId);
        setChatMessages([]); // 메시지 초기화

        const subscription = stompClient.subscribe(`/sub/chat/${selectedOrderId}`, (msg) => {
            const newMessage = JSON.parse(msg.body);
            setChatMessages(prev => [...prev, newMessage]);
        });
        chatSubscriptionRef.current = subscription;

        fetch(`http://localhost:8080/chat/${selectedOrderId}/history`)
            .then(res => res.json())
            .then(data => {
                console.log("📜 대화 내역 로드:", data);
                setChatMessages(data);
            })
            .catch(err => console.error("채팅 로드 실패:", err));

    }, [selectedOrderId, stompClient]);

    // 3. 메시지 전송
    const sendChatMessage = () => {
        if (stompClient && chatInput && selectedOrderId) {
            stompClient.send(`/pub/chat/${selectedOrderId}`, {}, JSON.stringify({
                sender: "사장님",
                content: chatInput
            }));
            setChatInput("");
        }
    };

    // 4. 주문 수락
    const acceptOrder = (orderId) => {
        fetch('http://localhost:8080/orders/accept', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({orderId: orderId})
        }).then(() => {
            alert("주문(" + orderId + ")을 수락했습니다!");
            setActiveOrders(prev => prev.map(o => o.id === orderId ? {...o, status: '주문 수락'} : o));
        });
    };

    // 5. 주문 거절
    const rejectOrder = (orderId) => {
        if (!window.confirm("정말 거절하시겠습니까?")) return;

        fetch('http://localhost:8080/orders/reject', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({orderId: orderId})
        }).then(() => {
            alert("주문을 거절했습니다.");
            setActiveOrders(prev => prev.filter(o => o.id !== orderId));
            if (selectedOrderId === orderId) setSelectedOrderId(null);
        });
    };

    const addMenu = () => {
        if (!menuName || !menuPrice) {
            alert("메뉴 이름과 가격을 입력해주세요.");
            return;
        }

        fetch('http://localhost:8080/menus', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                name: menuName,
                price: parseInt(menuPrice),
                description: "사장님 추천 메뉴"
            })
        })
            .then(res => res.text())
            .then(msg => {
                alert(msg);
                setMenuName("");
                setMenuPrice("");
            })
            .catch(err => alert("메뉴 등록 실패"));
    };

    return (
        <div style={{display: 'flex', height: '100vh'}}>

            <div style={{width: '350px', borderRight: '1px solid #ccc', padding: '10px', background: '#f7f7f7'}}>
                <div style={{
                    background: 'white',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    marginBottom: '15px'
                }}>
                    <h4>🍔 새 메뉴 등록</h4>
                    <input
                        placeholder="메뉴명 (예: 양념치킨)"
                        value={menuName} onChange={(e) => setMenuName(e.target.value)}
                        style={{width: '100%', marginBottom: '5px', padding: '5px'}}
                    />
                    <input
                        type="number" placeholder="가격 (예: 20000)"
                        value={menuPrice} onChange={(e) => setMenuPrice(e.target.value)}
                        style={{width: '100%', marginBottom: '5px', padding: '5px'}}
                    />
                    <button onClick={addMenu} style={{
                        width: '100%',
                        background: '#673ab7',
                        color: 'white',
                        border: 'none',
                        padding: '8px',
                        cursor: 'pointer'
                    }}>
                        메뉴 추가하기
                    </button>
                </div>
                
                <h3>👨‍🍳 접수된 주문</h3>
                <div style={{fontSize: '12px', color: '#666', marginBottom: '10px'}}>
                    * 새 주문이 들어오면 여기에 카드가 생깁니다.
                </div>

                {activeOrders.length === 0 && <p>대기 중인 주문이 없습니다.</p>}

                {activeOrders.map(order => (
                    <div
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        style={{
                            padding: '10px', marginBottom: '10px',
                            background: selectedOrderId === order.id ? '#e3f2fd' : 'white',
                            border: selectedOrderId === order.id ? '2px solid #2196f3' : '1px solid #ddd',
                            cursor: 'pointer', borderRadius: '8px'
                        }}
                    >
                        <div style={{fontWeight: 'bold'}}>{order.title}</div>
                        <div style={{fontSize: '11px', color: '#888'}}>ID: {order.id.substring(0, 8)}...</div>

                        {order.status === '주문 대기중' ? (
                            <div style={{marginTop: '8px', display: 'flex', gap: '5px'}}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        acceptOrder(order.id);
                                    }}
                                    style={{
                                        flex: 1,
                                        background: '#4CAF50',
                                        color: 'white',
                                        border: 'none',
                                        padding: '5px',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    수락
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        rejectOrder(order.id);
                                    }}
                                    style={{
                                        flex: 1,
                                        background: '#F44336',
                                        color: 'white',
                                        border: 'none',
                                        padding: '5px',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    거절
                                </button>
                            </div>
                        ) : (
                            <div style={{
                                marginTop: '8px',
                                color: 'green',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                textAlign: 'center',
                                background: '#e8f5e9',
                                padding: '5px',
                                borderRadius: '4px'
                            }}>
                                ✅ 접수됨 (조리중)
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div style={{flex: 1, padding: '20px', display: 'flex', flexDirection: 'column'}}>
                {selectedOrderId && activeOrders.find(o => o.id === selectedOrderId)?.status === '주문 수락' ? (
                    <>
                        <h3>💬 1:1 문의 (주문번호: {selectedOrderId})</h3>

                        <div style={{
                            flex: 1,
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '15px',
                            overflowY: 'scroll',
                            background: '#fff',
                            marginBottom: '10px'
                        }}>
                            {chatMessages.length === 0 &&
                                <div style={{textAlign: 'center', color: '#ccc', marginTop: '20%'}}>대화 내용이 없습니다.</div>}
                            {chatMessages.map((msg, idx) => (
                                <div key={idx}
                                     style={{textAlign: msg.sender === '사장님' ? 'right' : 'left', margin: '5px 0'}}>
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#888',
                                        marginBottom: '2px'
                                    }}>{msg.sender}</div>
                                    <span style={{
                                        background: msg.sender === '사장님' ? '#2196f3' : '#eee',
                                        color: msg.sender === '사장님' ? 'white' : 'black',
                                        padding: '8px 12px',
                                        borderRadius: '15px',
                                        display: 'inline-block',
                                        maxWidth: '70%'
                                    }}>
                    {msg.content}
                  </span>
                                </div>
                            ))}
                        </div>

                        <div style={{display: 'flex'}}>
                            <input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="고객에게 보낼 메시지..."
                                style={{flex: 1, padding: '12px', borderRadius: '4px', border: '1px solid #ccc'}}
                                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                            />
                            <button onClick={sendChatMessage} style={{
                                marginLeft: '10px',
                                padding: '0 20px',
                                background: '#2196f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '16px',
                                cursor: 'pointer'
                            }}>전송
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#aaa',
                        flexDirection: 'column'
                    }}>
                        {selectedOrderId ? (
                            <>
                                <h2>🚫 채팅 불가</h2>
                                <p>주문을 수락해야 채팅을 할 수 있습니다.</p>
                            </>
                        ) : (
                            <h2>👈 왼쪽 목록에서 주문을 선택해주세요.</h2>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
}

export default Owner;
