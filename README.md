# Delivery Order Service

gRPC와 WebSocket을 활용한 실시간 배달 주문 시스템

---

## 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [프로젝트 목표](#2-프로젝트-목표)
3. [요구사항 분석](#3-요구사항-분석)
4. [주요 기능](#4-주요-기능)
5. [기술 스택](#5-기술-스택)
6. [시스템 아키텍처](#6-시스템-아키텍처)
7. [모듈 구조](#7-모듈-구조)
8. [API 명세](#8-api-명세)
9. [실행 방법](#9-실행-방법)
10. [주요 기능 흐름](#10-주요-기능-흐름)

---

## 1. 프로젝트 소개

### 프로젝트를 시작한 이유

**1. gRPC의 필요성**

대규모 시스템일수록 마이크로서비스 아키텍처(MSA)가 강조되고 있습니다. MSA 환경에서 서비스 간 통신은 핵심 요소인데, gRPC는 Protocol Buffers를 통한 빠른 직렬화와 HTTP/2 기반의 통신을 제공하여, 내부 서비스 간 통신에 적합한 기술입니다. 이러한 기술의 필요성을 느껴 직접 구현해보고자 했습니다.

**2. WebSocket의 중요성**

대부분의 웹 애플리케이션에서 채팅, 알림, 실시간 업데이트 등 WebSocket이 사용되지 않는 서비스는 없기에, 상태가 실시간으로 변경되는 도메인에서 WebSocket은 핵심 기술이라고 생각했고, 이 프로젝트에 적용해보고 싶었습니다.

**3. 배달 프로세스 구현**

우아한형제들의 대표 서비스인 배달의민족의 주문-조리-배달 프로세스를 직접 구현해보고 싶었습니다. 고객, 사장님, 라이더 세 역할이 실시간으로 상호작용하는 시스템을 만들면서 실제 서비스의 비즈니스 로직을 경험하고자 했습니다.

---

## 2. 프로젝트 목표

### 멀티 모듈 아키텍처 구현

- 클라이언트(브라우저)와 서버 간에는 WebSocket(STOMP)을 사용하여 실시간 양방향 통신
- 백엔드 서버 간에는 **gRPC**를 사용하여 고성능 내부 통신

### Event 기반 실시간 서비스

- 주문 발생, 접수, 배달 시작 등의 이벤트를 **폴링(Polling) 없이** 실시간으로 전달
- 모든 상태 변경이 관련된 사용자에게 즉시 반영

### 주문 생명주기 관리

- `주문 대기` → `조리 중` → `배달 대기` → `배달 중` → `배달 완료` 상태 관리
- 각 단계별 역할(고객, 사장님, 라이더)에 따른 권한 분리

---

## 3. 요구사항 분석

### 사용자 역할 정의

| 역할       | 설명                                                                  |
| ---------- | --------------------------------------------------------------------- |
| **고객**   | 메뉴를 주문하고, 배달 현황을 실시간으로 확인하며, 사장님과 1:1로 소통 |
| **사장님** | 메뉴를 등록하고, 들어온 주문을 실시간으로 확인하여 수락/거절 처리     |
| **라이더** | 조리 완료된 주문을 확인하고, 배차를 받아 배달 완료 처리               |

### 기능 요구사항

#### 주문 관리

| 요구사항       | 설명                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| 주문 생성      | 고객이 메뉴를 선택하여 주문하면 `Web Server`를 거쳐 `Order Server`에 저장 |
| 실시간 알림    | 주문이 저장되는 즉시 사장님 화면에 알림 표시                              |
| 주문 수락/거절 | 사장님이 주문을 처리하면 고객에게 즉시 상태 변경 알림                     |
| 조리 완료      | 사장님이 조리 완료 처리 시 라이더 목록에 표시                             |
| 배달 처리      | 라이더가 배차 받기/배달 완료 처리 시 모든 관계자에게 알림                 |

#### 채팅

| 요구사항    | 설명                                            |
| ----------- | ----------------------------------------------- |
| 1:1 채팅    | 특정 주문 건에 대해 고객과 사장님이 실시간 채팅 |
| 채팅 활성화 | 주문이 수락된 후에만 채팅 가능                  |
| 채팅 내역   | 기존 주문의 채팅 내역 조회 가능                 |

#### 메뉴 관리

| 요구사항  | 설명                                  |
| --------- | ------------------------------------- |
| 메뉴 등록 | 사장님이 메뉴명, 가격을 입력하여 등록 |
| 메뉴 조회 | 고객이 등록된 메뉴 목록 확인          |

---

## 4. 주요 기능

### 실시간 주문 알림

- WebSocket(STOMP)을 활용한 Pub/Sub 메시징 구조
- 주문 상태 변경 시 모든 관련 사용자에게 즉시 브로드캐스팅

### 실시간 1:1 채팅

- 주문별 독립적인 채팅방 운영 (`/sub/chat/{orderId}`)
- 채팅 내역 DB 저장 및 조회

### gRPC 기반 내부 통신

- Protobuf를 이용한 명확한 인터페이스 정의
- HTTP/REST 대비 빠른 데이터 직렬화 및 전송

### 주문 생명주기 관리

```
PENDING (주문 대기)
    │
    ├── ACCEPTED (수락/조리 중) ──→ COOKED (조리 완료/배달 대기)
    │                                      │
    │                                      ▼
    │                              DELIVERING (배달 중)
    │                                      │
    │                                      ▼
    │                               COMPLETE (배달 완료)
    │
    └── REJECTED (거절)
```

---

## 5. 기술 스택

### Backend

| 구분       | 기술            | 버전   |
| ---------- | --------------- | ------ |
| Language   | Java            | 21     |
| Framework  | Spring Boot     | 3.5.7  |
| Build Tool | Gradle          | Groovy |
| ORM        | Spring Data JPA | -      |
| Database   | H2 (In-Memory)  | -      |

### Communication

| 구분      | 기술                     | 버전                |
| --------- | ------------------------ | ------------------- |
| 내부 통신 | gRPC-Java (Netty Shaded) | 1.76.0              |
| 직렬화    | Protocol Buffers         | 3.25.8              |
| 외부 통신 | WebSocket (STOMP)        | Spring Boot Starter |

### Frontend

| 구분      | 기술             | 버전   |
| --------- | ---------------- | ------ |
| Core      | React            | 19.2.0 |
| Routing   | React Router DOM | 7.9.6  |
| WebSocket | SockJS Client    | 1.6.1  |
| STOMP     | @stomp/stompjs   | 7.2.1  |

---

## 6. 시스템 아키텍처

**Multi-module (Monorepo)** 구조로 설계

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│                      http://localhost:3000                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ REST API / WebSocket (STOMP)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Web Server (Gateway)                         │
│                      http://localhost:8080                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   REST API  │  │  WebSocket  │  │     gRPC Client         │  │
│  │  Controller │  │   Handler   │  │  (order-service)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ gRPC (Protocol Buffers)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Order Server (Core)                          │
│                      grpc://localhost:9090                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    gRPC     │  │  Business   │  │      Repository         │  │
│  │   Service   │  │    Logic    │  │     (JPA + H2)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 모듈별 역할

| 모듈             | 역할                                   | 포트 |
| ---------------- | -------------------------------------- | ---- |
| **proto**        | gRPC 서비스 정의, Protobuf 메시지 정의 | -    |
| **order-server** | 주문/메뉴 CRUD, gRPC 서버              | 9090 |
| **web-server**   | REST API, WebSocket, gRPC 클라이언트   | 8080 |
| **frontend**     | React SPA                              | 3000 |

### 통신 흐름

1. **클라이언트 → Web Server**: REST API 또는 WebSocket
2. **Web Server → Order Server**: gRPC (Protobuf)
3. **Order Server → Web Server**: gRPC Response
4. **Web Server → 클라이언트**: WebSocket 브로드캐스팅

---

## 7. 모듈 구조

```
delivery-order-service/
├── proto/                                      # gRPC 인터페이스 정의
│   ├── src/main/proto/
│   │   └── order.proto                        # Protobuf 서비스/메시지 정의
│   └── build.gradle
│
├── order-server/                               # 핵심 비즈니스 로직 (gRPC 서버)
│   ├── src/main/java/com/jun/orderserver/
│   │   ├── OrderServerApplication.java        # Spring Boot 진입점
│   │   ├── domain/
│   │   │   ├── Order.java                     # 주문 Entity
│   │   │   ├── Menu.java                      # 메뉴 Entity
│   │   │   └── OrderStatus.java               # 주문 상태 Enum
│   │   ├── grpc/
│   │   │   ├── OrderGrpcService.java          # 주문 gRPC 서비스
│   │   │   └── MenuGrpcService.java           # 메뉴 gRPC 서비스
│   │   └── repository/
│   │       ├── OrderRepository.java           # 주문 JPA Repository
│   │       └── MenuRepository.java            # 메뉴 JPA Repository
│   ├── src/main/resources/
│   │   └── application.properties             # 서버 설정 (포트: 9090)
│   └── build.gradle
│
├── web-server/                                 # API Gateway (gRPC 클라이언트)
│   ├── src/main/java/com/jun/webserver/
│   │   ├── WebServerApplication.java          # Spring Boot 진입점
│   │   ├── config/
│   │   │   ├── WebSocketConfig.java           # WebSocket/STOMP 설정
│   │   │   └── WebMvcConfig.java              # CORS 설정
│   │   ├── controller/
│   │   │   ├── OrderController.java           # 주문 REST API
│   │   │   ├── MenuController.java            # 메뉴 REST API
│   │   │   └── ChatController.java            # 채팅 WebSocket 핸들러
│   │   ├── domain/
│   │   │   ├── ChatMessage.java               # 채팅 메시지 Entity
│   │   │   └── OrderStatus.java               # 주문 상태 Enum
│   │   ├── dto/
│   │   │   ├── OrderRequestDto.java           # 주문 요청 DTO
│   │   │   ├── MenuRequestDto.java            # 메뉴 요청 DTO
│   │   │   ├── OrderAcceptDto.java            # 주문 상태 변경 DTO
│   │   │   └── ChatMessageDto.java            # 채팅 메시지 DTO
│   │   └── repository/
│   │       └── ChatRepository.java            # 채팅 JPA Repository
│   ├── src/main/resources/
│   │   └── application.properties             # 서버 설정 (포트: 8080)
│   └── build.gradle
│
├── frontend/                                   # React 클라이언트
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.js                        # 메인 (역할 선택)
│   │   │   ├── Customer.js                    # 고객 페이지
│   │   │   ├── Owner.js                       # 사장님 페이지
│   │   │   └── Rider.js                       # 라이더 페이지
│   │   ├── App.js                             # 라우팅 설정
│   │   ├── index.js                           # React 진입점
│   │   └── styles.css                         # 글로벌 스타일
│   ├── public/
│   │   └── index.html
│   ├── package.json                           # 의존성 정의
│   └── package-lock.json
│
├── build.gradle                                # Root 빌드 설정
├── settings.gradle                             # 멀티모듈 설정
├── README.md                                   # 프로젝트 문서
└── LEARNING.md                                 # 학습 기록 및 트러블슈팅
```

---

## 8. API 명세

### REST API (Web Server - Port 8080)

#### 주문 API

| Method | Endpoint         | 설명           | Request Body      | Response          |
| ------ | ---------------- | -------------- | ----------------- | ----------------- |
| GET    | `/orders`        | 전체 주문 조회 | -                 | `List<OrderInfo>` |
| POST   | `/orders`        | 주문 생성      | `OrderRequestDto` | `String`          |
| POST   | `/orders/status` | 주문 상태 변경 | `OrderAcceptDto`  | `String`          |

#### 메뉴 API

| Method | Endpoint | 설명           | Request Body     | Response     |
| ------ | -------- | -------------- | ---------------- | ------------ |
| GET    | `/menus` | 메뉴 목록 조회 | -                | `List<Menu>` |
| POST   | `/menus` | 메뉴 등록      | `MenuRequestDto` | `String`     |

#### 채팅 API

| Method | Endpoint                  | 설명           |
| ------ | ------------------------- | -------------- |
| GET    | `/chat/{orderId}/history` | 채팅 내역 조회 |

### WebSocket (STOMP)

| 타입 | Endpoint              | 설명                      |
| ---- | --------------------- | ------------------------- |
| 연결 | `/ws-stomp`           | WebSocket 연결 엔드포인트 |
| 구독 | `/sub/orders`         | 주문 상태 알림 구독       |
| 구독 | `/sub/chat/{orderId}` | 주문별 채팅방 구독        |
| 발행 | `/pub/chat/{orderId}` | 채팅 메시지 전송          |

### gRPC Services (Order Server - Port 9090)

```protobuf
service OrderService {
  rpc CreateOrder (CreateOrderRequest) returns (CreateOrderResponse);
  rpc UpdateOrderStatus (UpdateOrderStatusRequest) returns (UpdateOrderStatusResponse);
  rpc GetOrders (GetOrdersRequest) returns (GetOrdersResponse);
}

service MenuService {
  rpc AddMenu (MenuRequest) returns (MenuResponse);
  rpc GetMenus (Empty) returns (MenuListResponse);
}
```

### 주문 상태 (OrderStatus)

| 상태         | 설명                  | 처리 주체 |
| ------------ | --------------------- | --------- |
| `PENDING`    | 주문 대기중           | -         |
| `ACCEPTED`   | 주문 수락 (조리중)    | 사장님    |
| `REJECTED`   | 주문 거절             | 사장님    |
| `COOKED`     | 조리 완료 (배달 대기) | 사장님    |
| `DELIVERING` | 배달중                | 라이더    |
| `COMPLETE`   | 배달 완료             | 라이더    |

---

## 9. 실행 방법

### 사전 요구사항

- Java 21+
- Node.js 18+
- npm

### 1단계: 프로젝트 클론

```bash
git clone https://github.com/jun562/delivery-order-service.git
cd delivery-order-service
```

### 2단계: Proto 모듈 빌드

```bash
./gradlew :proto:build
```

### 3단계: Order Server 실행

```bash
./gradlew :order-server:bootRun
```

> gRPC 서버가 `localhost:9090`에서 실행

### 4단계: Web Server 실행 (새 터미널)

```bash
./gradlew :web-server:bootRun
```

> REST/WebSocket 서버가 `localhost:8080`에서 실행

### 5단계: Frontend 실행 (새 터미널)

```bash
cd frontend
npm install
npm start
```

> React 앱이 `localhost:3000`에서 실행

### 전체 실행 순서

```
1. Order Server (9090) → 2. Web Server (8080) → 3. Frontend (3000)
```

### Windows 환경

```bash
gradlew.bat :proto:build
gradlew.bat :order-server:bootRun
gradlew.bat :web-server:bootRun
```

---

## 10. 주요 기능 흐름

### 주문 생성 흐름

```
[고객] 주문 버튼 클릭
    │
    ▼
[Frontend] POST /orders 요청
    │
    ▼
[Web Server] gRPC CreateOrder 호출
    │
    ▼
[Order Server] DB 저장 (PENDING)
    │
    ▼
[Web Server] WebSocket 브로드캐스트 (/sub/orders)
    │
    ▼
[사장님 화면] 새 주문 알림 표시
```

### 주문 수락 흐름

```
[사장님] 수락 버튼 클릭
    │
    ▼
[Frontend] POST /orders/status (ACCEPTED)
    │
    ▼
[Web Server] gRPC UpdateOrderStatus 호출
    │
    ▼
[Order Server] 상태 변경 (PENDING → ACCEPTED)
    │
    ▼
[Web Server] WebSocket 브로드캐스트
    │
    ├──▶ [고객 화면] "주문이 수락되었습니다!" 알림
    └──▶ [채팅 활성화] 1:1 채팅 가능
```

### 배달 흐름

```
[사장님] 조리 완료 클릭 → COOKED
    │
    ▼
[라이더 화면] 배달 대기 목록에 표시
    │
    ▼
[라이더] 배차 받기 클릭 → DELIVERING
    │
    ▼
[고객/사장님 화면] "배달이 시작되었습니다!" 알림
    │
    ▼
[라이더] 배달 완료 클릭 → COMPLETE
    │
    ▼
[고객 화면] "배달이 완료되었습니다!" 알림
```

### 채팅 흐름

```
[고객] 메시지 입력 후 전송
    │
    ▼
[Frontend] STOMP /pub/chat/{orderId} 발행
    │
    ▼
[Web Server] ChatController @MessageMapping
    │
    ├──▶ DB 저장 (ChatMessage)
    └──▶ STOMP /sub/chat/{orderId} 브로드캐스트
           │
           ├──▶ [고객 화면] 메시지 표시
           └──▶ [사장님 화면] 메시지 표시
```

---
