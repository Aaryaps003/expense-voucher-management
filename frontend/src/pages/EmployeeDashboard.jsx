
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./EmployeeDashboard.css";
import VoucherPrint from "../components/VoucherPrint";

const API_URL = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  expenseDate: new Date().toLocaleDateString("en-CA"),
  department: "",
  title: "",
  category: "",
  description: "",
  amount: "",
};

const STATUSES = [
  "Draft",
  "Submitted",
  "Pending Approval",
  "Approved",
  "Rejected",
];

function EmployeeDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [signatureFiles, setSignatureFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");

  const token = localStorage.getItem("expenseVoucherToken");
  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const logout = useCallback(() => {
    localStorage.removeItem("expenseVoucherToken");
    localStorage.removeItem("expenseVoucherUser");
    navigate("/login", { replace: true });
  }, [navigate]);

  const handleApiError = useCallback(
    (err, fallback) => {
      if (err.response?.status === 401) {
        logout();
        return;
      }

      setError(err.response?.data?.message || fallback);
    },
    [logout]
  );

  const loadData = useCallback(async () => {
    if (!token) {
      logout();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [voucherResponse, statsResponse] = await Promise.all([
        axios.get(`${API_URL}/vouchers/`, {
          headers: authHeaders,
        }),
        axios.get(`${API_URL}/vouchers/stats`, {
          headers: authHeaders,
        }),
      ]);

      setVouchers(voucherResponse.data.vouchers || []);
      setStats(statsResponse.data);

      const savedUser = localStorage.getItem("expenseVoucherUser");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (err) {
      handleApiError(err, "Unable to load your vouchers.");
    } finally {
      setLoading(false);
    }
  }, [token, logout, handleApiError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  async function saveVoucher(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (
      !form.expenseDate ||
      !form.department.trim() ||
      !form.title.trim() ||
      !form.category.trim() ||
      !form.amount ||
      Number(form.amount) <= 0
    ) {
      setError("Complete all required fields and enter an amount above zero.");
      return;
    }

    setSaving(true);

    const payload = {
      expenseDate: form.expenseDate,
      department: form.department.trim(),
      title: form.title.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      amount: Number(form.amount),
    };

    try {
      if (editingId) {
        const response = await axios.patch(
          `${API_URL}/vouchers/${editingId}`,
          payload,
          { headers: authHeaders }
        );
        setMessage(response.data.message || "Draft updated successfully.");
      } else {
        const response = await axios.post(
          `${API_URL}/vouchers/`,
          payload,
          { headers: authHeaders }
        );
        setMessage(response.data.message || "Voucher created successfully.");
      }

      resetForm();
      await loadData();
    } catch (err) {
      handleApiError(err, "Unable to save the voucher.");
    } finally {
      setSaving(false);
    }
  }

  function editVoucher(voucher) {
    if (voucher.status !== "Draft") return;

    setEditingId(voucher._id);
    setForm({
      expenseDate: voucher.expenseDate
        ? new Date(voucher.expenseDate).toLocaleDateString("en-CA")
        : "",
      department: voucher.department || "",
      title: voucher.title || "",
      category: voucher.category || "",
      description: voucher.description || "",
      amount: String(voucher.amount ?? ""),
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteVoucher(voucher) {
    if (voucher.status !== "Draft") return;

    const confirmed = window.confirm(
      `Delete draft "${voucher.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await axios.delete(
        `${API_URL}/vouchers/${voucher._id}`,
        { headers: authHeaders }
      );
      setMessage(response.data.message || "Draft deleted successfully.");
      await loadData();
    } catch (err) {
      handleApiError(err, "Unable to delete this draft.");
    }
  }

  async function uploadSignature(voucher) {
    const file = signatureFiles[voucher._id];

    if (!file) {
      setError(`Choose a signature image for ${voucher.voucherNumber}.`);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Signature must be a PNG, JPEG, or WebP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Signature image must be smaller than 2 MB.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const data = new FormData();
      data.append("signature", file);

      const response = await axios.post(
        `${API_URL}/vouchers/${voucher._id}/signature`,
        data,
        { headers: authHeaders }
      );

      setMessage(response.data.message || "Signature uploaded successfully.");
      setSignatureFiles((current) => ({
        ...current,
        [voucher._id]: null,
      }));

      await loadData();
    } catch (err) {
      handleApiError(err, "Unable to upload the signature.");
    } finally {
      setSaving(false);
    }
  }

  async function submitVoucher(voucher) {
    if (!voucher.employeeSignature) {
      setError("Upload your signature before submitting this voucher.");
      return;
    }

    const confirmed = window.confirm(
      `Submit "${voucher.title}" for Director approval? You will no longer be able to edit or delete it.`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await axios.patch(
        `${API_URL}/vouchers/${voucher._id}/submit`,
        {},
        { headers: authHeaders }
      );

      setMessage(response.data.message || "Voucher submitted for approval.");
      await loadData();
    } catch (err) {
      handleApiError(err, "Unable to submit this voucher.");
    } finally {
      setSaving(false);
    }
  }

  const statusCounts = stats?.statusCounts || {};
  const cards = [
    {
      title: "Total vouchers",
      value: stats?.total ?? vouchers.length,
      color: "blue",
      icon: "▤",
    },
    {
      title: "Drafts",
      value: statusCounts.Draft ?? 0,
      color: "purple",
      icon: "✎",
    },
    {
      title: "Pending approval",
      value: statusCounts["Pending Approval"] ?? 0,
      color: "amber",
      icon: "◷",
    },
    {
      title: "Approved",
      value: statusCounts.Approved ?? 0,
      color: "green",
      icon: "✓",
    },
    {
      title: "Rejected",
      value: statusCounts.Rejected ?? 0,
      color: "red",
      icon: "×",
    },
  ];

  const visibleVouchers =
    filter === "All"
      ? vouchers
      : vouchers.filter((voucher) => voucher.status === filter);

  function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatAmount(amount) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);
  }

  return (
    <div className="employee-layout">
      <aside className="employee-sidebar">
        <div className="employee-brand">
          <span className="employee-brand-icon">EV</span>
          <span>ExpenseFlow</span>
        </div>

        <p className="employee-sidebar-label">WORKSPACE</p>
        <div className="employee-sidebar-link active">
          <span>▦</span> My Dashboard
        </div>

        <div className="employee-sidebar-bottom">
          <div className="employee-profile">
            <div className="employee-avatar">
              {(user?.name || "E").charAt(0).toUpperCase()}
            </div>
            <div className="employee-profile-info">
              <strong>{user?.name || "Employee"}</strong>
              <span>{user?.email || "Employee account"}</span>
            </div>
          </div>

          <button className="employee-logout" onClick={logout}>
            ↪ Sign out
          </button>
        </div>
      </aside>

      <main className="employee-main">
        <header className="employee-header">
          <div>
            <p className="employee-breadcrumb">Workspace / Employee</p>
            <h1>My Dashboard</h1>
          </div>

          <button
            className="employee-refresh"
            onClick={loadData}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </header>

        <section className="employee-welcome">
          <div>
            <p className="employee-eyebrow">EMPLOYEE WORKSPACE</p>
            <h2>Manage your expenses</h2>
            <p>
              Create vouchers, upload your signature, and track approval
              progress in one place.
            </p>
          </div>
          <div className="employee-welcome-icon">₹</div>
        </section>

        {error && (
          <div className="employee-alert error" role="alert">
            <span>!</span> {error}
            <button onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        {message && (
          <div className="employee-alert success" role="status">
            <span>✓</span> {message}
            <button onClick={() => setMessage("")} aria-label="Dismiss message">
              ×
            </button>
          </div>
        )}

        <section className="employee-stats-grid">
          {cards.map((card) => (
            <article className="employee-stat-card" key={card.title}>
              <div className="employee-stat-top">
                <span>{card.title}</span>
                <span className={`employee-stat-icon ${card.color}`}>
                  {card.icon}
                </span>
              </div>
              <strong>{loading ? "…" : card.value.toLocaleString("en-IN")}</strong>
              <p>Based on your vouchers</p>
            </article>
          ))}
        </section>

        <section className="employee-panel" id="voucher-form">
          <div className="employee-panel-heading">
            <div>
              <h2>{editingId ? "Edit draft voucher" : "Create a voucher"}</h2>
              <p>
                {editingId
                  ? "Update your draft before submitting it."
                  : "Enter your expense details to create a new draft."}
              </p>
            </div>
            <span className="employee-required-note">* Required fields</span>
          </div>

          <form className="employee-voucher-form" onSubmit={saveVoucher}>
            <div className="employee-form-grid">
              <label>
                Expense title *
                <input
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  placeholder="e.g. Office supplies"
                  maxLength={120}
                  required
                />
              </label>

              <label>
                Amount (₹) *
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={updateField}
                  placeholder="e.g. 850"
                  required
                />
              </label>

              <label>
                Expense date *
                <input
                  name="expenseDate"
                  type="date"
                  value={form.expenseDate}
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                Department *
                <input
                  name="department"
                  value={form.department}
                  onChange={updateField}
                  placeholder="e.g. IT"
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Category *
                <select
                  name="category"
                  value={form.category}
                  onChange={updateField}
                  required
                >
                  <option value="">Select a category</option>
                  <option value="Travel">Travel</option>
                  <option value="Meals">Meals</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Software">Software</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Communication">Communication</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="employee-description-field">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  placeholder="Add a reason or any additional expense details..."
                  rows={3}
                  maxLength={1000}
                />
              </label>
            </div>

            <div className="employee-form-actions">
              {editingId && (
                <button
                  type="button"
                  className="employee-secondary-button"
                  onClick={resetForm}
                >
                  Cancel editing
                </button>
              )}
              <button
                type="submit"
                className="employee-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Create draft"}
              </button>
            </div>
          </form>
        </section>

        <section className="employee-panel employee-vouchers-panel">
          <div className="employee-panel-heading employee-vouchers-heading">
            <div>
              <h2>My vouchers</h2>
              <p>Review your expenses and track each voucher's progress.</p>
            </div>

            <label className="employee-filter-label">
              Status
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="All">All statuses</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="employee-empty-state">Loading your vouchers...</div>
          ) : visibleVouchers.length === 0 ? (
            <div className="employee-empty-state">
              <div className="employee-empty-icon">▤</div>
              <h3>No vouchers found</h3>
              <p>
                {filter === "All"
                  ? "Create your first expense voucher using the form above."
                  : `You don't have any vouchers with status "${filter}".`}
              </p>
            </div>
          ) : (
            <div className="employee-voucher-list">
              {visibleVouchers.map((voucher) => (
                <article className="employee-voucher-card" key={voucher._id}>
                  <div className="employee-voucher-card-top">
                    <div className="employee-voucher-title">
                      <span className="employee-voucher-number">
                        {voucher.voucherNumber}
                      </span>
                      <h3>{voucher.title}</h3>
                      <p>
                        {voucher.department} · {voucher.category}
                      </p>
                    </div>

                    <span
                      className={`employee-status status-${voucher.status
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {voucher.status}
                    </span>
                  </div>

                  <div className="employee-voucher-details">
                    <div>
                      <span>Amount</span>
                      <strong>{formatAmount(voucher.amount)}</strong>
                    </div>
                    <div>
                      <span>Expense date</span>
                      <strong>{formatDate(voucher.expenseDate)}</strong>
                    </div>
                    <div>
                      <span>Created</span>
                      <strong>{formatDate(voucher.createdAt)}</strong>
                    </div>
                  </div>

                  {voucher.description && (
                    <p className="employee-voucher-description">
                      {voucher.description}
                    </p>
                  )}

                  {voucher.status === "Rejected" && voucher.rejectionReason && (
                    <div className="employee-rejection-reason">
                      <strong>Rejection reason</strong>
                      <p>{voucher.rejectionReason}</p>
                    </div>
                  )}

                  {voucher.status === "Approved" && voucher.approvalDate && (
                    <p className="employee-approved-date">
                      Approved on {formatDate(voucher.approvalDate)}
                    </p>
                  )}

                  <div className="employee-print-action">
                    <VoucherPrint
                      voucher={{
                        ...voucher,
                        employee: {
                          name: user?.name || "—",
                          email: user?.email || "—",
                        },
                      }}
                      token={token}
                      apiUrl={API_URL}
                    />
                  </div>

                  {voucher.status === "Draft" && (
                    <div className="employee-draft-actions">
                      <div className="employee-signature-control">
                        <label htmlFor={`signature-${voucher._id}`}>
                          Employee signature (PNG, JPEG, WebP; max 2 MB)
                        </label>
                        <input
                          id={`signature-${voucher._id}`}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) =>
                            setSignatureFiles((current) => ({
                              ...current,
                              [voucher._id]: event.target.files?.[0] || null,
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="employee-secondary-button"
                          disabled={saving}
                          onClick={() => uploadSignature(voucher)}
                        >
                          Upload signature
                        </button>
                        <span className="employee-signature-status">
                          {voucher.employeeSignature
                            ? "Signature uploaded"
                            : "Signature required before submission"}
                        </span>
                      </div>

                      <div className="employee-draft-buttons">
                        <button
                          type="button"
                          className="employee-secondary-button"
                          onClick={() => editVoucher(voucher)}
                          disabled={saving}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="employee-danger-button"
                          onClick={() => deleteVoucher(voucher)}
                          disabled={saving}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          className="employee-primary-button"
                          onClick={() => submitVoucher(voucher)}
                          disabled={saving || !voucher.employeeSignature}
                          title={
                            voucher.employeeSignature
                              ? "Submit for Director approval"
                              : "Upload your signature first"
                          }
                        >
                          Submit for approval
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="employee-footer">
          ExpenseFlow <span>•</span> Expense Voucher Management System
        </footer>
      </main>
    </div>
  );
}

export default EmployeeDashboard;
