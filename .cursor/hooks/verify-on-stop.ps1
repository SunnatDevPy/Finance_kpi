# Runs wtma-verify on agent stop when source files changed.
# On failure, returns followup_message so the agent auto-fixes and re-verifies.

$raw = [Console]::In.ReadToEnd()
$input = $null
try {
    if ($raw) { $input = $raw | ConvertFrom-Json }
} catch {
    exit 0
}

$status = $input.status
$loopCount = if ($null -ne $input.loop_count) { [int]$input.loop_count } else { 0 }

if ($status -ne "completed") { exit 0 }
if ($loopCount -ge 5) { exit 0 }

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
Set-Location $repoRoot

if (Test-Path ".cursor/skip-verify") {
    Remove-Item ".cursor/skip-verify" -Force -ErrorAction SilentlyContinue
    exit 0
}

$changed = @()
$changed += git diff --name-only HEAD 2>$null
$changed += git diff --name-only --cached 2>$null
$changed = $changed | Where-Object { $_ -match '^(frontend|backend)/' } | Select-Object -Unique

if ($changed.Count -eq 0) { exit 0 }

$verifyScript = Join-Path $repoRoot ".cursor/skills/wtma-verify/scripts/verify.ps1"
$logFile = Join-Path $env:TEMP "wtma-verify-$([Guid]::NewGuid().ToString('N')).log"

& powershell -NoProfile -ExecutionPolicy Bypass -File $verifyScript *> $logFile
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Remove-Item $logFile -Force -ErrorAction SilentlyContinue
    exit 0
}

$tail = Get-Content $logFile -Tail 40 -ErrorAction SilentlyContinue
$body = ($tail -join "`n").Trim()
if (-not $body) { $body = "Verify script failed with exit code $exitCode" }
Remove-Item $logFile -Force -ErrorAction SilentlyContinue

$message = @"
wtma-verify FAILED after code changes (loop $loopCount/5). Fix errors, then stop again.

Changed paths: $($changed -join ', ')

----- verify output -----
$body

If unrelated to your edits, create `.cursor/skip-verify` and stop.
"@

$payload = @{ followup_message = $message } | ConvertTo-Json -Compress
Write-Output $payload
exit 0
