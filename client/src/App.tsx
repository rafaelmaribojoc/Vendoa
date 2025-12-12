import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { useAuthStore } from "./store/authStore";
import { Loader2 } from "lucide-react";

// Eagerly loaded components (needed immediately)
import Layout from "./components/Layout";
import Login from "./pages/Login";

// Lazy loaded components (loaded on demand)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const POS = lazy(() => import("./pages/POS"));
const Products = lazy(() => import("./pages/Products"));
const Categories = lazy(() => import("./pages/Categories"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Sales = lazy(() => import("./pages/Sales"));
const Credits = lazy(() => import("./pages/Credits"));
const StockMovements = lazy(() => import("./pages/StockMovements"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const UserManagement = lazy(() => import("./pages/UserManagement"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Loading...
        </span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin" && user?.role !== "manager") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="pos"
          element={
            <Suspense fallback={<PageLoader />}>
              <POS />
            </Suspense>
          }
        />
        <Route
          path="products"
          element={
            <Suspense fallback={<PageLoader />}>
              <Products />
            </Suspense>
          }
        />
        <Route
          path="categories"
          element={
            <Suspense fallback={<PageLoader />}>
              <Categories />
            </Suspense>
          }
        />
        <Route
          path="suppliers"
          element={
            <Suspense fallback={<PageLoader />}>
              <Suppliers />
            </Suspense>
          }
        />
        <Route
          path="sales"
          element={
            <Suspense fallback={<PageLoader />}>
              <Sales />
            </Suspense>
          }
        />
        <Route
          path="credits"
          element={
            <Suspense fallback={<PageLoader />}>
              <Credits />
            </Suspense>
          }
        />
        <Route
          path="stock"
          element={
            <Suspense fallback={<PageLoader />}>
              <StockMovements />
            </Suspense>
          }
        />
        <Route
          path="reports"
          element={
            <Suspense fallback={<PageLoader />}>
              <Reports />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <Settings />
            </Suspense>
          }
        />
        <Route
          path="users"
          element={
            <ManagerRoute>
              <Suspense fallback={<PageLoader />}>
                <UserManagement />
              </Suspense>
            </ManagerRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
