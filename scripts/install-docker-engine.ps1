$ErrorActionPreference = "Stop"
$log = Join-Path $env:TEMP "install-docker-engine.log"
Start-Transcript -Path $log -Force

$distro = "Ubuntu-24.04"
$linuxUser = "birkan"

function Invoke-WslRoot([string]$Bash) {
    & wsl.exe -d $distro -u root -- bash -lc $Bash
    if ($LASTEXITCODE -ne 0) {
        throw "WSL komutu basarisiz: $Bash"
    }
}

Write-Host "=== 1) Ubuntu 24.04 kuruluyor ==="
$existing = & wsl.exe -l -q
$hasDistro = $existing | ForEach-Object { $_.Trim() } | Where-Object { $_ -eq $distro }
if (-not $hasDistro) {
    & wsl.exe --install -d $distro --no-launch --web-download
    if ($LASTEXITCODE -ne 0) {
        throw "Ubuntu kurulumu basarisiz. Once bilgisayari yeniden baslatin."
    }
}

Write-Host "=== 2) Distro root ile baslatiliyor ==="
& wsl.exe -d $distro -u root -- true
if ($LASTEXITCODE -ne 0) {
    throw "Ubuntu baslatilamadi. Virtual Machine Platform icin yeniden baslatma gerekebilir."
}

Write-Host "=== 3) systemd ve kullanici ==="
Invoke-WslRoot @"
set -e
if ! id -u $linuxUser >/dev/null 2>&1; then
  useradd -m -s /bin/bash -G sudo $linuxUser
fi
echo '$linuxUser ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/$linuxUser
chmod 440 /etc/sudoers.d/$linuxUser
cat > /etc/wsl.conf <<EOF
[boot]
systemd=true

[user]
default=$linuxUser
EOF
"@

Write-Host "=== 4) Distro yeniden baslatiliyor (systemd) ==="
& wsl.exe --terminate $distro
Start-Sleep -Seconds 3
& wsl.exe -d $distro -u root -- true

Write-Host "=== 5) Docker Engine kuruluyor ==="
Invoke-WslRoot @"
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl
curl -fsSL https://get.docker.com | sh
usermod -aG docker $linuxUser
systemctl enable --now docker
docker --version
docker compose version
"@

Write-Host "=== 6) Windows tarafinda docker.cmd ==="
$bin = Join-Path $env:USERPROFILE "bin"
New-Item -ItemType Directory -Force -Path $bin | Out-Null
@"
@echo off
wsl.exe -d $distro -u $linuxUser --cd "%CD%" -- docker %*
"@ | Set-Content -Encoding ASCII (Join-Path $bin "docker.cmd")

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$bin*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$bin", "User")
}
$env:Path = "$env:Path;$bin"

Write-Host "=== KURULUM BITTI ==="
Write-Host "docker --version:"
& wsl.exe -d $distro -u $linuxUser -- docker --version
Write-Host "LOG: $log"
Stop-Transcript
