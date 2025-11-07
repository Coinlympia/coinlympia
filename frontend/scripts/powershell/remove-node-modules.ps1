#!/usr/bin/env pwsh
# this script removes node_modules from the root, apps, and packages directories

Write-Host "Searching for all node_modules directories..." -ForegroundColor Yellow

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)

$nodeModulesDirs = Get-ChildItem -Path $projectRoot -Directory -Filter "node_modules" -Recurse -ErrorAction SilentlyContinue | 
Where-Object { $_.FullName -notmatch "\\node_modules\\.*\\node_modules" }

if ($null -eq $nodeModulesDirs -or $nodeModulesDirs.Count -eq 0) {
  Write-Host "No node_modules directories found." -ForegroundColor Green
  exit 0
}

Write-Host "Found $($nodeModulesDirs.Count) node_modules directories to remove..." -ForegroundColor Cyan

$jobs = @()
$nodeModulesDirs | ForEach-Object {
  $dir = $_.FullName
  $job = Start-Job -ScriptBlock {
    param($path)
    if (Test-Path $path) {
      & cmd /c "rmdir /s /q `"$path`"" 2>$null
    }
  } -ArgumentList $dir
  $jobs += $job
}

$jobs | Wait-Job | Out-Null
$jobs | Remove-Job

Write-Host "All node_modules directories have been removed." -ForegroundColor Green

