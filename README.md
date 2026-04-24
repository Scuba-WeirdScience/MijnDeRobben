# De Robben — Scuba Club Membership Management System

A full-stack membership management system for the De Robben scuba diving club.

## Architecture

```
frontend/       Angular 20 SPA (port 4200)
api-gateway/    ASP.NET Core 9 + YARP + JWT + ASP.NET Identity (port 5000)
member-api/     ASP.NET Core 9 Web API + EF Core + SQL Server (port 5001)
```

### Auth Flow
- All auth (login, token refresh) goes through the **gateway** at `:5000`
- The gateway proxies `/api/members/**` to the **member-api** at `:5001`
- The gateway injects `X-Gateway-Secret` + `X-User-*` headers so the member-api can trust requests without re-validating JWTs

### Roles
`Beheer` | `Lid` | `Bestuur` | `MateriaalCommissie` | `InstructieKader`

---

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9)
- [Node.js 20+](https://nodejs.org/) + Angular CLI 20 (`npm install -g @angular/cli`)
- SQL Server (2019+) running on `localhost` with Windows Authentication

---

## Running the stack

Open **three terminals** and run one command in each:

### Terminal 1 — Member API
```powershell
cd member-api
dotnet run
# Starts on http://localhost:5107
# Auto-creates ScubaMemberDb, runs migrations, seeds sample members
```

### Terminal 2 — API Gateway
```powershell
cd api-gateway
dotnet run
# Starts on http://localhost:5238
# Auto-creates ScubaGatewayDb, runs migrations, seeds roles + admin user
```

### Terminal 3 — Frontend
```powershell
cd frontend
npm install      # first time only
ng serve
# Starts on http://localhost:4200
```

Then open **http://localhost:4200** in your browser.

---

## Default credentials

| Email | Password | Role |
|---|---|---|
| `admin@scubaclub.be` | `Admin@12345` | Beheer |

---

## API Documentation (Swagger)

- Member API: http://localhost:5107/swagger
- API Gateway: http://localhost:5238/swagger

---

## Project Structure

```
member-api/
  Controllers/         MembersController
  Data/                MemberDbContext, migrations, seeder
  DTOs/                MemberDto, CreateMemberDto, UpdateMemberDto, PagedResult<T>
  Middleware/          TrustedGatewayMiddleware, GatewayHeaderAuthHandler
  Models/              Member
  Services/            MemberService

api-gateway/
  Controllers/         AuthController, RolesController
  Configuration/       JwtOptions
  Data/                GatewayDbContext (ASP.NET Identity), migrations
  DTOs/                AuthDtos (LoginRequest, RegisterRequest, TokenResponse…)
  Middleware/          GatewaySecretInjectionMiddleware
  Models/              ApplicationUser
  Services/            JwtService, UserService

frontend/
  src/app/
    core/              AuthService, ThemeService, guards, interceptors, models
    features/          auth, members, admin (lazy-loaded)
    shared/            NavbarComponent, SpinnerComponent, ToastComponent,
                       HasRoleDirective, FullNamePipe, MemberStatusPipe
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 20, Tailwind CSS v3, standalone components |
| Gateway | ASP.NET Core 9, YARP 2.3.0, ASP.NET Identity 9, JWT |
| Member API | ASP.NET Core 9, EF Core 9, SQL Server |
| Database | SQL Server 2019 (Windows Auth) |
