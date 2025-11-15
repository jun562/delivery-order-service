# Delivery Order Service (배달 주문 서비스)

gRPC와 WebSocket을 활용하여 구축한 실시간 배달 주문 및 채팅 시스템

마이크로서비스 아키텍처(MSA)의 통신 패턴을 학습하고 검증하기 위한 프로젝트

## 1. 프로젝트 목표

- **멀티 모듈 구현**
    - 클라이언트(브라우저)와 서버 간에는 **WebSocket**을 사용하여 실시간 양방향 통신
    - 백엔드 서버 간에는 **gRPC (Google Remote Procedure Call)**를 사용하여 내부 통신을 구현

- **Event 기반 실시간 서비스**
    - 주문 발생, 접수, 배달 시작 등의 이벤트를 폴링(Polling) 없이 실시간으로 고객에게 전달

## 2. 요구사항 분석

### 사용자 역할

- **고객 (Customer):** 메뉴를 주문하고, 배달 현황을 실시간으로 확인하며, 사장님과 1:1로 소통할 수 있어야 한다.
- **사장 (Store Owner):** 들어온 주문을 실시간으로 인지하고, 주문을 수락/거절할 수 있어야 한다.

### 주문 프로세스 요구사항

1. **주문 생성:** 고객이 주문을 넣으면 `Web Server`를 거쳐 `Order Server`에 저장되어야 한다.
2. **실시간 알림:** 주문이 저장되는 즉시 사장님의 화면에 알림이 떠야 한다.
3. **주문 처리:** 사장님이 주문을 수락하면, 고객의 화면에 주문 상태가 '조리 중'으로 즉시 변경되어야 한다.

### 커뮤니케이션 요구사항

- 특정 주문 건에 대해 고객과 사장님이 **1:1 채팅**을 할 수 있어야 한다.
- 채팅 메시지는 지연 없이 실시간으로 전송되어야 한다.

## 3. 주요 기능

- **실시간 1:1 채팅**
    - WebSocket(STOMP)을 활용한 Pub/Sub 메시징 구조
    - 특정 구독자(User)에게만 메시지를 전송하는 라우팅 구현
- **gRPC 기반 내부 통신**
    - `Protobuf`를 이용한 명확한 인터페이스 정의
    - HTTP/REST 대비 빠른 데이터 직렬화 및 전송 속도
- **주문 생명주기 관리**
    - `접수 대기` -> `조리 중` -> `배달 중` -> `배달 완료` 상태 관리
    - 상태 변경 시 gRPC로 데이터 처리 후 WebSocket으로 클라이언트에 브로드캐스팅

## 4. 시스템 아키텍처 (System Architecture)

이 프로젝트는 **Multi-module (Monorepo)** 구조로 설계

![아키텍처.png](%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98.png)

| **모듈명**          | **역할**          | **주요 책임**                           | **실행 포트** |
|------------------|-----------------|-------------------------------------|-----------|
| **proto**        | **공통 인터페이스**    | gRPC 서비스 정의 (`.proto`), DTO 자동 생성   | -         |
| **web-server**   | **클라이언트 게이트웨이** | 웹소켓 연결 관리, 채팅 중계, **gRPC 클라이언트 역할** | **8080**  |
| **order-server** | **핵심 비즈니스 로직**  | 주문 데이터 DB 저장/조회, **gRPC 서버 역할**     | **9090**  |

## 5. 기술 스택

### Environment

- **Language:** Java 21
- **Framework:** Spring Boot 3.5.7
- **Build Tool:** Gradle - groovy

### Communication & Data

- **Internal Comm:** **gRPC-Java 1.76.0** (Netty Shaded)
- **Serialization:** **Protobuf 3.25.8**
- **External Comm:** **WebSocket** (Spring Boot Starter WebSocket, STOMP)
- **Database:** H2 Database (In-memory for MVP)
- **ORM:** Spring Data JPA

### Frontend

- **Core:** HTML5, CSS3
- **Library:** SockJS, Stomp.js (실시간 통신용)
