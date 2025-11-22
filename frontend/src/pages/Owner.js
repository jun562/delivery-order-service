import React, {useEffect, useRef, useState} from 'react';
import SockJS from 'sockjs-client';
import {Stomp} from '@stomp/stompjs';

function Owner() {
    const [stompClient, setStompClient] = useState(null);
    const [activeOrders, setActiveOrders] = useState([]);   // 주문 목록

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

                // "새 주문" 알림이 오면 목록에 추가
                if (body.includes("새 주문")) {
                    const parts = body.split("주문번호: ");
                    if (parts.length > 1) {
                        const orderId = parts[1].trim();
                        const menuPart = body.split("]")[0];

                        setActiveOrders(prev => {
                            if (prev.find(o => o.id === orderId)) return prev;
                            return [...prev, {id: orderId, title: menuPart + "]", status: 'PENDING'}];
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

    // 4. 통합 상태 변경 함수 (수락, 거절, 조리완료 등)
    const changeStatus = (orderId, status) => {
        if (status === 'REJECTED' && !window.confirm("정말 거절하시겠습니까?")) return;

        fetch('http://localhost:8080/orders/status', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({orderId: orderId, status: status})
        }).then(() => {
            setActiveOrders(prev => prev.map(o =>
                o.id === orderId ? {...o, status: status} : o
            ));

            // 거절되거나 완료된 주문은 목록에서 제거
            if (status === 'REJECTED' || status === 'COMPLETE') {
                setTimeout(() => {
                    setActiveOrders(prev => prev.filter(o => o.id !== orderId));
                    if (selectedOrderId === orderId) setSelectedOrderId(null);
                }, 1000);
            }
        });
    };

    // 5. 메뉴 등록
    const addMenu = () => {
        if (!menuName || !menuPrice) {
            alert("입력해주세요.");
            return;
        }
        fetch('http://localhost:8080/menus', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: menuName, price: parseInt(menuPrice), description: "추천 메뉴"})
        }).then(() => {
            alert("메뉴 등록 완료!");
            setMenuName("");
            setMenuPrice("");
        });
    };

    return (
        <div style={{display: 'flex', height: '100vh'}}>

            <div style={{
                width: '350px',
                borderRight: '1px solid #ccc',
                padding: '10px',
                background: '#f7f7f7',
                display: 'flex',
                flexDirection: 'column'
            }}>

                <div style={{
                    background: 'white',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    marginBottom: '15px'
                }}>
                    <h4>🍔 새 메뉴 등록</h4>
                    <input placeholder="메뉴명" value={menuName} onChange={(e) => setMenuName(e.target.value)}
                           style={{width: '100%', marginBottom: '5px', padding: '5px'}}/>
                    <input type="number" placeholder="가격" value={menuPrice}
                           onChange={(e) => setMenuPrice(e.target.value)}
                           style={{width: '100%', marginBottom: '5px', padding: '5px'}}/>
                    <button onClick={addMenu} style={{
                        width: '100%',
                        background: '#673ab7',
                        color: 'white',
                        border: 'none',
                        padding: '8px',
                        cursor: 'pointer'
                    }}>메뉴 추가하기
                    </button>
                </div>

                <h3>👨‍🍳 접수된 주문</h3>
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

                        <div style={{marginTop: '8px'}}>

                            {order.status === 'PENDING' && (
                                <div style={{display: 'flex', gap: '5px'}}>
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        changeStatus(order.id, 'ACCEPTED');
                                    }}
                                            style={{
                                                flex: 1,
                                                background: '#4CAF50',
                                                color: 'white',
                                                border: 'none',
                                                padding: '5px',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}>수락
                                    </button>
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        changeStatus(order.id, 'REJECTED');
                                    }}
                                            style={{
                                                flex: 1,
                                                background: '#F44336',
                                                color: 'white',
                                                border: 'none',
                                                padding: '5px',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}>거절
                                    </button>
                                </div>
                            )}

                            {order.status === 'ACCEPTED' && (
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    changeStatus(order.id, 'COOKED');
                                }}
                                        style={{
                                            width: '100%',
                                            background: '#FF9800',
                                            color: 'white',
                                            border: 'none',
                                            padding: '5px',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}>
                                    🍳 조리 완료 (기사 호출)
                                </button>
                            )}

                            {order.status === 'COOKED' && (
                                <div style={{
                                    color: '#FF9800',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    padding: '5px',
                                    background: '#fff3e0',
                                    borderRadius: '4px'
                                }}>
                                    🛵 기사님 배차 대기중...
                                </div>
                            )}

                            {order.status === 'DELIVERING' && (
                                <div style={{
                                    color: '#2196F3',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    padding: '5px',
                                    background: '#e3f2fd',
                                    borderRadius: '4px'
                                }}>
                                    🚀 배달 중 (이동중)
                                </div>
                            )}

                            {order.status === 'COMPLETE' && (
                                <div style={{
                                    color: 'green',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    padding: '5px',
                                    background: '#e8f5e9',
                                    borderRadius: '4px'
                                }}>
                                    ✅ 배달 완료됨
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{flex: 1, padding: '20px', display: 'flex', flexDirection: 'column'}}>

                {selectedOrderId && activeOrders.find(o => o.id === selectedOrderId)?.status !== 'PENDING' ? (
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
                  <span style={{
                      background: msg.sender === '사장님' ? '#2196f3' : '#eee',
                      color: msg.sender === '사장님' ? 'white' : 'black',
                      padding: '8px 12px',
                      borderRadius: '15px',
                      display: 'inline-block'
                  }}>
                    {msg.content}
                  </span>
                                </div>
                            ))}
                        </div>
                        <div style={{display: 'flex'}}>
                            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                                   placeholder="메시지 입력..."
                                   style={{flex: 1, padding: '12px', borderRadius: '4px', border: '1px solid #ccc'}}
                                   onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}/>
                            <button onClick={sendChatMessage} style={{
                                marginLeft: '10px',
                                padding: '0 20px',
                                background: '#2196f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
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
                        {selectedOrderId ? <h2>🚫 채팅 불가 (수락 후 가능)</h2> : <h2>👈 주문을 선택해주세요.</h2>}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Owner;
