import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import AdminAnnouncementCreate from "./pages/AdminAnnouncementCreate";
import AdminAnnouncementEdit from "./pages/AdminAnnouncementEdit";
import AdminAnnouncementList from "./pages/AdminAnnouncementList";
import AnnouncementDetail from "./pages/AnnouncementDetail";
import AnnouncementList from "./pages/AnnouncementList";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import MyPage from "./pages/MyPage";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import PaymentHistory from "./pages/PaymentHistory";
import PaymentMethod from "./pages/PaymentMethod";
import PaymentSetup from "./pages/PaymentSetup";
import Profile from "./pages/Profile";
import PromotionCode from "./pages/PromotionCode";
import Register from "./pages/Register";
import Subscription from "./pages/Subscription";
import SubscriptionCancel from "./pages/SubscriptionCancel";
import SubscriptionManagement from "./pages/SubscriptionManagement";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import TwoFactorAuth from "./pages/TwoFactorAuth";

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
              <Route path="/two-factor-auth" element={<TwoFactorAuth />} />

              {/* 保護されたルート */}
              <Route element={<ProtectedRoute redirectPath="/login" />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/payment-setup" element={<PaymentSetup />} />
                <Route
                  path="/payment-confirmation"
                  element={<PaymentConfirmation />}
                />

                {/* お知らせ関連 */}
                <Route path="/announcements" element={<AnnouncementList />} />
                <Route
                  path="/announcements/:id"
                  element={<AnnouncementDetail />}
                />

                {/* サブスクリプション関連 */}
                <Route path="/subscription" element={<Subscription />} />
                <Route
                  path="/subscription/success"
                  element={<SubscriptionSuccess />}
                />
                <Route
                  path="/subscription/cancel"
                  element={<SubscriptionCancel />}
                />
                <Route
                  path="/subscription/management"
                  element={<SubscriptionManagement />}
                />

                {/* マイページとその子ルート */}
                <Route path="/mypage" element={<MyPage />}>
                  <Route index element={<Profile />} />
                  <Route
                    path="subscription"
                    element={<SubscriptionManagement />}
                  />
                  <Route path="payment-history" element={<PaymentHistory />} />
                  <Route path="payment-method" element={<PaymentMethod />} />
                  <Route path="promotion" element={<PromotionCode />} />
                </Route>

                {/* 管理者ルート */}
                <Route
                  path="/admin/announcements"
                  element={<AdminAnnouncementList />}
                />
                <Route
                  path="/admin/announcements/create"
                  element={<AdminAnnouncementCreate />}
                />
                <Route
                  path="/admin/announcements/edit/:id"
                  element={<AdminAnnouncementEdit />}
                />
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
