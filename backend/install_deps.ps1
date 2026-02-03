param(
	[string]$PythonVersion = "3.11"
)

Write-Host "Using Python $PythonVersion"

if (-not (Test-Path ".venv")) {
	py -$PythonVersion -m venv .venv
}

.\.venv\Scripts\python -m pip install -U pip
.\.venv\Scripts\python -m pip install -e .

Write-Host "Dependencies installed into .venv"


