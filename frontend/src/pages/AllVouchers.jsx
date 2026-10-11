import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import VoucherPrint from "../components/VoucherPrint";
import "./AllVouchers.css";

const API_URL = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 10;

const initialFilters = {
  search: "",
  status: "",
  department: "",
  category: "",
  startDate: "",
  endDate: "",
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
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

function AllVouchers() {
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [vouchers, setVouchers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("expenseVoucherToken");

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const currentToken = localStorage.getItem("expenseVoucherToken");

      if (!currentToken) {
        setError("Your session is missing. Please sign in again.");
        setVouchers([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }

      const params = { page, limit: PAGE_SIZE };

      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value.trim()) params[key] = value.trim();
      });

      const response = await axios.get(`${API_URL}/vouchers/all`, {
        params,
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      setVouchers(response.data.vouchers ?? []);
      setTotal(response.data.total ?? 0);
      setTotalPages(response.data.totalPages ?? 0);
    } catch (err) {
      setVouchers([]);
      setTotal(0);
      setTotalPages(0);
      setError(err.response?.data?.message || "Unable to load voucher records.");
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilters]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((previous) => ({ ...previous, [name]: value }));
  }

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
  }

  function clearFilters() {
    setFilters({ ...initialFilters });
    setAppliedFilters({ ...initialFilters });
    setPage(1);
  }

  return (
    <section className="all-vouchers-page">
      <div className="all-vouchers-heading">
        <div>
          <h2>All Vouchers</h2>
          <p>Search, filter, and review organization-wide expense records.</p>
        </div>

        <button
          type="button"
          className="av-button secondary"
          onClick={fetchVouchers}
          disabled={loading}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      <form className="voucher-filters" onSubmit={handleSearch}>
        <div className="av-field search-field">
          <label htmlFor="voucher-search">Search</label>
          <input
            id="voucher-search"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Voucher, title, employee, email..."
          />
        </div>

        <div className="av-field">
          <label htmlFor="voucher-status">Status</label>
          <select id="voucher-status" name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">All statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="av-field">
          <label htmlFor="voucher-department">Department</label>
          <input id="voucher-department" name="department" value={filters.department} onChange={handleFilterChange} placeholder="e.g. IT" />
        </div>

        <div className="av-field">
          <label htmlFor="voucher-category">Category</label>
          <input id="voucher-category" name="category" value={filters.category} onChange={handleFilterChange} placeholder="e.g. Travel" />
        </div>

        <div className="av-field">
          <label htmlFor="voucher-start-date">From date</label>
          <input id="voucher-start-date" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
        </div>

        <div className="av-field">
          <label htmlFor="voucher-end-date">To date</label>
          <input id="voucher-end-date" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
        </div>

        <div className="av-filter-actions">
          <button type="submit" className="av-button primary">Apply filters</button>
          <button type="button" className="av-button secondary" onClick={clearFilters}>Clear</button>
        </div>
      </form>

      {error && <div className="av-error" role="alert">{error}</div>}

      <div className="av-results-summary">
        <span>{loading ? "Loading records..." : `${total} voucher${total === 1 ? "" : "s"} found`}</span>
        {!loading && totalPages > 0 && <span>Page {page} of {totalPages}</span>}
      </div>

      <div className="av-table-wrapper">
        <table className="av-table">
          <thead>
            <tr>
              <th>Voucher</th>
              <th>Employee</th>
              <th>Department</th>
              <th>Expense date</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Status</th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {!loading && !error && vouchers.length === 0 && (
              <tr><td colSpan={8} className="av-empty-cell">No vouchers match your filters.</td></tr>
            )}

            {vouchers.map((voucher) => (
              <tr key={voucher._id}>
                <td>
                  <strong>{voucher.voucherNumber || "—"}</strong>
                  <small>{voucher.title || "Untitled expense"}</small>
                </td>
                <td>
                  <strong>{voucher.employee?.name || "Unknown"}</strong>
                  <small>{voucher.employee?.email || ""}</small>
                </td>
                <td>{voucher.department || "—"}</td>
                <td>{formatDate(voucher.expenseDate)}</td>
                <td>{voucher.category || "—"}</td>
                <td className="av-amount">{formatCurrency(voucher.amount)}</td>
                <td>
                  <span className={`av-status status-${String(voucher.status || "unknown").toLowerCase().replace(/\s+/g, "-")}`}>
                    {voucher.status || "Unknown"}
                  </span>
                </td>
                <td>
                  <VoucherPrint voucher={voucher} token={token} apiUrl={API_URL} />
                </td>
              </tr>
            ))}

            {loading && <tr><td colSpan={8} className="av-empty-cell">Loading vouchers...</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="av-pagination">
        <span>Showing {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
        <div className="av-page-buttons">
          <button type="button" className="av-button secondary" disabled={loading || page <= 1} onClick={() => setPage((current) => current - 1)}>← Previous</button>
          <button type="button" className="av-button secondary" disabled={loading || page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next →</button>
        </div>
      </div>
    </section>
  );
}

export default AllVouchers;
