import React from "react";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { Layout } from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ClientDetail from "./pages/ClientDetail.jsx";
import Reports from "./pages/Reports.jsx";
import PurchaseOrders from "./pages/PurchaseOrders.jsx";
import Users from "./pages/Users.jsx";
import NotFound from "./pages/NotFound.jsx";

function Protected({ children, superAdminOnly }) {
  return (
    <ProtectedRoute superAdminOnly={superAdminOnly}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/clients/:id" element={<Protected><ClientDetail /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/purchase-orders" element={<Protected><PurchaseOrders /></Protected>} />
      <Route
        path="/users"
        element={
          <Protected superAdminOnly>
            <Users />
          </Protected>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
