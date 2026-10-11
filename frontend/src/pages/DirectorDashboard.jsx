
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import PendingApprovals from "./PendingApprovals";
import AllVouchers from "./AllVouchers";
import "./DirectorDashboard.css";

const API_URL = import.meta.env.VITE_API_URL;

function DirectorDashboard() {
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState("Overview");
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem("expenseVoucherToken");

        if (!token) {
          logout();
          return;
        }

        const response = await axios.get(`${API_URL}/vouchers/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setStats(response.data);
      } catch (error) {
        if (error.response?.status === 401) {
          logout();
          return;
        }

        setStatsError(
          error.response?.data?.message ||
            "Unable to load dashboard statistics."
        );
      } finally {
        setStatsLoading(false);
      }
    }

    fetchStats();
  }, []);

  function logout() {
    localStorage.removeItem("expenseVoucherToken");
    localStorage.removeItem("expenseVoucherUser");
    navigate("/login", { replace: true });
  }

  const statusCounts = stats?.statusCounts ?? {};

  const pendingCount =
    (statusCounts.Submitted ?? 0) +
    (statusCounts["Pending Approval"] ?? 0);

  const cards = [
    {
      title: "Total vouchers",
      value: stats?.total ?? 0,
      description: "Across the organization",
      icon: "▤",
      color: "blue",
    },
    {
      title: "Pending review",
      value: pendingCount,
      description: "Awaiting your decision",
      icon: "◷",
      color: "amber",
    },
    {
      title: "Approved",
      value: statusCounts.Approved ?? 0,
      description: "Successfully approved",
      icon: "✓",
      color: "green",
    },
    {
      title: "Rejected",
      value: statusCounts.Rejected ?? 0,
      description: "Vouchers not approved",
      icon: "×",
      color: "red",
    },
  ];

  const menuItems = [
    { name: "Overview", icon: "▦" },
    { name: "Pending Approvals", icon: "✓" },
    { name: "All Vouchers", icon: "▤" },
  ];

  return (
    <div className="director-layout">
      <aside className="director-sidebar">
        <div className="director-brand">
          <span className="director-brand-icon">EV</span>
          <span>ExpenseFlow</span>
        </div>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="director-nav">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="director-profile">
            <div className="profile-avatar">D</div>
            <div>
              <strong>Director</strong>
              <span>Administrator</span>
            </div>
          </div>

          <button className="logout-button" onClick={logout}>
            ↪ <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="director-main">
        <header className="director-header">
          <div>
            <p className="breadcrumb">Workspace / Director</p>
            <h1>{activePage}</h1>
          </div>

          <div className="header-role">
            <span className="online-dot" />
            Director Portal
          </div>
        </header>

        {activePage === "Overview" && (
          <>
            <section className="welcome-section">
              <div>
                <p className="welcome-eyebrow">DIRECTOR WORKSPACE</p>
                <h2>Expense overview</h2>
                <p>Monitor vouchers and manage approval decisions.</p>
              </div>

              <div className="welcome-decoration">₹</div>
            </section>

            {statsError && (
              <p className="dashboard-error" role="alert">
                {statsError}
              </p>
            )}

            <section className="stats-grid">
              {cards.map((card) => (
                <article className="stat-card" key={card.title}>
                  <div className="stat-top">
                    <span>{card.title}</span>
                    <span className={`stat-icon ${card.color}`}>
                      {card.icon}
                    </span>
                  </div>

                  <strong>
                    {statsLoading
                      ? "…"
                      : card.value.toLocaleString("en-IN")}
                  </strong>

                  <p>{card.description}</p>
                </article>
              ))}
            </section>

            <section className="voucher-panel">
              <div className="panel-heading">
                <div>
                  <h2>Approval workflow</h2>
                  <p>
                    Open pending approvals to review vouchers awaiting a
                    decision.
                  </p>
                </div>

                <button
                  className="refresh-button"
                  onClick={() => window.location.reload()}
                >
                  ↻ Refresh
                </button>
              </div>
            </section>
          </>
        )}

        {activePage === "Pending Approvals" && <PendingApprovals />}

        {activePage === "All Vouchers" && <AllVouchers />}

        <footer className="director-footer">
          ExpenseFlow <span>•</span> Expense Voucher Management System
        </footer>
      </main>
    </div>
  );
}

export default DirectorDashboard;
