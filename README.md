# 📦 AssetFlow — Enterprise Asset & Resource Management System

AssetFlow is a production-ready, complete Enterprise Asset & Resource Management System (ERP) designed to manage physical and digital assets, user allocations, direct hand-over transfers, shared resource bookings, maintenance tickets, periodic audits, and data exporting. 

This project was built from the ground up for the **Odoo Hackathon**, prioritizing real-world enterprise constraints, strict validation rules, robust role-based access control, and a clean, minimal user experience.

🔗 **Live Demo URL**: [https://odoo-hackathon-19ej.onrender.com/login](https://odoo-hackathon-19ej.onrender.com/login)

---

## 🎨 Professional Enterprise Design System

The visual design is inspired by **Stripe, Linear, and Odoo Enterprise**, avoiding flashy neon colors and templates in favor of a trustworthy, mature workspace aesthetic:
* **Backgrounds**: Soft, neutral light-gray surfaces (`#F6F8FB`) to maximize focus and reduce eye strain.
* **Containers**: Flat, pure white card containers (`#FFFFFF`) with thin, high-contrast borders (`1px solid #E5E7EB`) and subtle, low-elevation shadows.
* **Color Accents**: Structured indigo/purple (`#6366F1`) branding color scheme with consistent status chips (Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed).
* **Typography**: Professional typography scale utilizing the **Inter** font family with strong heading weights and readable secondary copy.

---

## ⚙️ Core Architecture & Tech Stack

* **Frontend & Backend Framework**: **Next.js 16 (App Router)** utilizing TypeScript and Server Actions for type-safe rendering.
* **Database & ORM**: **SQLite Database** managed via **Prisma ORM** for zero-setup, fully relational database modeling.
* **Authentication**: Cookie-based custom **JWT Sessions** generated using **jose** with client-side Next.js route protection middleware.
* **Data Visualization**: **Recharts** rendering dynamic status distributions (Pie charts) and departmental allocations (Bar charts).
* **Document Exports**: Client-side **SheetJS (xlsx)** for Excel workbooks and **jsPDF** for structured PDF document generation.

---

## 🔑 Role-Based Access Control (RBAC) & Demo Credentials

AssetFlow implements strict role-based access restrictions. Signups default to `Employee` only. Role promotion can only be performed by an Admin.

| Role | Demo Username | Password | Key Permissions |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@assetflow.com` | `password123` | Organize Departments/Categories, Promote Staff Roles, Launch Audit Cycles |
| **Asset Manager** | `manager@assetflow.com` | `password123` | Register Assets, Allocate inventory, Assign repair technicians, Approve transfers |
| **IT Dept Head** | `ithead@assetflow.com` | `password123` | View department assets, approve internal employee transfers, book shared rooms/cars |
| **Employee** | `rahul@assetflow.com` | `password123` | View own allocated items, submit repair tickets, request transfers, book resources |

---

## 🚀 Fully Implemented Modules

1. **Dashboard & KPIs**: Real-time KPI counters (available, allocated, overdue, maintenance), recent activity feed, and warning banners for overdue return dates.
2. **Organization Setup**:
   * **Departments**: Supports multi-level parent-child hierarchy (e.g. *IT-DEV* under *IT*) with assigned heads.
   * **Asset Categories**: Configures dynamic custom fields JSON schema (e.g. adding `Warranty` or `RAM` fields to a category).
   * **Staff Directory**: Master ledger to view roles and promote employees.
3. **Asset Directory**: Paginated search ledger with category filters. Registration forms render dynamic input fields based on the selected category's JSON schema and generate automatic tags (`AF-0001`, `AF-0002`).
4. **Allocations & Returns**: Prevents double allocations by showing current owners, handles expected return dates, and logs return check-in conditions.
5. **Transfers Workflow**: Direct hand-over requests between staff, requiring manager approval before transfer of custody is updated in the database.
6. **Resource Bookings**: Calendar scheduling for shared rooms/cars with strict overlap validation (rejects conflicting timing blocks, allows edge-touching slots).
7. **Maintenance Kanban**: 5-lane ticket pipeline (*Pending, Approved, In Progress, Resolved, Rejected*). Approving a ticket locks the asset status to `Under Maintenance`, while resolving it brings it back to `Available`.
8. **Audit Verification**: Auditor checklist inputs (*Verified, Missing, Damaged*). Closing an audit cycle locks logs and automatically updates missing items to `LOST`.
9. **Reports & Exports**: Utilizations, peak hour bookings, nearing retirement lists, and Excel (SheetJS) / PDF (jsPDF) exports.
10. **Activity Log Audits**: Tracks database transactions, featuring an expandable **JSON Delta Diff** comparison showing record properties before and after modification.

---

## 💻 Local Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Krishna-8218/Odoo_Hackathon.git
   cd Odoo_Hackathon
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Initialize Database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. **Seed Mock Data** *(creates default users, assets, and logs)*:
   ```bash
   node prisma/seed.js
   ```
5. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your web browser.
