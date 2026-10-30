param([string]$BenchmarkPython,[string]$WorkerDirectory)
$ErrorActionPreference='Stop'
$workspace=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..'))
if (-not $BenchmarkPython) { $BenchmarkPython=Join-Path $workspace 'tmp\gee-colab-venv\Scripts\python.exe' }
if (-not $WorkerDirectory) { $WorkerDirectory=Join-Path $workspace 'tmp\local-ai-worker-venv' }
if (-not (Test-Path -LiteralPath $BenchmarkPython)) { throw 'The audited CPU environment is required. No global Python packages will be installed.' }
& $BenchmarkPython -m venv $WorkerDirectory
if ($LASTEXITCODE) { throw 'Could not prepare the worker environment.' }
$baseSite=Join-Path (Split-Path (Split-Path $BenchmarkPython -Parent) -Parent) 'Lib\site-packages'
$workerSite=Join-Path $WorkerDirectory 'Lib\site-packages'
# Read-only reuse of the audited CPU libraries. Installs target only the new venv.
Set-Content -LiteralPath (Join-Path $workerSite 'xedo_benchmark_runtime.pth') -Value $baseSite -Encoding ascii
$python=Join-Path $WorkerDirectory 'Scripts\python.exe'
& $python -m pip install --disable-pip-version-check --index-url https://pypi.org/simple --only-binary=:all: earthengine-api==1.7.50 shapely==2.2.0 setuptools==78.1.0
if ($LASTEXITCODE) { throw 'Dependency installation did not complete.' }
& $python -m pip check
if ($LASTEXITCODE) { throw 'The worker dependency check failed.' }
& $python -B (Join-Path $PSScriptRoot 'pipeline.py') doctor
exit $LASTEXITCODE
