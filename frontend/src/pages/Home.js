import React from 'react';
import {Link} from 'react-router-dom';

function Home() {
    return (
        <div style={{textAlign: 'center', marginTop: '100px'}}>
            <h1>배달 서비스 입장</h1>
            <div style={{display: 'flex', justifyContent: 'center', gap: '20px'}}>
                <Link to="/customer">
                    <button style={{padding: '20px', fontSize: '20px'}}>고객님으로 주문하기</button>
                </Link>
                <Link to="/owner">
                    <button style={{padding: '20px', fontSize: '20px', backgroundColor: '#ffeba7'}}>사장님으로 관리하기</button>
                </Link>
            </div>
        </div>
    );
}

export default Home;
