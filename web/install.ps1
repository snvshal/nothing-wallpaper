# XN Wallpaper - Windows PowerShell Installer
# Usage: irm https://wallpaper.snvshal.workers.dev/install.ps1 | iex

$ErrorActionPreference = 'Stop'

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

Write-Host ""
Write-Host "  · — — — — — — — — — — — — — — ·" -ForegroundColor DarkGray
Write-Host "  |   XN WALLPAPER FOR WINDOWS  |" -ForegroundColor White
Write-Host "  · — — — — — — — — — — — — — — ·" -ForegroundColor DarkGray
Write-Host ""

$downloadUrl = "https://wallpaper.snvshal.workers.dev/download"
$tempFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "XN.Wallpaper.Setup.exe")

Write-Host "  [+] Downloading latest release..." -ForegroundColor Cyan

try {
    $webClient = New-Object System.Net.WebClient
    $webClient.Headers.Add("User-Agent", "XN-Wallpaper-Installer")
    $webClient.DownloadFile($downloadUrl, $tempFile)

    # Unblock the file to remove web-origin ZoneId tag and prevent SmartScreen prompt
    Unblock-File -Path $tempFile -ErrorAction SilentlyContinue

    Write-Host "  [+] Launching installer..." -ForegroundColor Cyan
    Start-Process -FilePath $tempFile -Wait

    Write-Host "  [✓] Installation complete!" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "  [!] Installation failed: $_" -ForegroundColor Red
    Write-Host "  [!] You can download directly at: $downloadUrl" -ForegroundColor Yellow
}
finally {
    if (Test-Path $tempFile) {
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    }
}
