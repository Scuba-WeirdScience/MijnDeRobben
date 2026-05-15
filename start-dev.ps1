# start-dev.ps1
# Starts the DeRobben development environment in Windows Terminal tabs.
#
# Parameters:
#   -WithOpenCode   Open an OpenCode tab (default: false)
#
# Services:
#   - Firebase Emulators  -> http://localhost:4000  (Emulator UI)
#                           Auth      :9099
#                           Functions :5001
#                           Firestore :8080
#                           Storage   :9199
#                           Hosting   :5000
#   - Frontend (ng serve) -> http://localhost:4300
param(
    [switch]$WithOpenCode = $false
)

$root = $PSScriptRoot
Write-Host "Starting DeRobben development environment..." -ForegroundColor Cyan

# wt.exe uses ';' as its own tab/pane separator, so a bare semicolon inside a
# --Command value breaks argument parsing. Work around this by base64-encoding
# multi-statement commands.

# Build functions first, then start all emulators in the same tab so the
# emulator always starts with a freshly compiled lib/.
# After the emulator starts, wait 40 s for it to be ready, then seed.
$emuCmd = "Set-Location '$root\functions'; pnpm install; pnpm run build; Set-Location '$root'; firebase emulators:start --project demo-derobben --import=./emulator-data --export-on-exit=./emulator-data"
$emuB64 = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($emuCmd))

$seedCmd = "Start-Sleep 40; Write-Host '[Seed] Starting emulator seed...' -ForegroundColor Cyan; npx ts-node --esm '$root\scripts\seed-emulator.ts'; Write-Host '[Seed] Done.' -ForegroundColor Green"
$seedB64 = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($seedCmd))

$openCodeTab = "new-tab --title `"OpenCode`" --startingDirectory `"$root`" -- powershell -NoExit -Command `"opencode`" ; "
$wtArgs = $(if ($WithOpenCode) { $openCodeTab } else { "" }) +
          "new-tab --title `"Firebase + Functions`" --startingDirectory `"$root`" -- powershell -NoExit -EncodedCommand $emuB64 ; " +
          "new-tab --title `"Seed`" --startingDirectory `"$root`" -- powershell -NoExit -EncodedCommand $seedB64 ; " +
          "new-tab --title `"Frontend :4300`" --startingDirectory `"$root\frontend`" -- powershell -NoExit -Command `"ng serve`""

Start-Process wt.exe -ArgumentList $wtArgs

Write-Host "  Seed tab scheduled (runs in ~40 s)." -ForegroundColor DarkCyan

Write-Host "All services launched in Windows Terminal." -ForegroundColor Green
Write-Host ""
Write-Host "  Emulator UI  -> http://localhost:4000" -ForegroundColor Yellow
Write-Host "  Auth         -> http://localhost:9099" -ForegroundColor Yellow
Write-Host "  Functions    -> http://localhost:5001" -ForegroundColor Yellow
Write-Host "  Firestore    -> http://localhost:8080" -ForegroundColor Yellow
Write-Host "  Storage      -> http://localhost:9199" -ForegroundColor Yellow
Write-Host "  Frontend     -> http://localhost:4300" -ForegroundColor Yellow
