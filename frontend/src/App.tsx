import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PaymentSetup from './pages/PaymentSetup';
import Subscription from './pages/Subscription';
import PaymentHistory from './pages/PaymentHistory';
import PaymentConfirmation from './pages/PaymentConfirmation';
import MyPage from './pages/MyPage';
import Profile from './pages/Profile';
import PaymentMethod from './pages/PaymentMethod';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <div className="flex-grow">
            <Routes>
              {/* 公開ルート */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* 保護されたルート */}
              <Route element={<ProtectedRoute redirectPath="/login" />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/payment-setup" element={<PaymentSetup />} />
                <Route path="/payment-confirmation" element={<PaymentConfirmation />} />
                
                {/* マイページとその子ルート */}
                <Route path="/mypage" element={<MyPage />}>
                  <Route index element={<Profile />} />
                  <Route path="subscription" element={<Subscription />} />
                  <Route path="payment-history" element={<PaymentHistory />} />
                  <Route path="payment-method" element={<PaymentMethod />} />
                </Route>
              </Route>
              
              {/* デフォルトリダイレクト */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
