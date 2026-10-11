
import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import DirectorDashboard from "./pages/DirectorDashboard";
import AccountsDashboard from "./pages/AccountsDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function Unauthorized() {
  return (
    <main style={{ padding: "40px", textAlign: "center" }}>
      <h1>Access Denied</h1>
      <p>You don't have permission to access this page.</p>
      <a href="/login">Return to login</a>
    </main>
  );
}

function App() {
  const token = localStorage.getItem("expenseVoucherToken");
  const savedUser = localStorage.getItem("expenseVoucherUser");

  let user = null;

  try {
    user = savedUser ? JSON.parse(savedUser) : null;
  } catch {
    localStorage.removeItem("expenseVoucherToken");
    localStorage.removeItem("expenseVoucherUser");
  }

  const homeRoute =
    token && user
      ? {
          Employee: "/employee",
          Director: "/director",
          Accounts: "/accounts",
        }[user.role] || "/login"
      : "/login";

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute allowedRoles={["Employee"]} />}>
        <Route path="/employee" element={<EmployeeDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["Director"]} />}>
        <Route path="/director" element={<DirectorDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["Accounts"]} />}>
        <Route path="/accounts" element={<AccountsDashboard />} />
      </Route>

      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/" element={<Navigate to={homeRoute} replace />} />
      <Route path="*" element={<Navigate to={homeRoute} replace />} />
    </Routes>
  );
}

export default App;
