ExpenseFlow — Expense Voucher Management System
ExpenseFlow is a role-based web application for creating, submitting, reviewing, and managing employee expense vouchers. It supports a voucher approval workflow with employee and director signatures, dashboards, reporting, and exports.
Internship assessment project. This README documents the intended setup and features; adjust any commands or features to match the final code in your repository.

Features
Employee
- Register and log in securely.
- Create expense vouchers as drafts.
- Edit or delete vouchers while they remain drafts.
- Upload an employee signature.
- Submit a completed voucher for approval.
- View personal vouchers and their current status.
Director
- View vouchers awaiting approval.
- Review voucher details and supporting signature.
- Upload a director signature.
- Approve or reject vouchers.
- Provide a rejection reason when rejecting a voucher.
Accounts
- View voucher records and dashboard statistics.
- Search and filter records by available fields.
- Review approved and rejected vouchers.
- Generate reports and export records where implemented.
General
- JWT-based authentication.
- Role-based access control.
- MongoDB persistence with Mongoose.
- Signature upload validation for supported image formats.
- PDF and CSV output where implemented.
Technology stack
- Frontend: React, Vite
- Backend: Node.js, Express
- Database: MongoDB, Mongoose
- Authentication: JSON Web Tokens (JWT), bcrypt
- File uploads: Multer with image-content validation
Confirm the dependencies and implemented features in the project before submission.
Project structure
The repository is organized into frontend and backend areas. A typical layout is:
ExpenseFlow/
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── uploads/              # Runtime uploads; do not commit files
│   ├── .env                  # Local secrets; do not commit
│   ├── package.json
│   └── server.js
└── frontend/
    ├── src/
    ├── public/
    ├── .env                  # Local frontend configuration; do not commit
    └── package.json
Your actual repository may contain additional files or use a slightly different structure.
Prerequisites
Install the following before running the project:
- Node.js and npm
- MongoDB connection (local MongoDB or MongoDB Atlas)
- Git, if cloning the repository
Configuration
Backend environment
Create backend/.env using the variable names expected by the backend:
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
Do not commit this file or share its values. Use a different, strong JWT_SECRET for each environment.
Frontend environment
Create frontend/.env:
VITE_API_URL=http://localhost:5000/api
Vite exposes variables prefixed with VITE_ to browser code. Do not put secrets in frontend environment variables.
Installation and running locally
Open two terminals from the repository root.
1. Start the backend
cd backend
npm install
npm run dev
If package.json does not define a dev script, use the script listed under scripts in that file (for example, npm start if available).
The API is expected to run at:
http://localhost:5000
A basic health endpoint is available at / if it is present in the current backend implementation.
2. Start the frontend
In a second terminal:
cd frontend
npm install
npm run dev
Vite commonly serves the frontend at:
http://localhost:5173
Open the URL printed by the Vite terminal if it differs.
Main API routes
The following routes reflect the backend route layout used during development. Protected routes require a valid bearer token. Confirm exact request bodies and response schemas in the source code.
Method	Endpoint	Purpose / access
POST	/api/auth/register	Register an employee account
POST	/api/auth/login	Authenticate and obtain a token
GET	/api/auth/me	Get the authenticated user's information
GET	/api/vouchers/stats	Dashboard statistics for an authorized role
GET	/api/vouchers/	Employee's own vouchers
POST	/api/vouchers/	Create an employee voucher
PATCH	/api/vouchers/:id	Update an eligible draft voucher
DELETE	/api/vouchers/:id	Delete an eligible draft voucher
POST	/api/vouchers/:id/signature	Upload employee signature
PATCH	/api/vouchers/:id/submit	Submit a voucher for approval
GET	/api/vouchers/pending	Director's pending approval queue
GET	/api/vouchers/all	Director/Accounts voucher listing
POST	/api/vouchers/:id/director-signature	Upload director signature
PATCH	/api/vouchers/:id/approve	Approve a pending voucher
PATCH	/api/vouchers/:id/reject	Reject a pending voucher
GET	/api/vouchers/:id/signature/:type	Retrieve a signature subject to access checks


The API also supports query parameters for listing/filtering where implemented. Refer to the route and controller code for exact supported filters.
Voucher workflow
1. An employee creates a voucher in Draft status.
2. The employee fills in the expense details and uploads a signature.
3. The employee submits the voucher.
4. The voucher moves to Pending Approval.
5. The director reviews the voucher and provides a director signature.
6. The director approves or rejects the voucher.
7. The final status and approval/rejection details are available to authorized users.
Draft editing and deletion are restricted to the owning employee and are not available after submission.
Security notes
- Passwords should be stored as bcrypt hashes, not plaintext.
- Protected API endpoints use JWT authentication and role authorization.
- Employees should only access their own vouchers.
- Public registration should not allow users to assign themselves privileged roles.
- Signature uploads should enforce size and content-type restrictions.
- Keep .env files, database credentials, JWT secrets, real signature images, and other sensitive data out of Git.
- Use HTTPS and hosting-provider secrets if deploying publicly.
This is an internship assessment project; do not use real financial or personal data in a demo deployment.
Screenshots
Add screenshots here before submission. Avoid showing real names, emails, tokens, signatures, database URLs, or other sensitive information.
Suggested screenshots:
- Login page
- Employee dashboard and voucher creation
- Voucher review / Director dashboard
- Accounts dashboard and reports
- Example PDF or CSV export using dummy data
Example Markdown:
![Login page](docs/screenshots/login.png)
Git setup and submission
From the repository root, review changes before committing:
git status
git diff --check
git diff
Check that environment files and uploaded signatures are not tracked:
git ls-files | Select-String '(^|/)\.env($|\.)|(^|/)uploads/'
If the output includes secrets or private uploads, remove them from Git tracking and rotate any exposed credentials. Do not simply paste secret contents into a commit or issue.
After reviewing the changes:
git add README.md
git commit -m "docs: add ExpenseFlow project README"
git push
If your frontend is in a separate Git repository, run the appropriate Git commands from that repository instead.
Assessment demo checklist
- Sign in with demo accounts prepared specifically for the assessment.
- Demonstrate employee voucher creation, signature, and submission.
- Demonstrate director review, signature, approval, and rejection.
- Demonstrate Accounts filters, reports, and exports.
- Explain role-based access control and ownership checks.
- Use dummy data and avoid displaying secrets during the demo.
Limitations and notes
This README is a project guide, not a guarantee that every feature is enabled in every checkout. Confirm the current source code, npm scripts, API payloads, and screenshots before submission.
