# XN Wallpaper - Windows PowerShell Installer
# Usage: irm https://wallpaper.snvshal.workers.dev/install.ps1 | iex

$ErrorActionPreference = 'Stop'

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Nothing OS Theme Tokens (docs/DESIGN.md)
# Widget Red:    #D71920 -> 215, 25, 32
# Nothing White: #FFFFFF -> 255, 255, 255
# Nothing Grey:  #B1B3B3 -> 177, 179, 179
# Nothing Blue:  #002F6C (terminal luminance tuned -> 70, 140, 240)
# Terminal Green:#2ECC71 -> 46, 204, 113
$e = [char]27
$DOT = [char]0x2981
$R = "$e[38;2;215;25;32m$DOT"
$W = "$e[38;2;255;255;255m$DOT"
$D = "$e[38;2;55;55;55m$DOT"
$C_GREY   = "$e[38;2;177;179;179m"
$C_BLUE   = "$e[38;2;70;140;240m"
$C_GREEN  = "$e[38;2;46;204;113m"
$C_RED    = "$e[38;2;215;25;32m"
$C_RESET  = "$e[0m"
$CHECK    = [char]0x2713

Write-Host ""
Write-Host "  $R$D$D$D$R  $R$D$D$D$R    $W$D$D$D$W  $D$W$W$W$D  $W$D$D$D$D  $W$D$D$D$D  $W$W$W$W$D  $D$W$W$W$D  $W$W$W$W$D  $W$W$W$W$W  $W$W$W$W$D$C_RESET"
Write-Host "  $D$R$D$R$D  $R$R$D$D$R    $W$D$D$D$W  $W$D$D$D$W  $W$D$D$D$D  $W$D$D$D$D  $W$D$D$D$W  $W$D$D$D$W  $W$D$D$D$W  $W$D$D$D$D  $W$D$D$D$W$C_RESET"
Write-Host "  $D$D$R$D$D  $R$D$R$D$R    $W$D$W$D$W  $W$W$W$W$W  $W$D$D$D$D  $W$D$D$D$D  $W$W$W$W$D  $W$W$W$W$W  $W$W$W$W$D  $W$W$W$W$D  $W$W$W$W$D$C_RESET"
Write-Host "  $D$R$D$R$D  $R$D$D$R$R    $W$W$D$W$W  $W$D$D$D$W  $W$D$D$D$D  $W$D$D$D$D  $W$D$D$D$D  $W$D$D$D$W  $W$D$D$D$D  $W$D$D$D$D  $W$D$D$W$D$C_RESET"
Write-Host "  $R$D$D$D$R  $R$D$D$D$R    $W$D$D$D$W  $W$D$D$D$W  $W$W$W$W$W  $W$W$W$W$W  $W$D$D$D$D  $W$D$D$D$W  $W$D$D$D$D  $W$W$W$W$W  $W$D$D$D$W$C_RESET"
Write-Host ""
Write-Host "${C_GREY}  Live Desktop Wallpaper for Windows${C_RESET}"
Write-Host ""

$downloadUrl = "https://wallpaper.snvshal.workers.dev/download"
$tempFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "XN.Wallpaper.Setup.exe")

try {
    Write-Host "${C_BLUE}  [1/4] Connecting to server...${C_RESET}"
    $webClient = New-Object System.Net.WebClient
    $webClient.Headers.Add("User-Agent", "XN-Wallpaper-Installer")

    Write-Host -NoNewline "${C_BLUE}  [2/4] Downloading latest release... ${C_RESET}"
    $webClient.DownloadFile($downloadUrl, $tempFile)
    $fileSize = (Get-Item $tempFile).Length / 1MB
    Write-Host ("${C_GREY}(Downloaded {0:N1} MB)${C_RESET}" -f $fileSize)

    Write-Host "${C_BLUE}  [3/4] Preparing binary...${C_RESET}"
    Unblock-File -Path $tempFile -ErrorAction SilentlyContinue

    Write-Host "${C_BLUE}  [4/4] Installing...${C_RESET}"
    Get-Process -Name "XN Wallpaper", "nothing-wallpaper" -ErrorAction SilentlyContinue | Stop-Process -Force
    $proc = Start-Process -FilePath $tempFile -ArgumentList "/S" -PassThru -Wait

    # Launch installed application
    $appPaths = @(
        "$env:LOCALAPPDATA\Programs\XN Wallpaper\XN Wallpaper.exe",
        "$env:ProgramFiles\XN Wallpaper\XN Wallpaper.exe",
        "${env:ProgramFiles(x86)}\XN Wallpaper\XN Wallpaper.exe"
    )

    $launched = $false
    foreach ($path in $appPaths) {
        if (Test-Path $path) {
            Start-Process -FilePath $path
            $launched = $true
            break
        }
    }

    Write-Host ""
    Write-Host "${C_GREEN}  [$CHECK] XN Wallpaper installed successfully!${C_RESET}"
    if ($launched) {
        Write-Host "${C_GREY}  [$CHECK] Application launched in background.${C_RESET}"
    }
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "${C_RED}  [!] Installation error: $_${C_RESET}"
    Write-Host "${C_GREY}  [!] You can download the manual installer at: $downloadUrl${C_RESET}"
    Write-Host ""
}
finally {
    if (Test-Path $tempFile) {
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    }
}
