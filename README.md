# ExpenseFlow — Expense Voucher Management System

ExpenseFlow is a role-based web application for creating, submitting, reviewing, and managing employee expense vouchers. It supports an approval workflow with employee and director signatures, dashboards, reporting, and exports.

> **Internship assessment project.**

## Features

### Employee
- Register and log in.
- Create expense vouchers as drafts.
- Edit or delete vouchers while they remain drafts.
- Upload an employee signature.
- Submit a voucher for approval.
- View personal vouchers and their current status.

### Director
- View vouchers awaiting approval.
- Review voucher details and employee signatures.
- Upload a director signature.
- Approve or reject vouchers.
- Provide a rejection reason when rejecting a voucher.

### Accounts
- View voucher records and dashboard statistics.
- Search and filter records.
- Review approved and rejected vouchers.
- Generate reports and export records.

### General
- JWT-based authentication and role-based access control.
- MongoDB persistence with Mongoose.
- Signature upload validation.
- PDF and CSV output in the application.

## Technology Stack

- **Frontend:** React, Vite, React Router, Axios
- **Backend:** Node.js, Express
- **Database:** MongoDB, Mongoose
- **Authentication:** JSON Web Tokens (JWT), bcrypt
- **File uploads:** Multer with image-content validation

## Project Structure

```text
ExpenseFlow/
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── uploads/          # Runtime uploads; do not commit files
│   ├── .env              # Local secrets; do not commit
│   ├── package.json
│   └── server.js
└── frontend/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   └── pages/
    ├── .env              # Local frontend configuration; do not commit
    ├── package.json
    └── vite.config.js
```

## Prerequisites

- Node.js and npm
- A MongoDB instance or MongoDB Atlas connection
- Git, if cloning the repository

## Configuration

### 1. Backend Environment

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
```

Replace the placeholders with your own values. Never commit this file or share its contents. Use a strong, unique JWT secret.

### 2. Frontend Environment

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Variables prefixed with `VITE_` are exposed to the client-side application. Never put secrets in frontend environment variables.

## Installation and Running Locally

Run the backend and frontend in separate terminals from the repository root.

### 1. Start the Backend

```powershell
cd backend
npm install
npm run dev
```

If the backend package does not provide a `dev` script, use a script available under `scripts` in `backend/package.json`.

The default API address is:

```text
http://localhost:5000
```

### 2. Start the Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Vite normally serves the frontend at:

```text
http://localhost:5173
```

Use the URL shown in the terminal if it differs.

### Useful Frontend Commands

Run these from `frontend/`:

```powershell
npm run build
npm run lint
```

## Main API Routes

Protected routes require a valid bearer token. Exact request bodies, response fields, and supported query parameters are defined in the backend source code.

| Method | Endpoint | Purpose / access |
|---|---|---|
| `POST` | `/api/auth/register` | Register an employee account |
| `POST` | `/api/auth/login` | Authenticate and obtain a token |
| `GET` | `/api/auth/me` | Get the authenticated user's information |
| `GET` | `/api/vouchers/stats` | Dashboard statistics for an authorized role |
| `GET` | `/api/vouchers/` | Employee's own vouchers |
| `POST` | `/api/vouchers/` | Create an employee voucher |
| `PATCH` | `/api/vouchers/:id` | Update an eligible draft voucher |
| `DELETE` | `/api/vouchers/:id` | Delete an eligible draft voucher |
| `POST` | `/api/vouchers/:id/signature` | Upload employee signature |
| `PATCH` | `/api/vouchers/:id/submit` | Submit a voucher for approval |
| `GET` | `/api/vouchers/pending` | Director's pending approval queue |
| `GET` | `/api/vouchers/all` | Director/Accounts voucher listing |
| `POST` | `/api/vouchers/:id/director-signature` | Upload director signature |
| `PATCH` | `/api/vouchers/:id/approve` | Approve a pending voucher |
| `PATCH` | `/api/vouchers/:id/reject` | Reject a pending voucher |
| `GET` | `/api/vouchers/:id/signature/:type` | Retrieve a signature subject to access checks |

The API also supports query parameters for listing and filtering. Refer to the route and controller code for the exact supported filters.

## Voucher Workflow

1. An employee creates a voucher in **Draft** status.
2. The employee fills in the expense details and uploads a signature.
3. The employee submits the voucher.
4. The voucher moves to **Pending Approval**.
5. The director reviews the voucher and provides a director signature.
6. The director approves or rejects the voucher.
7. Authorized users can view the final status and relevant approval or rejection details.

Draft editing and deletion are restricted to the owning employee and are not available after submission.

## Security Notes

- Passwords should be stored as bcrypt hashes, not plaintext.
- Protected endpoints use JWT authentication and role authorization.
- Employees should only access their own vouchers.
- Public registration must not allow users to assign themselves privileged roles.
- Signature uploads should enforce size limits and file-content validation.
- Keep `.env` files, database credentials, JWT secrets, real signatures, and other sensitive data out of Git.
- Use HTTPS and hosting-provider secrets if deploying publicly.
- Do not use real financial or personal data in a demo deployment.


## Assessment Demo Checklist

- Sign in using demo accounts prepared for the assessment.
- Demonstrate employee voucher creation, signature, and submission.
- Demonstrate director review, signature, approval, and rejection.
- Demonstrate Accounts filters, reports, and exports.
- Explain role-based access control and voucher ownership checks.
- Use dummy data and avoid displaying secrets during the demo.

## Git Hygiene

From the repository root, review changes before committing:

```powershell
git status
git diff --check
git diff
```

Check whether environment files and uploads are tracked:

```powershell
git ls-files | Select-String '(^|/)\.env($|\.)|(^|/)uploads/'
```


## Notes

This README describes the project and its intended local setup. If a command or feature differs from the current code, follow the scripts and implementation in the repository.
