import React from 'react';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import Home from './pages/Home';
import Customer from './pages/Customer';
import Owner from './pages/Owner';
import Rider from './pages/Rider';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home/>}/>
                <Route path="/customer" element={<Customer/>}/>
                <Route path="/owner" element={<Owner/>}/>
                <Route path="/rider" element={<Rider/>}/>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
