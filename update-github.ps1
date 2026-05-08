Write-Host ""
Write-Host "=== Mise a jour de X vers GitHub ==="
Write-Host ""
if (-not (Test-Path ".git")) {
    Write-Host "Erreur : ce dossier n'est pas un depot Git." -ForegroundColor Red
    Pause
    exit
}

$changes = git status --porcelain
if (-not $changes) {
    Write-Host "Aucun changement a envoyer." -ForegroundColor Yellow
    Pause
    exit
}

$message = Read-Host "Entrez le message du commit"

if ([string]::IsNullOrWhiteSpace($message)) {
    Write-Host "Message vide. Annulation." -ForegroundColor Yellow
    Pause
    exit
}

git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur pendant git add." -ForegroundColor Red
    Pause
    exit
}

git commit -m "$message"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Aucun commit cree ou erreur pendant git commit." -ForegroundColor Yellow
    Pause
    exit
}

git push

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur pendant git push." -ForegroundColor Red
    Pause
    exit
}

Write-Host ""
Write-Host "Mise a jour terminee avec succes !" -ForegroundColor Green
Pause