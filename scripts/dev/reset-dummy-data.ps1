param(
  # Default seed script: truncates + re-inserts a full dev dataset (zones/workers/tasks/issues/etc).
  [string] $SeedFile = "scripts/dummy-data-dashboard-test.sql",
  # When set, also clears Redis Control caches so UI reflects the regenerated DB immediately.
  [switch] $ClearRedisCache
)

$ErrorActionPreference = "Stop"

function Write-Step([string] $msg) {
  Write-Host ("[reset-dummy-data] " + $msg)
}

function Assert-FileExists([string] $path) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Seed file not found: $path"
  }
}

function Assert-DockerRunning {
  $null = docker version | Out-Null
}

function Wait-MysqlReady {
  Write-Step "Waiting for mysql container..."
  for ($i = 0; $i -lt 60; $i++) {
    try {
      docker exec mysql sh -lc 'mysqladmin ping -h 127.0.0.1 -p"$MYSQL_ROOT_PASSWORD" --silent' | Out-Null
      Write-Step "mysql is ready."
      return
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  throw "mysql container did not become ready in time."
}

Assert-DockerRunning

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
$seedPath = (Resolve-Path (Join-Path $repoRoot $SeedFile)).Path
Assert-FileExists $seedPath

Wait-MysqlReady

Write-Step ("Seeding DB using: " + $SeedFile)
# Use env vars inside the mysql container (MYSQL_DATABASE / MYSQL_ROOT_PASSWORD) from docker-compose.
Get-Content -LiteralPath $seedPath -Raw | docker exec -i mysql sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
Write-Step "DB seed completed."

if ($ClearRedisCache) {
  Write-Step "Clearing Redis Control caches..."
  # Keep this targeted: dashboard summary + per-zone overview/worker/location caches.
  docker exec redis redis-cli DEL `
    lookie:control:dashboard:summary `
    lookie:control:zone:1:overview lookie:control:zone:2:overview lookie:control:zone:3:overview lookie:control:zone:4:overview `
    lookie:control:zone:1:workers lookie:control:zone:2:workers lookie:control:zone:3:workers lookie:control:zone:4:workers `
    lookie:control:zone:1:bottleneck lookie:control:zone:2:bottleneck lookie:control:zone:3:bottleneck lookie:control:zone:4:bottleneck | Out-Null

  Write-Step "Redis cache cleared."
}

Write-Step "Done."
