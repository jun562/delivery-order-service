import React, {useEffect, useRef, useState} from 'react';
import SockJS from 'sockjs-client';
import {Stomp} from '@stomp/stompjs';

function Customer() {
    const [stompClient, setStompClient] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [orderResult, setOrderResult] = useState("");

    // 상태 관리
    const [currentOrderId, setCurrentOrderId] = useState(null);
    const [manualOrderId, setManualOrderId] = useState("");
    const [isChatEnabled, setIsChatEnabled] = useState(false);
    const [menuList, setMenuList] = useState([]);

    const [selectedMenuName, setSelectedMenuName] = useState("");
    const [selectedMenuPrice, setSelectedMenuPrice] = useState(""); // 숫자 입력을 위해 초기값 빈 문자열 추천

    // 🔥 [수정 1] 연결 상태 관리
    const [isConnected, setIsConnected] = useState(false);

    // 🔥 [수정 2] 최신 주문번호를 참조하기 위한 Ref (알림 콜백용)
    const currentOrderIdRef = useRef(currentOrderId);

    // 주문번호가 바뀔 때마다 Ref도 업데이트
    useEffect(() => {
        currentOrderIdRef.current = currentOrderId;
    }, [currentOrderId]);

    // 1. 웹소켓 연결 (마운트 시 1회 실행)
    useEffect(() => {
        const socket = new SockJS('http://localhost:8080/ws-stomp');
        const client = Stomp.over(socket);

        client.connect({}, () => {
            console.log('Connected!');
            setIsConnected(true); // 🔥 연결 완료 플래그 설정

            // 알림 구독
            client.subscribe('/sub/orders', (msg) => {
                const body = msg.body;
                const myOrderId = currentOrderIdRef.current; // 🔥 Ref에서 최신값 조회

                // 내 주문과 관련된 알림인지 확인
                if (myOrderId && body.includes(myOrderId)) {
                    if (body.includes("수락")) {
                        alert("🎉 주문이 수락되었습니다! (조리 중)");
                        setIsChatEnabled(true);
                    } else if (body.includes("조리가 완료")) {
                        alert("🍳 조리가 완료되었습니다!");
                    } else if (body.includes("배달이 시작")) {
                        alert("🛵 배달이 시작되었습니다!");
                    } else if (body.includes("배달이 완료")) {
                        alert("🏁 배달이 완료되었습니다. 맛있게 드세요!");
                        // (선택) 완료 후 상태 초기화 등을 원하면 여기서 처리
                    } else if (body.includes("취소") || body.includes("거절")) {
                        alert("😭 주문이 가게 사정으로 취소되었습니다.");
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

    // 2. 채팅방 구독 및 내역 조회
    useEffect(() => {
        // 🔥 [수정 3] 연결(isConnected)이 안 됐으면 실행하지 않음 (에러 방지 핵심!)
        if (!stompClient || !currentOrderId || !isConnected) return;

        console.log("💬 채팅방 입장: " + currentOrderId);

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
    }, [currentOrderId, stompClient, isConnected]); // 🔥 의존성에 isConnected 필수

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

    // 5. 기존 주문 불러오기
    const loadMyOrder = () => {
        if (!manualOrderId) {
            alert("주문 번호를 입력하세요!");
            return;
        }
        const oid = manualOrderId.trim();
        setCurrentOrderId(oid);
        setIsChatEnabled(true); // (임시) 기존 주문 불러오면 채팅 가능하다고 가정
        setOrderResult("✅ 기존 주문 불러오기 완료");
    };

    return (
        <div style={{padding: '20px'}}>
            <h2>👤 고객 페이지</h2>

            {/* 메뉴판 */}
            <div style={{marginBottom: '20px'}}>
                <h3>📜 메뉴판</h3>
                <div style={{display: 'flex', gap: '10px', overflowX: 'auto'}}>
                    {menuList.length === 0 && <p>등록된 메뉴가 없습니다.</p>}
                    {menuList.map(menu => (
                        <div
                            key={menu.id}
                            onClick={() => {
                                setSelectedMenuName(menu.name);
                                setSelectedMenuPrice(menu.price);
                            }}
                            style={{
                                border: selectedMenuName === menu.name ? '2px solid #ff5722' : '1px solid #ccc',
                                padding: '15px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                minWidth: '120px',
                                textAlign: 'center',
                                background: selectedMenuName === menu.name ? '#fff3e0' : 'white'
                            }}
                        >
                            <div style={{fontWeight: 'bold', fontSize: '1.1em'}}>{menu.name}</div>
                            <div>{menu.price.toLocaleString()}원</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 주문 폼 */}
            <div style={{border: '1px solid #ddd', padding: '10px', marginBottom: '20px'}}>
                <h3>🛒 주문하기</h3>
                <div>
                    <label>메뉴: </label>
                    <input value={selectedMenuName} onChange={(e) => setSelectedMenuName(e.target.value)}
                           style={{marginRight: '10px'}}/>
                    <label>가격: </label>
                    <input type="number" value={selectedMenuPrice || ''}
                           onChange={(e) => setSelectedMenuPrice(e.target.value)} style={{width: '80px'}}/>
                </div>
                <button onClick={order} style={{
                    marginTop: '10px',
                    padding: '10px 20px',
                    background: '#ff5722',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                }}>
                    이 메뉴로 주문하기
                </button>
                <p style={{color: 'blue', fontWeight: 'bold'}}>{orderResult}</p>
            </div>

            {/* 주문 불러오기 */}
            <div style={{
                border: '1px solid #ff9800',
                padding: '10px',
                marginBottom: '20px',
                backgroundColor: '#fff8e1'
            }}>
                <h3>📂 내 주문 불러오기 (기존)</h3>
                <input type="text" placeholder="주문 ID 입력 (UUID)" value={manualOrderId}
                       onChange={(e) => setManualOrderId(e.target.value)} style={{width: '300px', padding: '5px'}}/>
                <button onClick={loadMyOrder} style={{marginLeft: '10px'}}>채팅방 재입장</button>
            </div>

            {/* 채팅창 */}
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
                        <input value={inputMessage} onChange={(e) => setInputMessage(e.target.value)}
                               placeholder="문의사항 입력..." style={{width: '70%', padding: '10px'}}
                               onKeyPress={(e) => e.key === 'Enter' && sendMessage()}/>
                        <button onClick={sendMessage} style={{width: '25%', padding: '10px', marginLeft: '5px'}}>전송
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Customer;
