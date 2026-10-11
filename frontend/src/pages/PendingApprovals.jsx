
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import VoucherPrint from "../components/VoucherPrint";

const API_URL = import.meta.env.VITE_API_URL;

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

function formatDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function PendingApprovals() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [signatureFiles, setSignatureFiles] = useState({});
  const [rejectionReasons, setRejectionReasons] = useState({});

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("expenseVoucherToken");

      if (!token) {
        setError("Your session is missing. Please sign in again.");
        return;
      }

      const response = await axios.get(`${API_URL}/vouchers/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setVouchers(response.data.vouchers ?? []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load pending vouchers."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  async function handleApprove(voucher) {
    const file = signatureFiles[voucher._id];

    if (!file) {
      setError(`Select a signature image for ${voucher.voucherNumber} first.`);
      setMessage("");
      return;
    }

    const confirmed = window.confirm(
      `Upload your signature and approve voucher ${voucher.voucherNumber}?`
    );

    if (!confirmed) return;

    setBusyId(voucher._id);
    setError("");
    setMessage("");

    try {
      const token = localStorage.getItem("expenseVoucherToken");
      const headers = { Authorization: `Bearer ${token}` };

      // Step 1: Upload the Director signature.
      const formData = new FormData();
      formData.append("signature", file);

      await axios.post(
        `${API_URL}/vouchers/${voucher._id}/director-signature`,
        formData,
        { headers }
      );

      // Step 2: Approve only after signature upload succeeds.
      await axios.patch(
        `${API_URL}/vouchers/${voucher._id}/approve`,
        {},
        { headers }
      );

      setMessage(`Voucher ${voucher.voucherNumber} approved successfully.`);
      setSignatureFiles((previous) => {
        const updated = { ...previous };
        delete updated[voucher._id];
        return updated;
      });

      await fetchVouchers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "The operation failed. Check whether the signature was uploaded and retry."
      );
    } finally {
      setBusyId("");
    }
  }

  async function handleReject(voucher) {
    const reason = (rejectionReasons[voucher._id] ?? "").trim();

    if (!reason) {
      setError(`Enter a rejection reason for ${voucher.voucherNumber}.`);
      setMessage("");
      return;
    }

    const confirmed = window.confirm(
      `Reject voucher ${voucher.voucherNumber}?`
    );

    if (!confirmed) return;

    setBusyId(voucher._id);
    setError("");
    setMessage("");

    try {
      const token = localStorage.getItem("expenseVoucherToken");

      await axios.patch(
        `${API_URL}/vouchers/${voucher._id}/reject`,
        { rejectionReason: reason },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage(`Voucher ${voucher.voucherNumber} rejected successfully.`);

      setRejectionReasons((previous) => {
        const updated = { ...previous };
        delete updated[voucher._id];
        return updated;
      });

      await fetchVouchers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to reject this voucher."
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="pending-page">
      <div className="pending-heading">
        <div>
          <h2>Pending Approvals</h2>
          <p>Review each voucher before making your decision.</p>
        </div>

        <button
          className="refresh-button"
          type="button"
          onClick={fetchVouchers}
          disabled={loading || Boolean(busyId)}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      {error && (
        <div className="pending-alert error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="pending-alert success" role="status">
          {message}
        </div>
      )}

      {!loading && !error && (
        <p className="pending-count">
          {vouchers.length} voucher{vouchers.length === 1 ? "" : "s"} awaiting
          approval
        </p>
      )}

      {loading ? (
        <div className="pending-empty">Loading pending vouchers...</div>
      ) : !error && vouchers.length === 0 ? (
        <div className="pending-empty">
          <div className="pending-empty-icon">✓</div>
          <h3>You're all caught up!</h3>
          <p>No vouchers currently have Pending Approval status.</p>
        </div>
      ) : (
        !error && (
          <div className="pending-list">
            {vouchers.map((voucher) => (
              <article className="pending-card" key={voucher._id}>
                <div className="pending-card-header">
                  <div>
                    <span className="voucher-number">
                      {voucher.voucherNumber}
                    </span>
                    <h3>{voucher.title || "Expense voucher"}</h3>
                  </div>

                  <span className="pending-status">Pending Approval</span>
                </div>

                <div className="pending-pdf-action">
                  <VoucherPrint
                    voucher={voucher}
                    token={localStorage.getItem("expenseVoucherToken") || ""}
                    apiUrl={API_URL}
                  />
                </div>

                <div className="pending-details">
                  <div>
                    <span>Employee</span>
                    <strong>{voucher.employee?.name ?? "Unknown"}</strong>
                    <small>{voucher.employee?.email ?? ""}</small>
                  </div>

                  <div>
                    <span>Department</span>
                    <strong>{voucher.department || "—"}</strong>
                  </div>

                  <div>
                    <span>Expense date</span>
                    <strong>{formatDate(voucher.expenseDate)}</strong>
                  </div>

                  <div>
                    <span>Category</span>
                    <strong>{voucher.category || "—"}</strong>
                  </div>

                  <div>
                    <span>Amount</span>
                    <strong className="pending-amount">
                      {formatCurrency(voucher.amount)}
                    </strong>
                  </div>
                </div>

                {voucher.description && (
                  <div className="pending-description">
                    <span>Description</span>
                    <p>{voucher.description}</p>
                  </div>
                )}

                <div className="pending-actions">
                  <div className="signature-field">
                    <label htmlFor={`signature-${voucher._id}`}>
                      Director signature image
                    </label>
                    <input
                      id={`signature-${voucher._id}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0];

                        setSignatureFiles((previous) => ({
                          ...previous,
                          [voucher._id]: file,
                        }));

                        setError("");
                      }}
                      disabled={Boolean(busyId)}
                    />
                    <small>
                      JPEG, PNG, or WebP; maximum 2 MB.
                    </small>
                  </div>

                  <div className="rejection-field">
                    <label htmlFor={`reason-${voucher._id}`}>
                      Rejection reason
                    </label>
                    <textarea
                      id={`reason-${voucher._id}`}
                      rows={2}
                      placeholder="Explain why this voucher should be rejected..."
                      value={rejectionReasons[voucher._id] ?? ""}
                      onChange={(event) =>
                        setRejectionReasons((previous) => ({
                          ...previous,
                          [voucher._id]: event.target.value,
                        }))
                      }
                      disabled={Boolean(busyId)}
                    />
                  </div>

                  <div className="pending-buttons">
                    <button
                      className="approve-button"
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => handleApprove(voucher)}
                    >
                      {busyId === voucher._id
                        ? "Processing..."
                        : "Upload signature & approve"}
                    </button>

                    <button
                      className="reject-button"
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => handleReject(voucher)}
                    >
                      Reject voucher
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )
      )}
    </section>
  );
}

export default PendingApprovals;
