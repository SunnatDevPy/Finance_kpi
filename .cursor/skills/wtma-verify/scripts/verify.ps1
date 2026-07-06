param(
    [switch]$FrontendOnly,
    [switch]$BackendOnly,
    [switch]$All
)

$ErrorActionPreference = "Continue"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "../../../..")
Set-Location $repoRoot

$failed = $false
$runFrontend = $false
$runBackend = $false

function Get-ChangedPaths {
    $paths = @()
    $diff = git diff --name-only HEAD 2>$null
    if ($diff) { $paths += $diff }
    $staged = git diff --name-only --cached 2>$null
    if ($staged) { $paths += $staged }
    $untracked = git ls-files --others --exclude-standard 2>$null
    if ($untracked) { $paths += $untracked }
    return $paths | Select-Object -Unique
}

if ($All -or ($FrontendOnly -and $BackendOnly)) {
    $runFrontend = $true
    $runBackend = $true
}
elseif ($FrontendOnly) {
    $runFrontend = $true
}
elseif ($BackendOnly) {
    $runBackend = $true
}
else {
    $changed = Get-ChangedPaths
    $runFrontend = $changed | Where-Object { $_ -match '^frontend/' }
    $runBackend = $changed | Where-Object { $_ -match '^backend/' }
    if (-not $runFrontend -and -not $runBackend) {
        $runFrontend = $true
        $runBackend = $true
    }
}

function Invoke-Step {
    param([string]$Name, [scriptblock]$Action)
    Write-Host ""
    Write-Host "=== $Name ===" -ForegroundColor Cyan
    & $Action
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
        Write-Host "FAIL: $Name (exit $LASTEXITCODE)" -ForegroundColor Red
        $script:failed = $true
    }
    else {
        Write-Host "OK: $Name" -ForegroundColor Green
    }
}

if ($runFrontend) {
    Invoke-Step "Frontend build (tsc + vite)" {
        Push-Location (Join-Path $repoRoot "frontend")
        npm run build
        Pop-Location
    }
}

if ($runBackend) {
    $backendPath = Join-Path $repoRoot "backend"
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    $apiRunning = $false
    if ($docker) {
        $ps = docker compose ps --services --filter "status=running" 2>$null
        if ($ps -match "api") { $apiRunning = $true }
    }

    if ($apiRunning) {
        Invoke-Step "Backend Python compile (docker)" {
            docker compose exec -T api python -m compileall -q app
        }
    }
    else {
        Invoke-Step "Backend Python compile (local)" {
            Push-Location $backendPath
            python -m compileall -q app
            Pop-Location
        }
    }

    $runPytest = $false
    if ($apiRunning) {
        docker compose exec -T api python -c "import pytest" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $runPytest = $true }
    }
    elseif (Test-Path (Join-Path $backendPath "requirements-dev.txt")) {
        python -c "import pytest" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $runPytest = $true }
    }

    if ($runPytest) {
        if ($apiRunning) {
            Invoke-Step "Backend pytest (docker api)" {
                docker compose exec -T api python -m pytest -q
            }
        }
        else {
            Invoke-Step "Backend pytest (local)" {
                Push-Location $backendPath
                python -m pytest -q
                Pop-Location
            }
        }
    }
    else {
        Write-Host "SKIP: pytest (dev dependencies not installed in runtime)" -ForegroundColor Yellow
    }
}

Write-Host ""
if ($failed) {
    Write-Host "VERIFY FAILED" -ForegroundColor Red
    exit 1
}

Write-Host "VERIFY PASSED" -ForegroundColor Green
exit 0
