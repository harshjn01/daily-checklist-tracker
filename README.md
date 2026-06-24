# Daily Checklist Tracker

A production-ready, full-stack checklist compliance monitoring application. It allows administrators to create daily checklists, assign tasks globally or to specific employees, monitor completion metrics, export compliance summaries, and automatically triggers alerts for incomplete checklists via daily cron jobs.

## Tech Stack & Architecture

- **Frontend**: Next.js 16 (App Router, TypeScript, Tailwind CSS v4, Lucide React, Recharts)
- **Backend**: NestJS (TypeScript, Jwt Authentication, Passport Strategy, class-validator, Throttler, NestJS Schedule)
- **Database**: PostgreSQL with Prisma ORM
- **Automation**: NestJS background schedule cron jobs
- **Containerization**: Docker, Docker Compose

---

## Getting Started (Docker Compose - Recommended)

The easiest way to run the entire stack (PostgreSQL, Backend API, and Next.js Frontend) is using Docker Compose.

### 1. Start Services
From the root directory, run:
```bash
docker-compose up --build
```
This spins up:
- PostgreSQL at `localhost:5432`
- NestJS Backend at `http://localhost:3001`
- Next.js Frontend at `http://localhost:3000`

### 2. Run Database Migrations & Seeding
Once the containers are running, generate the database tables and seed the initial Admin account by running:
```bash
# Run migrations
docker-compose exec backend npx prisma migrate dev --name init

# Seed the administrator account
docker-compose exec backend npm run prisma:seed
```

---

## Local Development Setup (Without Docker)

### Prerequisites
- Node.js (v18+)
- PostgreSQL database instance running locally

### 1. Database Setup
Create a PostgreSQL database named `checklist_db`.

### 2. Backend Installation
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables. Copy `.env.example` to `.env` and modify the values (especially `DATABASE_URL`):
   ```bash
   cp .env.example .env
   ```
4. Run migrations and seed:
   ```bash
   npx prisma migrate dev --name init
   npm run prisma:seed
   ```
5. Start development API server:
   ```bash
   npm run start:dev
   ```
   The backend will be running at `http://localhost:3001/api`.

### 3. Frontend Installation
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Start development web server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

## Seeding & Authentication Details

Seeding creates a default system administrator account you can use to sign in:

- **Email**: `admin@checklist.com`
- **Password**: `adminpassword123`

---

## Core Features Walkthrough

### 1. Administrator Capabilities
- **Invite Employees**: Go to the **Users** directory, enter their name and email, and send a secure invitation token (token expires in 24 hours).
- **Bulk CSV Import**: Import hundreds of users at once using a CSV. The CSV should contain columns `name` and `email` (e.g. [template](backend/uploads/sample.csv) fallback).
- **Checklist Manager**: Add daily duties, mark them as **Active/Inactive**, or toggled between **Required** or **Optional**.
- **Task Assignments**: Click the user check button on a task template to assign it globally (to all employees) or restrict it to a specific subset of employees.
- **Reporting & Compliance**: Toggle between Daily table compliance percentages, Weekly detail sheets, and Monthly performance leaderboards.
- **Data Export**: Export daily, weekly, or monthly tables directly to **Microsoft Excel (.xlsx)** or standard **CSV** format.
- **Security Logs**: Audit logs record login attempts, CSV imports, checklist creations, and deleted accounts with IPs and timestamps.

### 2. Employee Capabilities
- **Daily Checklist**: Interactive check-offs. Items can be checked or unchecked as many times as needed before 7 PM.
- **Streak Tracker**: Tracks consecutive days with 100% compliance.
- **History Viewer**: Browsable log of checklist performance for the last 10 calendar days with lazy-loaded task compliance details.
- **Profile Updates**: Change your display name, upload profile photos (static local server storage), and change account passwords.

### 3. Background Cron Alerts
- **Daily Run at 7 PM** (`0 19 * * *`):
  - Scans for any active employee who has incomplete checklist items.
  - Generates in-app warnings and sends reminder emails to users.
  - Compiles an summary and emails it to all system Administrators.
