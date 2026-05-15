# Aan de slag als nieuwe developer

Welkom bij **MijnDeRobben**. Dit document beschrijft wat je nodig hebt om lokaal te kunnen ontwikkelen.

---

## Vereisten

- [Node.js 22](https://nodejs.org/)
- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (voor SQL Server)
- Windows Terminal (aanbevolen)

---

## 1. Repository klonen

```powershell
git clone https://github.com/Scuba-WeirdScience/MijnDeRobben.git
cd MijnDeRobben
```

---

## 2. Afhankelijkheden installeren

```powershell
# Frontend
cd frontend && npm install && cd ..

# Cloud Functions
cd functions && npm install && cd ..
```

---

## 3. Firebase inloggen & project instellen

```powershell
firebase login
firebase use production   # of: firebase use staging
```

---

## 4. Lokale omgevingsvariabelen instellen

### Functions

Kopieer het voorbeeldbestand:

```powershell
Copy-Item functions/.env.local.example functions/.env.local
```

Open `functions/.env.local` en vul de waarden in:

| Variabele | Waar te vinden |
|-----------|----------------|
| `FIREBASE_WEB_API_KEY` | [Firebase Console → Projectinstellingen → Algemeen](https://console.firebase.google.com/project/dcderobben-d3536/settings/general) |

### Scripts (optioneel — alleen voor staging/migratie)

| Variabele | Omschrijving |
|-----------|--------------|
| `FIREBASE_ADC_PATH` | Pad naar je Firebase ADC-bestand (na `firebase login`). Alleen nodig als je `seed-staging.ts` of `import-auth-with-hashes.ts` uitvoert. Standaard wordt de ADC van `gcloud auth application-default login` gebruikt. |
| `SERVICE_ACCOUNT_PATH` | Pad naar een service account JSON (productie). Vraag dit op bij de projectbeheerder. Sla het op buiten de repo — **nooit committen**. |
| `SA_PASSWORD` | Wachtwoord van het SQL Server `sa`-account. Alleen nodig voor de eenmalige migratie. |

---

## 5. Firebase emulators starten

```powershell
firebase emulators:start
```

Seeden met testgebruikers (na het starten van de emulators):

```powershell
npx ts-node --esm scripts/seed-emulator.ts
```

Standaard testgebruiker: `admin@example.com` / `Admin@12345` (alle rollen).

---

## 6. Ontwikkelserver starten

```powershell
# Frontend tegen lokale emulators
Start-Process pwsh -ArgumentList '-NoExit', '-Command', 'Set-Location ''C:\Projects\DeRobben\frontend''; npx ng serve'

# Of tegen de staging Firebase backend (HMR ingeschakeld)
Start-Process pwsh -ArgumentList '-NoExit', '-Command', 'Set-Location ''C:\Projects\DeRobben\frontend''; npx ng serve --configuration=staging-local'
```

Frontendserver draait op `http://localhost:4300`.

---

## 7. Backend starten (optioneel)

```powershell
# API Gateway
Start-Process pwsh -ArgumentList '-NoExit', '-Command', 'Set-Location ''C:\Projects\DeRobben\api-gateway''; dotnet run'

# Member API
Start-Process pwsh -ArgumentList '-NoExit', '-Command', 'Set-Location ''C:\Projects\DeRobben\member-api''; dotnet run'
```

---

## 8. Build verifiëren

```powershell
cd frontend && npx ng build
```

Er zijn geen aparte lint- of testcommando's — een succesvolle build is de kwaliteitscheck.

---

## Bestanden die je NOOIT committen

| Bestand | Omschrijving |
|---------|--------------|
| `service-account.json` | Firebase Admin SDK service account (productie) |
| `staging-sa.json` | Firebase Admin SDK service account (staging) |
| `functions/.env.local` | Lokale omgevingsvariabelen met API keys |
| `**/appsettings.Development.json` | .NET lokale configuratie |

Deze bestanden staan in `.gitignore`. Als je ze per ongeluk toch toevoegt, verwijder ze dan onmiddellijk en overleg met de projectbeheerder.

---

## Projectstructuur

```
api-gateway/    ASP.NET Core 9 + YARP + JWT + ASP.NET Identity  →  :5238
member-api/     ASP.NET Core 9 + EF Core + SQL Server           →  :5107
frontend/       Angular 21 SPA (standalone, signals)            →  :4300
functions/      Firebase Cloud Functions (Node.js 22)
migrations/     Handgeschreven SQL-scripts
scripts/        Eenmalige migratie- en seedscripts
```

Zie ook `AGENTS.md` voor uitgebreide conventies en dev-commando's.
