# Find My Tutor - Backend Setup Script
# Simple setup without encoding issues

Write-Host "========================================"
Write-Host "Find My Tutor - Backend Setup"
Write-Host "========================================"
Write-Host ""

# Check if Python is installed
Write-Host "Checking Python installation..."
python --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python not found"
    exit 1
}
Write-Host ""

# Create virtual environment
$venvPath = ".\.venv"
if (Test-Path $venvPath) {
    Write-Host "Virtual environment already exists. Skipping creation."
}
else {
    Write-Host "Creating virtual environment..."
    python -m venv $venvPath
}
Write-Host ""

# Activate virtual environment
Write-Host "Activating virtual environment..."
& "$venvPath\Scripts\Activate.ps1"
Write-Host ""

# Install requirements
Write-Host "Installing dependencies..."
python -m pip install -q --upgrade pip
python -m pip install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Setup complete!"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Configure .env file (copy from .env.example)"
    Write-Host "2. Run: python manage.py dbshell"
    Write-Host "3. Run: python manage.py runserver"
} else {
    Write-Host "ERROR: Installation failed"
    exit 1
}
