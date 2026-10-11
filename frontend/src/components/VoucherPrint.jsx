import { useState } from "react";
import "./VoucherPrint.css";

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

function formatAmount(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

/**
 * Printable voucher document.
 * Use inside a voucher detail/card:
 * <VoucherPrint voucher={voucher} token={token} apiUrl={API_URL} />
 *
 * Uses the existing authenticated signature endpoint and opens a print-ready
 * document. In the browser print dialog, choose "Save as PDF".
 */
export default function VoucherPrint({ voucher, token, apiUrl }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  async function openPrintView() {
    if (!voucher) {
      setError("Voucher details are unavailable.");
      return;
    }

    setOpening(true);
    setError("");

    try {
      const [employeeSignature, directorSignature] = await Promise.all([
        loadSignature("employee", voucher.employeeSignature),
        loadSignature("director", voucher.directorSignature),
      ]);

      const employeeName =
        typeof voucher.employee === "object"
          ? voucher.employee?.name || "—"
          : voucher.employeeName || "—";
      const employeeEmail =
        typeof voucher.employee === "object"
          ? voucher.employee?.email || "—"
          : voucher.employeeEmail || "—";

      const safe = (value) =>
        String(value ?? "—").replace(/[&<>"']/g, (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]);

      const signatureImage = (dataUrl, alt) =>
        dataUrl
          ? `<img class="signature-image" src="${dataUrl}" alt="${safe(alt)}" />`
          : `<span class="signature-missing">Not provided</span>`;

      const documentHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Expense Voucher ${safe(voucher.voucherNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; font: 14px/1.5 Arial, sans-serif; color: #172033; }
  .sheet { max-width: 850px; margin: 0 auto; }
  .top { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; padding-bottom: 22px; border-bottom: 3px solid #243b6b; }
  .brand { font-size: 12px; letter-spacing: 2px; font-weight: 700; color: #53658a; text-transform: uppercase; }
  h1 { margin: 8px 0 4px; font-size: 28px; }
  .sub { color: #667085; }
  .number { text-align: right; }
  .number strong { display: block; font-size: 17px; overflow-wrap: anywhere; }
  .status { display: inline-block; margin-top: 8px; padding: 5px 10px; border: 1px solid #cbd5e1; border-radius: 20px; font-weight: 700; font-size: 12px; }
  h2 { margin: 26px 0 10px; font-size: 15px; color: #243b6b; text-transform: uppercase; letter-spacing: .7px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #dbe2ec; border-radius: 8px; overflow: hidden; }
  .field { padding: 12px 14px; border-bottom: 1px solid #e7ebf2; }
  .field:nth-child(odd) { border-right: 1px solid #e7ebf2; }
  .field label { display: block; margin-bottom: 3px; color: #667085; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
  .field strong { overflow-wrap: anywhere; }
  .description { min-height: 70px; white-space: pre-wrap; overflow-wrap: anywhere; }
  .amount { font-size: 20px; color: #176b48; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 20px; }
  .signature-box { min-height: 130px; padding: 14px; border: 1px solid #dbe2ec; border-radius: 8px; display: flex; flex-direction: column; }
  .signature-box h3 { margin: 0 0 10px; font-size: 13px; }
  .signature-space { height: 65px; display: flex; align-items: center; }
  .signature-image { max-width: 220px; max-height: 60px; object-fit: contain; }
  .signature-missing { color: #98a2b3; font-size: 12px; }
  .sign-line { margin-top: auto; padding-top: 8px; border-top: 1px solid #9aa5b5; font-size: 11px; color: #667085; }
  .rejection { margin-top: 18px; padding: 12px; border: 1px solid #f2c6c6; border-radius: 8px; background: #fff7f7; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #dbe2ec; color: #667085; font-size: 11px; text-align: center; }
  @media print { body { padding: 0; } .sheet { max-width: none; } @page { size: A4; margin: 14mm; } }
  @media screen and (max-width: 600px) { body { padding: 16px; } .top { flex-direction: column; } .number { text-align: left; } .grid, .signatures { grid-template-columns: 1fr; } .field:nth-child(odd) { border-right: 0; } }
</style>
</head>
<body>
<div class="sheet">
  <header class="top">
    <div>
      <div class="brand">ExpenseFlow · Expense Management</div>
      <h1>Expense Voucher</h1>
      <div class="sub">Official expense record</div>
    </div>
    <div class="number">
      <strong>${safe(voucher.voucherNumber)}</strong>
      <div class="sub">Expense date: ${safe(formatDate(voucher.expenseDate))}</div>
      <span class="status">${safe(voucher.status || "—")}</span>
    </div>
  </header>

  <h2>Employee and expense details</h2>
  <div class="grid">
    <div class="field"><label>Employee</label><strong>${safe(employeeName)}</strong></div>
    <div class="field"><label>Employee email</label><strong>${safe(employeeEmail)}</strong></div>
    <div class="field"><label>Department</label><strong>${safe(voucher.department)}</strong></div>
    <div class="field"><label>Category</label><strong>${safe(voucher.category)}</strong></div>
    <div class="field"><label>Expense title</label><strong>${safe(voucher.title)}</strong></div>
    <div class="field"><label>Amount</label><strong class="amount">${safe(formatAmount(voucher.amount))}</strong></div>
    <div class="field"><label>Voucher created</label><strong>${safe(formatDate(voucher.createdAt))}</strong></div>
    <div class="field"><label>Approval date</label><strong>${safe(formatDate(voucher.approvalDate))}</strong></div>
  </div>

  <h2>Description</h2>
  <div class="field description">${safe(voucher.description || "No description provided.")}</div>

  <h2>Signatures</h2>
  <div class="signatures">
    <div class="signature-box">
      <h3>Employee signature</h3>
      <div class="signature-space">${signatureImage(employeeSignature, "Employee signature")}</div>
      <div class="sign-line">Employee acknowledgement</div>
    </div>
    <div class="signature-box">
      <h3>Director signature</h3>
      <div class="signature-space">${signatureImage(directorSignature, "Director signature")}</div>
      <div class="sign-line">Approval authority</div>
    </div>
  </div>

  ${voucher.rejectionReason ? `<div class="rejection"><strong>Rejection reason:</strong><br />${safe(voucher.rejectionReason)}</div>` : ""}

  <footer class="footer">Generated from ExpenseFlow · Verify voucher status before processing payment.</footer>
</div>
<script>
  window.addEventListener("load", () => {
    const images = Array.from(document.images);
    Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
      image.onload = resolve; image.onerror = resolve;
    }))).then(() => setTimeout(() => window.print(), 250));
  });
</script>
</body>
</html>`;

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        setError("Your browser blocked the print window. Allow pop-ups and try again.");
        return;
      }

      printWindow.document.open();
      printWindow.document.write(documentHtml);
      printWindow.document.close();
    } catch (err) {
      setError(err.message || "Unable to prepare the voucher for printing.");
    } finally {
      setOpening(false);
    }
  }

  async function loadSignature(type, filename) {
    if (!filename) return "";
    if (!apiUrl || !token || !voucher?._id) return "";

    const response = await fetch(
      `${apiUrl}/vouchers/${voucher._id}/signature/${type}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) {
      // The document can still be printed if a signature is unavailable.
      return "";
    }

    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  }

  return (
    <div className="voucher-print-control">
      <button
        type="button"
        className="voucher-print-button"
        onClick={openPrintView}
        disabled={opening || !voucher}
      >
        {opening ? "Preparing document…" : "Print / Save as PDF"}
      </button>
      {error && <p className="voucher-print-error" role="alert">{error}</p>}
    </div>
  );
}
