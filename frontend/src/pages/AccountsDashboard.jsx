
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AccountsDashboard.css";
import VoucherPrint from "../components/VoucherPrint";
import "./AccountsReporting.css";

const API_URL = import.meta.env.VITE_API_URL;

const STATUSES = [
  "Draft",
  "Submitted",
  "Pending Approval",
  "Approved",
  "Rejected",
];

function AccountsDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [reportVouchers, setReportVouchers] = useState([]);

  const limit = 10;
  const token = localStorage.getItem("expenseVoucherToken");

  const logout = useCallback(() => {
    localStorage.removeItem("expenseVoucherToken");
    localStorage.removeItem("expenseVoucherUser");
    navigate("/login", { replace: true });
  }, [navigate]);

  const handleError = useCallback(
    (err, fallback) => {
      if (err.response?.status === 401) {
        logout();
        return;
      }

      setError(err.response?.data?.message || fallback);
    },
    [logout]
  );

  const loadStats = useCallback(async () => {
    const response = await axios.get(`${API_URL}/vouchers/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setStats(response.data);
  }, [token]);

  const loadVouchers = useCallback(async () => {
    const params = { page, limit };

    if (search.trim()) params.search = search.trim();
    if (status) params.status = status;
    if (department.trim()) params.department = department.trim();
    if (category.trim()) params.category = category.trim();
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await axios.get(`${API_URL}/vouchers/all`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });

    setVouchers(response.data.vouchers || []);
    setTotal(response.data.total || 0);
    setTotalPages(Math.max(1, response.data.totalPages || 1));
  }, [
    token,
    page,
    search,
    status,
    department,
    category,
    startDate,
    endDate,
  ]);

  // Fetch every record matching the active filters for accurate reports and full export.
  const loadReportVouchers = useCallback(async () => {
    const baseParams = { limit: 100 };
    if (search.trim()) baseParams.search = search.trim();
    if (status) baseParams.status = status;
    if (department.trim()) baseParams.department = department.trim();
    if (category.trim()) baseParams.category = category.trim();
    if (startDate) baseParams.startDate = startDate;
    if (endDate) baseParams.endDate = endDate;

    const firstResponse = await axios.get(`${API_URL}/vouchers/all`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { ...baseParams, page: 1 },
    });

    const allRecords = [...(firstResponse.data.vouchers || [])];
    const pages = Number(firstResponse.data.totalPages) || 1;

    for (let currentPage = 2; currentPage <= pages; currentPage += 1) {
      const response = await axios.get(`${API_URL}/vouchers/all`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { ...baseParams, page: currentPage },
      });
      allRecords.push(...(response.data.vouchers || []));
    }

    setReportVouchers(allRecords);
  }, [token, search, status, department, category, startDate, endDate]);

  useEffect(() => {
    if (!token) return;
    loadReportVouchers().catch((err) => {
      handleError(err, "Unable to load expense report summaries.");
    });
  }, [token, loadReportVouchers, handleError]);

  const refresh = useCallback(async () => {
    if (!token) {
      logout();
      return;
    }

    setLoading(true);
    setError("");

    try {
      await Promise.all([loadStats(), loadVouchers()]);
    } catch (err) {
      handleError(err, "Unable to load the Accounts Dashboard.");
    } finally {
      setLoading(false);
    }
  }, [token, logout, loadStats, loadVouchers, handleError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setDepartment("");
    setCategory("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setMessage("");
  }

  function formatAmount(amount) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  async function exportCsv() {
    if (exporting) return;

    setExporting(true);
    setError("");
    setMessage("");

    try {
      // Re-fetch every page at export time so the file includes all records
      // matching the current filters, not just the visible page.
      const params = { limit: 100 };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (department.trim()) params.department = department.trim();
      if (category.trim()) params.category = category.trim();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const first = await axios.get(`${API_URL}/vouchers/all`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { ...params, page: 1 },
      });
      const allVouchers = [...(first.data.vouchers || [])];
      const pages = Number(first.data.totalPages) || 1;

      for (let currentPage = 2; currentPage <= pages; currentPage += 1) {
        const response = await axios.get(`${API_URL}/vouchers/all`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { ...params, page: currentPage },
        });
        allVouchers.push(...(response.data.vouchers || []));
      }

      if (!allVouchers.length) {
        setError("There are no matching vouchers to export.");
        return;
      }

      const columns = [
        "Voucher Number", "Employee", "Employee Email", "Title", "Department",
        "Category", "Description", "Expense Date", "Amount (INR)", "Status",
        "Created Date", "Approval Date", "Rejection Reason",
      ];

      const escapeCsv = (value) => {
        let text = String(value ?? "");
        // Guard against spreadsheet formula execution in untrusted text fields.
        if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
        return `"${text.replace(/"/g, '""')}"`;
      };

      const rows = allVouchers.map((voucher) => [
        voucher.voucherNumber,
        voucher.employee?.name || "",
        voucher.employee?.email || "",
        voucher.title,
        voucher.department,
        voucher.category,
        voucher.description,
        formatDate(voucher.expenseDate),
        Number(voucher.amount) || 0,
        voucher.status,
        formatDate(voucher.createdAt),
        formatDate(voucher.approvalDate),
        voucher.rejectionReason,
      ]);

      const csv = [
        columns.map(escapeCsv).join(","),
        ...rows.map((row) => row.map(escapeCsv).join(",")),
      ].join("\\r\\n");

      const blob = new Blob(["\\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `expense-vouchers-all-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setMessage(`Exported all ${allVouchers.length} matching voucher(s).`);
    } catch (err) {
      handleError(err, "Unable to export matching vouchers.");
    } finally {
      setExporting(false);
    }
  }

  const counts = stats?.statusCounts || {};
  const amounts = stats?.amounts || {};

  const cards = [
    {
      title: "Total vouchers",
      value: stats?.total ?? total,
      icon: "▤",
      color: "blue",
    },
    {
      title: "Approved vouchers",
      value: counts.Approved ?? 0,
      icon: "✓",
      color: "green",
    },
    {
      title: "Pending approval",
      value: counts["Pending Approval"] ?? 0,
      icon: "◷",
      color: "amber",
    },
    {
      title: "Approved expenses",
      value: formatAmount(amounts.approvedAmount),
      icon: "₹",
      color: "purple",
    },
  ];

  return (
    <div className="accounts-layout">
      <aside className="accounts-sidebar">
        <div className="accounts-brand">
          <span className="accounts-brand-icon">EV</span>
          <span>ExpenseFlow</span>
        </div>

        <p className="accounts-sidebar-label">WORKSPACE</p>

        <div className="accounts-nav-item active">
          <span>▦</span> Accounts overview
        </div>

        <div className="accounts-sidebar-bottom">
          <div className="accounts-profile">
            <div className="accounts-avatar">A</div>
            <div>
              <strong>Accounts</strong>
              <span>Finance workspace</span>
            </div>
          </div>

          <button className="accounts-logout" onClick={logout}>
            ↪ Sign out
          </button>
        </div>
      </aside>

      <main className="accounts-main">
        <header className="accounts-header">
          <div>
            <p className="accounts-breadcrumb">Workspace / Accounts</p>
            <h1>Accounts Dashboard</h1>
          </div>

          <button
            className="accounts-refresh"
            onClick={refresh}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </header>

        <section className="accounts-welcome">
          <div>
            <p className="accounts-eyebrow">FINANCE WORKSPACE</p>
            <h2>Organization expense overview</h2>
            <p>
              Review voucher records, monitor approved spending, and export
              the current register for reporting.
            </p>
          </div>
          <div className="accounts-welcome-icon">₹</div>
        </section>

        {error && (
          <div className="accounts-alert error" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        {message && (
          <div className="accounts-alert success" role="status">
            {message}
            <button
              onClick={() => setMessage("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        <section className="accounts-stats-grid">
          {cards.map((card) => (
            <article className="accounts-stat-card" key={card.title}>
              <div className="accounts-stat-top">
                <span>{card.title}</span>
                <span className={`accounts-stat-icon ${card.color}`}>
                  {card.icon}
                </span>
              </div>
              <strong>
                {loading
                  ? "…"
                  : typeof card.value === "number"
                    ? card.value.toLocaleString("en-IN")
                    : card.value}
              </strong>
              <p>Organization-wide records</p>
            </article>
          ))}
        </section>

        <section className="accounts-report-strip">
          <div>
            <span>Total recorded expenses</span>
            <strong>
              {loading ? "…" : formatAmount(amounts.totalAmount)}
            </strong>
          </div>
          <div>
            <span>Pending approval amount</span>
            <strong>
              {loading ? "…" : formatAmount(amounts.pendingAmount)}
            </strong>
          </div>
          <div>
            <span>Rejected vouchers</span>
            <strong>
              {loading ? "…" : (counts.Rejected ?? 0).toLocaleString("en-IN")}
            </strong>
          </div>
        </section>

        <section className="accounts-reporting-panel">
          <div className="accounts-panel-heading">
            <div>
              <h2>Expense reports</h2>
              <p>Summaries reflect all vouchers matching the filters below.</p>
            </div>
            <span className="accounts-report-count">
              {reportVouchers.length.toLocaleString("en-IN")} matching records
            </span>
          </div>

          <div className="accounts-reporting-grid">
            <article className="accounts-report-card">
              <h3>Monthly expenses</h3>
              {Object.entries(
                reportVouchers.reduce((summary, voucher) => {
                  if (!voucher.expenseDate) return summary;
                  const date = new Date(voucher.expenseDate);
                  if (Number.isNaN(date.getTime())) return summary;
                  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                  if (!summary[key]) summary[key] = { count: 0, amount: 0 };
                  summary[key].count += 1;
                  summary[key].amount += Number(voucher.amount) || 0;
                  return summary;
                }, {})
              ).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6).map(([month, item]) => (
                <div className="accounts-report-row" key={month}>
                  <span>{new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                  <span>{item.count} voucher(s)</span>
                  <strong>{formatAmount(item.amount)}</strong>
                </div>
              ))}
              {reportVouchers.length > 0 && !reportVouchers.some((v) => v.expenseDate) && (
                <p className="accounts-report-empty">No dated expenses found.</p>
              )}
            </article>

            <article className="accounts-report-card">
              <h3>Department breakdown</h3>
              {Object.entries(
                reportVouchers.reduce((summary, voucher) => {
                  const key = voucher.department || "Unspecified";
                  if (!summary[key]) summary[key] = { count: 0, amount: 0 };
                  summary[key].count += 1;
                  summary[key].amount += Number(voucher.amount) || 0;
                  return summary;
                }, {})
              ).sort(([, a], [, b]) => b.amount - a.amount).slice(0, 6).map(([name, item]) => (
                <div className="accounts-report-row" key={name}>
                  <span>{name}</span>
                  <span>{item.count} voucher(s)</span>
                  <strong>{formatAmount(item.amount)}</strong>
                </div>
              ))}
              {!reportVouchers.length && <p className="accounts-report-empty">No matching records.</p>}
            </article>

            <article className="accounts-report-card">
              <h3>Category breakdown</h3>
              {Object.entries(
                reportVouchers.reduce((summary, voucher) => {
                  const key = voucher.category || "Unspecified";
                  if (!summary[key]) summary[key] = { count: 0, amount: 0 };
                  summary[key].count += 1;
                  summary[key].amount += Number(voucher.amount) || 0;
                  return summary;
                }, {})
              ).sort(([, a], [, b]) => b.amount - a.amount).slice(0, 6).map(([name, item]) => (
                <div className="accounts-report-row" key={name}>
                  <span>{name}</span>
                  <span>{item.count} voucher(s)</span>
                  <strong>{formatAmount(item.amount)}</strong>
                </div>
              ))}
              {!reportVouchers.length && <p className="accounts-report-empty">No matching records.</p>}
            </article>
          </div>
        </section>

        <section className="accounts-panel">
          <div className="accounts-panel-heading">
            <div>
              <h2>Voucher register</h2>
              <p>
                Search and filter organization-wide vouchers. Export downloads
                all matching records across every page.
              </p>
            </div>

            <button
              className="accounts-export-button"
              onClick={exportCsv}
              disabled={loading || exporting || total === 0}
            >
              {exporting ? "Preparing CSV…" : "↓ Export all CSV"}
            </button>
          </div>

          <form className="accounts-search-form" onSubmit={applySearch}>
            <label className="accounts-search-field">
              Search
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Voucher, employee, title..."
              />
            </label>

            <label>
              Status
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Department
              <input
                value={department}
                onChange={(event) => {
                  setDepartment(event.target.value);
                  setPage(1);
                }}
                placeholder="e.g. IT"
              />
            </label>

            <label>
              Category
              <input
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                placeholder="e.g. Travel"
              />
            </label>

            <label>
              From date
              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPage(1);
                }}
              />
            </label>

            <label>
              To date
              <input
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPage(1);
                }}
              />
            </label>

            <div className="accounts-filter-actions">
              <button type="submit" className="accounts-apply-button">
                Search
              </button>
              <button
                type="button"
                className="accounts-clear-button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          </form>

          <div className="accounts-table-meta">
            <span>
              {loading
                ? "Loading records..."
                : `Showing ${vouchers.length ? (page - 1) * limit + 1 : 0}–${Math.min(
                    (page - 1) * limit + vouchers.length,
                    total
                  )} of ${total} vouchers`}
            </span>
            <span>Page {page} of {totalPages}</span>
          </div>

          <div className="accounts-table-wrap">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>Voucher</th>
                  <th>Employee</th>
                  <th>Expense</th>
                  <th>Department / Category</th>
                  <th>Expense date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Document</th>
                </tr>
              </thead>

              <tbody>
                {!loading && vouchers.length === 0 && !error && (
                  <tr>
                    <td colSpan="8" className="accounts-no-data">
                      No vouchers match the selected filters.
                    </td>
                  </tr>
                )}

                {vouchers.map((voucher) => (
                  <tr key={voucher._id}>
                    <td>
                      <strong className="accounts-voucher-number">
                        {voucher.voucherNumber}
                      </strong>
                    </td>
                    <td>
                      <strong>{voucher.employee?.name || "—"}</strong>
                      <span className="accounts-employee-email">
                        {voucher.employee?.email || ""}
                      </span>
                    </td>
                    <td>
                      <strong>{voucher.title}</strong>
                      {voucher.description && (
                        <span className="accounts-description">
                          {voucher.description}
                        </span>
                      )}
                    </td>
                    <td>
                      <span>{voucher.department}</span>
                      <span className="accounts-description">
                        {voucher.category}
                      </span>
                    </td>
                    <td>{formatDate(voucher.expenseDate)}</td>
                    <td className="accounts-amount">
                      {formatAmount(voucher.amount)}
                    </td>
                    <td>
                      <span
                        className={`accounts-status status-${voucher.status
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {voucher.status}
                      </span>
                    </td>
                    <td>
                      <VoucherPrint
                        voucher={voucher}
                        token={localStorage.getItem("expenseVoucherToken")}
                        apiUrl={API_URL}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="accounts-pagination">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loading || page <= 1}
            >
              ← Previous
            </button>

            <span>{page} / {totalPages}</span>

            <button
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={loading || page >= totalPages}
            >
              Next →
            </button>
          </div>
        </section>

        <footer className="accounts-footer">
          ExpenseFlow <span>•</span> Expense Voucher Management System
        </footer>
      </main>
    </div>
  );
}

export default AccountsDashboard;
