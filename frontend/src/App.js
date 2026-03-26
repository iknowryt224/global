import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthErrorModal from "./components/AuthErrorModal";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import Dashboard from "./pages/Dashboard";
import ShipmentsPage from "./pages/ShipmentsPage";
import ShipmentDetailPage from "./pages/ShipmentDetailPage";
import CreateEditShipmentPage from "./pages/CreateEditShipmentPage";
import UsersPage from "./pages/UsersPage";
import DeliveriesPage from "./pages/DeliveriesPage";
import AdminLocationsPage from "./pages/AdminLocationsPage";

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2463]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Public Route Component (redirect if authenticated)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2463]"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutesWithErrorModal() {
  const { authError, retryAuth, loading: authLoading } = useAuth();

  return (
    <>
      <AppRoutes />
      <AuthErrorModal
        error={authError}
        isOpen={!!authError}
        onRetry={retryAuth}
        isRetrying={false}
      />
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        } 
      />

      {/* Auth Callback Route - handles email confirmation */}
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Protected Dashboard Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      >
        <Route path="shipments" element={<ShipmentsPage />} />
        <Route path="shipments/new" element={<CreateEditShipmentPage />} />
        <Route path="shipments/:id" element={<ShipmentDetailPage />} />
        <Route path="shipments/:id/edit" element={<CreateEditShipmentPage />} />
        <Route 
          path="users" 
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <UsersPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="locations" 
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLocationsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="deliveries" 
          element={
            <ProtectedRoute allowedRoles={["driver"]}>
              <DeliveriesPage />
            </ProtectedRoute>
          } 
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutesWithErrorModal />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
