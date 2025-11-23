import React from 'react';
import { Link } from 'react-router-dom';
import '../styles.css';

function Home() {
    return (
        <div className="page-container">
            <div className="hero-section">
                <h1 className="hero-title">배달 서비스</h1>
                <p className="hero-subtitle">빠르고 편리한 배달 주문 시스템</p>
            </div>

            <div className="role-cards">
                <Link to="/customer" className="role-card">
                    <div className="role-card-icon">🛒</div>
                    <h2 className="role-card-title">고객</h2>
                    <p className="role-card-desc">맛있는 음식을 주문하고<br/>실시간으로 배달 현황을 확인하세요</p>
                </Link>

                <Link to="/owner" className="role-card">
                    <div className="role-card-icon">👨‍🍳</div>
                    <h2 className="role-card-title">사장님</h2>
                    <p className="role-card-desc">메뉴를 등록하고<br/>들어오는 주문을 관리하세요</p>
                </Link>

                <Link to="/rider" className="role-card">
                    <div className="role-card-icon">🛵</div>
                    <h2 className="role-card-title">라이더</h2>
                    <p className="role-card-desc">배달 요청을 확인하고<br/>안전하게 배달을 완료하세요</p>
                </Link>
            </div>

            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                <p>gRPC + WebSocket 기반 실시간 배달 시스템</p>
            </div>
        </div>
    );
}

export default Home;
