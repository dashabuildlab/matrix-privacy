$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$DeployKey  = ".\deploy_key"
$Remote     = "deployer@89.167.40.15"
$TmpArchive = "$env:TEMP\mod_deploy.tgz"
$TmpScript  = "$env:TEMP\mod_deploy.sh"

Write-Host "[1/3] Creating archive..."
& tar `
    --exclude='./node_modules' `
    --exclude='./.git' `
    --exclude='./.expo' `
    --exclude='./dist' `
    --exclude='./seo-website/node_modules' `
    --exclude='./seo-website/.next' `
    -czf $TmpArchive .

$sizeMB = [Math]::Round((Get-Item $TmpArchive).Length / 1MB, 1)
Write-Host "Archive: $sizeMB MB"

Write-Host "[2/3] Encoding & uploading..."
$bytes = [System.IO.File]::ReadAllBytes($TmpArchive)
$b64   = [System.Convert]::ToBase64String($bytes, [System.Base64FormattingOptions]::InsertLineBreaks)
$b64   = $b64 -replace "`r`n", "`n"
Remove-Item $TmpArchive -ErrorAction SilentlyContinue

$LF     = [char]10
$script = "base64 -d << 'DEPLOYEOF' | tar xzf -${LF}${b64}${LF}DEPLOYEOF${LF}exit${LF}"
[System.IO.File]::WriteAllBytes($TmpScript, [System.Text.Encoding]::ASCII.GetBytes($script))

Start-Process ssh -ArgumentList "-i", $DeployKey, "-o", "StrictHostKeyChecking=no", $Remote, "shell" `
    -RedirectStandardInput $TmpScript -NoNewWindow -Wait

Remove-Item $TmpScript -ErrorAction SilentlyContinue
Write-Host "Upload complete."

Write-Host "[3/3] Starting tunnel..."
& ssh -i $DeployKey -o StrictHostKeyChecking=no $Remote expo-tunnel
