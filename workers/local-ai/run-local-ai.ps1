param(
    [Parameter(Mandatory=$true)][string]$Area,
    [string]$Start,
    [string]$End,
    [string]$Output,
    [string]$PythonPath
)
$ErrorActionPreference='Stop'
$workspace=([System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..')))
if (-not $PythonPath) { $PythonPath=Join-Path $workspace 'tmp\local-ai-worker-venv\Scripts\python.exe' }
if (-not (Test-Path -LiteralPath $PythonPath)) { throw 'Prepare the local AI Python environment first. See README.md.' }
$arguments=@('-B',(Join-Path $PSScriptRoot 'pipeline.py'),'analyze','--area',([System.IO.Path]::GetFullPath($Area)))
if ($Start) { $arguments+=@('--start',$Start) }
if ($End) { $arguments+=@('--end',$End) }
if ($Output) { $arguments+=@('--output',([System.IO.Path]::GetFullPath($Output))) }
& $PythonPath @arguments
exit $LASTEXITCODE
