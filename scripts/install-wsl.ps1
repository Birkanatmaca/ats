$ErrorActionPreference = "Continue"
$log = Join-Path $env:TEMP "install-wsl.log"
Start-Transcript -Path $log -Force

Write-Host "=== WSL kurulumu basliyor ==="

winget install --id Microsoft.WSL -e --accept-package-agreements --accept-source-agreements
Write-Host "winget WSL exit: $LASTEXITCODE"

dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

& "$env:SystemRoot\System32\wsl.exe" --set-default-version 2
& "$env:SystemRoot\System32\wsl.exe" --update
& "$env:SystemRoot\System32\wsl.exe" --install -d Ubuntu --no-launch --web-download

Write-Host "=== WSL kurulumu bitti ==="
Write-Host "LOG: $log"
Stop-Transcript
