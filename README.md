# De Robben — Scuba Club Membership Management System

[![Latest Release](https://img.shields.io/github/v/release/Scuba-WeirdScience/MijnDeRobben?label=release&color=blue)](https://github.com/Scuba-WeirdScience/MijnDeRobben/releases/latest)
[![Deploy to Firebase](https://github.com/Scuba-WeirdScience/MijnDeRobben/actions/workflows/deploy.yml/badge.svg)](https://github.com/Scuba-WeirdScience/MijnDeRobben/actions/workflows/deploy.yml)
[![Build check](https://github.com/Scuba-WeirdScience/MijnDeRobben/actions/workflows/build-check.yml/badge.svg)](https://github.com/Scuba-WeirdScience/MijnDeRobben/actions/workflows/build-check.yml)

A full-stack membership management system for the De Robben scuba diving club, built on Firebase + Angular.

## Architecture

```
frontend/       Angular 21 SPA (standalone, signals) → :4300
functions/      Firebase Cloud Functions (TypeScript) + Firestore
```

### Auth Flow
- Firebase Authentication (email/password) — no custom gateway or JWT
- Cloud Functions validate auth via `requireAuth` / `requireRole` guards
- The Angular frontend uses `@angular/fire` for auth state + callable functions

### Roles
`Beheer` | `Lid` | `Bestuur` | `MateriaalCommissie` | `InstructieKader`

---

## Prerequisites

- [Node.js 20+](https://nodejs.org/) + Angular CLI 21 (`npm install -g @angular/cli`)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- Java 17+ (required by Firestore emulator)

---

## Running the stack

Open a terminal and run:

### Terminal 1 — Firebase Emulators + Functions
```powershell
cd functions
npm install
npm run build
cd ..
firebase emulators:start --project demo-derobben --import=./emulator-data
# Emulator UI :4000 | Functions :5001 | Firestore :8080 | Auth :9099 | Storage :9199
```

### Terminal 2 — Frontend
```powershell
cd frontend
npm install      # first time only
ng serve
# Starts on http://localhost:4300
```

### Terminal 3 — Seed (after emulators are ready, ~40s)
```powershell
npx ts-node --esm scripts/seed-emulator.ts
```

Or use the all-in-one script:
```powershell
.\start-dev.ps1      # launches Firebase + Frontend + Seed in Windows Terminal tabs
```

Then open **http://localhost:4300** in your browser.

---

## Project Structure

```
functions/src/
  index.ts                 Function exports
  shared/                  types.ts, auth-guards.ts
  auth/                    Auth triggers (onUserCreated)
  members/                 Member CRUD functions
  activiteiten/            Activity + occurrence + registration functions
  berichten/               Threaded messaging functions
  brevetten/               Brevet + member-organisatie functions
  leningen/                Material loan functions
  rollen/                  Role management functions

frontend/src/app/
  core/                    AuthService, firebase config, callable.ts, guards
  features/
    activiteiten/          Activity calendar, detail, admin
    admin/                 Member, role, brevet, materiaal management
    auth/                  Login page
    berichten/             Threaded messaging (groepen, threads, messages)
    leden/                 Member list + profile
    lening/                Material loan overview
    profile/               User profile + brevetten
  shared/                  Navbar, design system components, pipes, form schemas

migrations/                Hand-written SQL scripts (legacy — no longer applied)
scripts/                   seed-emulator.ts, fix-duplicate-groepen.ts
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21.2.7, Tailwind CSS v4, Firebase SDK, Quill editor |
| Backend | Firebase Cloud Functions (Node.js + TypeScript) |
| Database | Firestore (NoSQL) |
| Auth | Firebase Authentication (email/password) + custom claims for roles |

## Default credentials

The seed script creates these test accounts (emulator only):

| Email | Password | Role |
|---|---|---|
| `admin@scubaclub.be` | `Admin@12345` | Beheer |
| `lid@scubaclub.be` | `Lid@12345` | Lid |
