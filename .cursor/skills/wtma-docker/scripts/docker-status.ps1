param(
  [switch]$Prod,
  [string]$EnvFile = "",
  [switch]$Quiet,
  [switch]$Watch,
  [int]$Interval = 5
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
Set-Location $Root

$Mode = if ($Prod) { "production" } else { "development" }

function Invoke-Compose {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  if ($Prod -or $EnvFile) {
    $base = @("compose")
    if ($Prod) { $base += @("-f", "docker-compose.prod.yml") }
    if ($EnvFile) { $base += @("--env-file", $EnvFile) }
    & docker @base @Args
  } else {
    & docker compose @Args
  }
}

function Test-HttpOk {
  param([string]$Url)
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 8
    return $response.StatusCode -in 200, 204, 301, 302, 307, 308
  } catch {
    return $false
  }
}

function Show-Status {
  $issues = @()

  try {
    docker info | Out-Null
  } catch {
    Write-Error "Docker daemon ishlamayapti"
    exit 2
  }

  if (-not $Quiet) {
    Write-Host ""
    Write-Host "=== WTMA Docker status ($Mode) ==="
    Write-Host "Project: $Root"
    Write-Host "Time:    $((Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss')) UTC"
    Write-Host ""
    Write-Host "--- docker compose ps ---"
  }

  Invoke-Compose @("ps")

  $services = @(Invoke-Compose @("ps", "--services") | Where-Object { $_ })
  if ($services.Count -eq 0) {
    $issues += "Hech qanday compose servisi topilmadi"
  }

  if (-not $Quiet) {
    Write-Host ""
    Write-Host "--- service checks ---"
  }

  foreach ($service in $services) {
    $running = Invoke-Compose @("ps", "--status", "running", "--services") | Where-Object { $_ -eq $service }
    if (-not $running) {
      if (-not $Quiet) { Write-Host "  [FAIL] $service — ishlamayapti" }
      $issues += "$service ishlamayapti"
      continue
    }
    if (-not $Quiet) { Write-Host "  [ OK ] $service — running" }
  }

  if (-not $Quiet) {
    Write-Host ""
    Write-Host "--- HTTP probes ---"
  }

  if ($Prod) {
    $httpPort = 80
    if ($EnvFile -and (Test-Path $EnvFile)) {
      Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*HTTP_PORT\s*=\s*(.+)\s*$') { $httpPort = $Matches[1].Trim() }
      }
    }
    $apiUrl = "http://127.0.0.1:$httpPort/api/v1/health"
    if (Test-HttpOk $apiUrl) {
      if (-not $Quiet) { Write-Host "  [ OK ] API $apiUrl" }
    } else {
      if (-not $Quiet) { Write-Host "  [FAIL] API $apiUrl" }
      $issues += "API health probe"
    }
  } else {
    if (Test-HttpOk "http://127.0.0.1:8002/api/v1/health") {
      if (-not $Quiet) { Write-Host "  [ OK ] API http://127.0.0.1:8002/api/v1/health" }
    } else {
      if (-not $Quiet) { Write-Host "  [FAIL] API http://127.0.0.1:8002/api/v1/health" }
      $issues += "API :8002"
    }
    if (Test-HttpOk "http://127.0.0.1:5173/") {
      if (-not $Quiet) { Write-Host "  [ OK ] Web http://127.0.0.1:5173/" }
    } elseif (-not $Quiet) {
      Write-Host "  [WARN] Web http://127.0.0.1:5173/ — javob yo'q"
    }
  }

  if ($issues.Count -eq 0) {
    if ($Quiet) {
      Write-Host "OK: WTMA Docker ($Mode) — barcha servislar yaxshi"
    } elseif (-not $Quiet) {
      Write-Host ""
      Write-Host "RESULT: OK — barcha muhim servislar ishlayapti"
    }
    return 0
  }

  if ($Quiet) {
    Write-Host ("FAIL: WTMA Docker ($Mode) — {0} muammo: {1}" -f $issues.Count, ($issues -join ", "))
  } elseif (-not $Quiet) {
    Write-Host ""
    Write-Host "RESULT: FAIL — muammolar:"
    foreach ($issue in $issues) { Write-Host "  - $issue" }
  }
  return 1
}

if ($Watch) {
  while ($true) {
    Clear-Host
    $code = Show-Status
    Start-Sleep -Seconds $Interval
  }
} else {
  $code = Show-Status
  exit $code
}
