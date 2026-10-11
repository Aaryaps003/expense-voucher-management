
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../App.css";

function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";

      const payload = isRegister
        ? form
        : { email: form.email, password: form.password };

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        payload
      );

      if (isRegister) {
        setIsRegister(false);
        setForm({
          name: "",
          email: form.email,
          password: "",
        });
        setError("Registration successful. Please sign in.");
        return;
      }

      const { token, user } = response.data;

      if (!token || !user || !user.role) {
        throw new Error("The server returned an incomplete login response.");
      }

      localStorage.setItem("expenseVoucherToken", token);
      localStorage.setItem("expenseVoucherUser", JSON.stringify(user));

      if (user.role === "Employee") {
        navigate("/employee");
      } else if (user.role === "Director") {
        navigate("/director");
      } else if (user.role === "Accounts") {
        navigate("/accounts");
      } else {
        setError("Your account has an unrecognized role.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to complete your request."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="brand-panel">
        <div className="brand">
          <span className="brand-icon">EV</span>
          <span>ExpenseFlow</span>
        </div>

        <div className="brand-content">
          <span className="eyebrow">EXPENSE MANAGEMENT, SIMPLIFIED</span>
          <h1>Every expense.<br />One clear workflow.</h1>
          <p>
            Create vouchers, collect approvals, and track expenses
            through one secure workspace.
          </p>

          <div className="feature-list">
            <div><span>✓</span> Digital voucher management</div>
            <div><span>✓</span> Role-based approval workflow</div>
            <div><span>✓</span> Transparent expense tracking</div>
          </div>
        </div>

        <p className="brand-footer">
          A simpler way to manage business expenses.
        </p>
      </section>

      <section className="form-panel">
        <div className="mobile-brand">
          <span className="brand-icon">EV</span>
          <span>ExpenseFlow</span>
        </div>

        <div className="auth-card">
          <span className="eyebrow">WELCOME TO EXPENSEFLOW</span>

          <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>

          <p className="form-subtitle">
            {isRegister
              ? "Register as an employee to get started."
              : "Sign in to access your expense workspace."}
          </p>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={isRegister ? 8 : undefined}
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </div>

            {error && (
              <p className="form-message" role="alert">
                {error}
              </p>
            )}

            <button
              className="submit-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create account"
                  : "Sign in"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="auth-switch">
            {isRegister
              ? "Already have an account?"
              : "Don't have an employee account?"}
            {" "}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setIsRegister((previous) => !previous);
                setError("");
                setForm({ name: "", email: "", password: "" });
              }}
            >
              {isRegister ? "Sign in" : "Register"}
            </button>
          </div>

          <p className="security-note">
            <span aria-hidden="true">🔒</span>
            Secure access to your organization's expense workflow
          </p>
        </div>

        <p className="copyright">
          © 2026 ExpenseFlow · Expense management system
        </p>
      </section>
    </main>
  );
}

export default Login;
