# 📦 AssetFlow — Enterprise Asset & Resource Management System

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-316192?style=for-the-badge&logo=postgresql)](https://supabase.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-6.19-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Tailwind / Utility CSS](https://img.shields.io/badge/Design_System-Linear_%2F_Stripe-6366F1?style=for-the-badge)](https://assetflow.com)

**AssetFlow** is a production-ready, full-stack Enterprise Resource Planning (ERP) monolith designed to manage the end-to-end lifecycle of physical and digital assets, user allocations, direct peer-to-peer transfers, shared resource bookings, multi-stage maintenance pipelines, periodic physical inventory audits, and exportable analytics.

🔗 **Live Demo**: [https://odoo-hackathon-19ej.onrender.com/login](https://odoo-hackathon-19ej.onrender.com/login)

---

## 📑 Table of Contents
- [Key Features & Highlights](#-key-features--highlights)
- [10 Core Operational Modules](#-10-core-operational-modules)
- [Relational Database Architecture (13 Tables)](#-relational-database-architecture-13-tables)
- [Tech Stack](#-tech-stack)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Local Installation & Quickstart](#-local-installation--quickstart)
- [Project Directory Structure](#-project-directory-structure)

---

## 🌟 Key Features & Highlights

### 🛡️ Conflict-Detection Allocation & Booking Engines
* **Double-Assignment Prevention**: Asset check-out logic strictly verifies real-time status. Busy, reserved, or maintenance-locked assets cannot be assigned until returned or approved via transfer.
* **Smart Time-Slot Overlap Detection**: Shared vehicles, meeting rooms, and specialized hardware leverage a mathematical interval engine (`startTime < existing.end AND endTime > existing.start`). It automatically flags collisions and rejects overlapping schedules while seamlessly permitting back-to-back reservations.
* **Custody Transfer Approval Workflows**: Staff can initiate peer-to-peer equipment handovers. Transfers require multi-tier authorization (Admin, Asset Manager, or Department Head) before custody and department records automatically update in the database.

### 🧩 Dynamic JSON-Schema Attribute Builder
* **Custom Field Schemas**: Administrators can define flexible custom schema attributes (`Text`, `Number`, `Checkbox`) per asset category without requiring database migrations.
* **Dynamic Form Rendering**: The asset registration interface dynamically detects category schemas and renders corresponding typed input fields, serializing data cleanly for query retrieval.

### 🛠️ 5-Stage Kanban Maintenance Pipeline
* **Visual Repair Workflow**: Interactive 5-column Kanban pipeline (*Pending Approval*, *Approved*, *In Repair*, *Resolved*, *Rejected*).
* **Automated Status Locking**: Approving a ticket locks the asset status to `UNDER_MAINTENANCE`. Upon ticket resolution, repair costs are recorded and the asset status is automatically restored to `AVAILABLE`.
* **Technician Assignment**: Dispatch internal or external technicians with full repair logs.

### 📊 Interactive Recharts & One-Click Reporting
* **Interactive Visualizations**: Real-time KPI summary widgets, asset status distribution pie charts, departmental allocation bar charts, and utilization trends powered by **Recharts**.
* **One-Click Excel Reports (SheetJS)**: Multi-tab `.xlsx` workbooks detailing inventory summary, departmental assignments, repair frequencies, and overdue returns.
* **Structured PDF Export (jsPDF + AutoTable)**: Generates executive-ready formatted audit and inventory reports.

### 🔍 Automated QR Code Tracking & Audit Verification
* **Automated Tag & QR Generation**: Automatically increments enterprise tags (`AF-0001`, `AF-0002`) and embeds machine-readable metadata (`AssetFlow:{Tag}:{SerialNumber}`) rendered via SVG QR codes for physical labeling.
* **Audit Cycles & Discrepancy Reconciliation**: Launch scoped inventory audits (by Department, Location, or Category). Auditors mark items as *Verified*, *Missing*, or *Damaged*. Closing an audit cycle freezes logs and automatically reconciles missing items to `LOST`.
* **Complete Activity Trail with JSON Delta Diffs**: Every mutation is logged with timestamps, user identity, action description, and expandable JSON comparison blocks showing entity state before and after modification.

---

## 🚀 10 Core Operational Modules

| # | Operational Module | Primary Capabilities |
|---|---|---|
| **1** | **Executive Dashboard & KPIs** | Real-time counts, status charts, overdue warnings, and activity stream. |
| **2** | **Organization Setup** | Multi-level parent-child department hierarchy, category schema builder, staff master. |
| **3** | **Asset Directory & Registration** | Searchable asset ledger, dynamic attribute forms, automated QR code generator. |
| **4** | **Allocations & Returns** | Double-assignment prevention, return date tracking, check-in condition logging. |
| **5** | **Custody Transfers** | Direct peer-to-peer asset transfer requests with mandatory managerial approval. |
| **6** | **Resource Scheduling** | Shared facility/equipment booking with strict edge-touching slot overlap validation. |
| **7** | **Maintenance Kanban** | 5-stage ticket pipeline with technician assignment and automated status locking. |
| **8** | **Audit & Physical Verification** | Scheduled audit cycles, item check-off checklists, automatic lost asset reconciliation. |
| **9** | **Reports & Analytics** | Real-time visual metrics with one-click multi-sheet Excel and formatted PDF exports. |
| **10** | **Activity Logs & Audit Trail** | Immutable database transaction log featuring expandable before/after JSON Delta Diffs. |

---

## 🗄️ Relational Database Architecture (13 Tables)

AssetFlow is powered by **13 interconnected relational tables** managed through **Prisma ORM** on **PostgreSQL (Supabase)**:

```mermaid
erDiagram
    User ||--o{ Department : "heads"
    User }|--|| Department : "belongs to"
    User ||--o{ Asset : "registers / holds"
    User ||--o{ Allocation : "assigned / created"
    User ||--o{ Transfer : "from / to / approved"
    User ||--o{ Booking : "reserves"
    User ||--o{ MaintenanceRequest : "requests / tech / approves"
    User ||--o{ AuditAssignment : "audits"
    User ||--o{ Notification : "receives"
    User ||--o{ ActivityLog : "performs"

    Department ||--o{ Department : "parent / children"
    Department ||--o{ Asset : "owns"
    Department ||--o{ Allocation : "assigned to"
    Department ||--o{ Transfer : "from / to dept"
    Department ||--o{ AuditCycle : "scoped to"

    AssetCategory ||--o{ Asset : "categorizes"
    AssetCategory ||--o{ AuditCycle : "scoped to"

    Asset ||--o{ Allocation : "allocated in"
    Asset ||--o{ Transfer : "transferred in"
    Asset ||--o{ Booking : "booked in"
    Asset ||--o{ MaintenanceRequest : "repaired in"
    Asset ||--o{ AuditItem : "audited in"

    AuditCycle ||--o{ AuditAssignment : "assigns"
    AuditCycle ||--o{ AuditItem : "verifies"
```

### Relational Schema Summary:
1. `User`: Enterprise staff, roles (`ADMIN`, `ASSET_MANAGER`, `DEPARTMENT_HEAD`, `EMPLOYEE`), departments, credentials.
2. `Department`: Tree-structured hierarchy (e.g. `IT` → `IT-DEV`) with department heads.
3. `AssetCategory`: Classification master storing dynamic JSON custom-field schemas.
4. `Asset`: Physical/digital inventory, unique tags (`AF-XXXX`), serial numbers, status, costs, QR codes.
5. `Allocation`: Custody ledger preventing double assignments with check-out & expected return dates.
6. `Transfer`: Handover ledger enforcing approval states (`REQUESTED` → `APPROVED` → `TRANSFERRED`).
7. `Booking`: Time-slot scheduling for shared assets with overlap conflict detection.
8. `MaintenanceRequest`: Repair lifecycle records spanning 5 Kanban stages and technician assignments.
9. `AuditCycle`: Periodic compliance cycles scoped by department, category, or location.
10. `AuditAssignment`: Links assigned internal auditors to active audit cycles.
11. `AuditItem`: Line-item verification checklists (*Verified*, *Missing*, *Damaged*).
12. `Notification`: In-app event alerts (approvals, assignments, overdue alerts, booking reminders).
13. `ActivityLog`: Enterprise audit ledger tracking before-and-after JSON state snapshots.

---

## 🛠️ Tech Stack

* **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Route Handlers)
* **Language**: [TypeScript 5](https://www.typescriptlang.org/) (Strict mode, end-to-end type safety)
* **Database & ORM**: [PostgreSQL (Supabase)](https://supabase.com/) managed with [Prisma ORM 6](https://www.prisma.io/)
* **Authentication**: Cookie-based JWT Session management using [jose](https://github.com/panva/jose) & [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
* **Design System**: Handcrafted Stripe / Linear / Odoo inspired Enterprise UI with custom CSS variables and utility classes
* **Data Visualization**: [Recharts](https://recharts.org/) (Responsive Pie, Bar, Area charts)
* **Document Generation**: [SheetJS (xlsx)](https://sheetjs.com/) for multi-sheet Excel & [jsPDF](https://github.com/parallax/jsPDF) with `jspdf-autotable` for PDF exports
* **QR Generation**: [qrcode.react](https://github.com/zpao/qrcode.react) (SVG QR tags)
* **Icons**: [Lucide React](https://lucide.dev/)

---

## 🔐 Role-Based Access Control (RBAC)

Signups default to `EMPLOYEE` permissions. Elevated permissions are managed by System Administrators.

| Role | Demo Email | Password | Permissions & Scope |
|---|---|---|---|
| **System Admin** | `admin@assetflow.com` | `password123` | Full system access: configure departments & category schemas, promote roles, launch audit cycles. |
| **Asset Manager** | `manager@assetflow.com` | `password123` | Register assets, issue allocations, approve equipment transfers, dispatch maintenance technicians. |
| **IT Dept Head** | `ithead@assetflow.com` | `password123` | Department asset oversight, approve intra-department transfers, schedule shared vehicles/rooms. |
| **Employee** | `rahul@assetflow.com` | `password123` | View assigned items, raise repair tickets, request peer transfers, reserve shared resources. |

---

## 💻 Local Installation & Quickstart

### Prerequisites
* **Node.js**: v18.18+ or v20+
* **npm** or **pnpm**
* A **PostgreSQL database** (e.g. Supabase, Neon, or local Postgres)

### Step 1: Clone the Repository
```bash
git clone https://github.com/Krishna-8218/AssetFlow.git
cd AssetFlow
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your PostgreSQL database credentials:
```env
# Supabase PostgreSQL connection
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Supabase API (Optional client features)
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-publishable-anon-key"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key"
```

### Step 4: Push Database Schema & Seed Data
```bash
# Push the 13 relational tables to PostgreSQL
npx prisma db push

# Seed default departments, categories, assets, and demo users
node prisma/seed.js
```

### Step 5: Start the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser and sign in using any of the demo accounts listed above.

---

## 📁 Project Directory Structure

```text
AssetFlow/
├── prisma/
│   ├── schema.prisma         # 13 relational PostgreSQL models & relations
│   └── seed.js               # Enterprise database seeder with realistic demo data
├── public/                   # Static assets & icons
├── src/
│   ├── app/
│   │   ├── (dashboard)/      # Protected ERP operational dashboard pages
│   │   │   ├── layout.tsx    # Responsive navigation, role checks & session state
│   │   │   ├── dashboard/    # Executive KPI cards & Recharts distributions
│   │   │   ├── organization/ # Hierarchy, Category JSON Builder, RBAC directory
│   │   │   ├── assets/       # Inventory search, dynamic registration, QR view
│   │   │   ├── allocation/   # Active allocations & double-assignment prevention
│   │   │   ├── booking/      # Shared asset reservation with overlap validation
│   │   │   ├── maintenance/  # 5-stage Kanban repair pipeline & tech assignment
│   │   │   ├── audit/        # Audit cycle management & physical checklist
│   │   │   ├── reports/      # Excel (SheetJS) & PDF (jsPDF) export engine
│   │   │   ├── activity/     # Audit ledger with before/after JSON Delta Diffs
│   │   │   └── notifications/# User alert stream
│   │   ├── api/              # Secure Next.js App Router API Route Handlers
│   │   ├── login/            # Enterprise authentication view
│   │   ├── signup/           # Self-service employee signup view
│   │   └── globals.css       # Enterprise Design System stylesheet (Stripe/Linear)
│   ├── lib/
│   │   ├── auth.ts           # JWT session signing & cookie verification (jose)
│   │   ├── constants.ts      # Roles, statuses, nav items, and color scales
│   │   ├── prisma.ts         # Singleton PrismaClient connection
│   │   ├── activity-log.ts   # Database transaction auditor
│   │   ├── notifications.ts  # Notification dispatch helper
│   │   └── supabase.ts       # Supabase client helper
│   └── middleware.ts         # Next.js edge route protection & RBAC guard
├── .env.example              # Environment variables template
├── package.json              # Project dependencies & scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Complete documentation
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
