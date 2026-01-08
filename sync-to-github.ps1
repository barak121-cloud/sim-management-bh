<#
.SYNOPSIS
    GitHub Sync Tool - Syncs local files to GitHub repository using REST API
.DESCRIPTION
    This script pushes local files to GitHub without requiring Git to be installed.
    Repository: barak121-cloud/sim-management-bh
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File sync-to-github.ps1 app.js index.html "Commit message"
#>

# Load configuration from external file (token stored securely)
$configPath = Join-Path $PSScriptRoot "github-config.ps1"
if (Test-Path $configPath) {
    . $configPath
}

# Configuration - Token from environment variable
$script:Config = @{
    Token = if ($env:GITHUB_TOKEN) { $env:GITHUB_TOKEN } else { $null }
    Owner = "barak121-cloud"
    Repo = "sim-management-bh"
    Branch = "main"
    BaseUrl = "https://api.github.com"
}

if (-not $script:Config.Token) {
    Write-Host "❌ Error: GitHub token not found!" -ForegroundColor Red
    Write-Host "   Set GITHUB_TOKEN environment variable or create github-config.ps1" -ForegroundColor Yellow
    exit 1
}

$script:Headers = @{
    "Authorization" = "Bearer $($script:Config.Token)"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent" = "GitHub-Sync-Tool-PowerShell"
}

function Sync-ToGitHub {
    param(
        [Parameter(Mandatory=$true)]
        [string[]]$Files,
        
        [Parameter(Mandatory=$false)]
        [string]$Message = "Update files - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    )
    
    $workDir = $PSScriptRoot
    if (-not $workDir) { $workDir = $PWD.Path }
    
    Write-Host ""
    Write-Host "🚀 Starting GitHub sync..." -ForegroundColor Cyan
    Write-Host ""
    
    try {
        # Step 1: Get latest commit
        Write-Host "📥 Getting latest commit..." -ForegroundColor Yellow
        $refResult = Invoke-RestMethod -Uri "$($script:Config.BaseUrl)/repos/$($script:Config.Owner)/$($script:Config.Repo)/git/ref/heads/$($script:Config.Branch)" -Headers $script:Headers
        $latestCommitSha = $refResult.object.sha
        Write-Host "   Latest commit: $($latestCommitSha.Substring(0, 7))" -ForegroundColor Gray
        
        # Step 2: Get tree SHA
        Write-Host "🌳 Getting tree SHA..." -ForegroundColor Yellow
        $commitResult = Invoke-RestMethod -Uri "$($script:Config.BaseUrl)/repos/$($script:Config.Owner)/$($script:Config.Repo)/git/commits/$latestCommitSha" -Headers $script:Headers
        $baseTreeSha = $commitResult.tree.sha
        Write-Host "   Base tree: $($baseTreeSha.Substring(0, 7))" -ForegroundColor Gray
        
        # Step 3: Create blobs for each file
        Write-Host "📦 Creating blobs for files..." -ForegroundColor Yellow
        $fileBlobs = @()
        
        foreach ($file in $Files) {
            $filePath = if ([System.IO.Path]::IsPathRooted($file)) { $file } else { Join-Path $workDir $file }
            
            if (-not (Test-Path $filePath)) {
                Write-Host "   ⚠️  Skipping $file (file not found at $filePath)" -ForegroundColor Yellow
                continue
            }
            
            $remotePath = if ([System.IO.Path]::IsPathRooted($file)) { 
                Split-Path $file -Leaf 
            } else { 
                $file -replace '\\', '/'
            }
            
            Write-Host "   📄 Creating blob for $remotePath..." -ForegroundColor White
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $content = [Convert]::ToBase64String($bytes)
            $blobBody = @{ content = $content; encoding = "base64" } | ConvertTo-Json
            $blobResult = Invoke-RestMethod -Uri "$($script:Config.BaseUrl)/repos/$($script:Config.Owner)/$($script:Config.Repo)/git/blobs" -Headers $script:Headers -Method POST -Body $blobBody -ContentType "application/json"
            
            $fileBlobs += @{ 
                path = $remotePath
                sha = $blobResult.sha 
            }
            Write-Host "      ✅ Blob created: $($blobResult.sha.Substring(0, 7))" -ForegroundColor Green
        }
        
        if ($fileBlobs.Count -eq 0) {
            Write-Host ""
            Write-Host "❌ No files to sync!" -ForegroundColor Red
            return $null
        }
        
        # Step 4: Create new tree
        Write-Host "🌲 Creating new tree..." -ForegroundColor Yellow
        $tree = $fileBlobs | ForEach-Object { @{ path = $_.path; mode = "100644"; type = "blob"; sha = $_.sha } }
        $treeBody = @{ base_tree = $baseTreeSha; tree = $tree } | ConvertTo-Json -Depth 5
        $treeResult = Invoke-RestMethod -Uri "$($script:Config.BaseUrl)/repos/$($script:Config.Owner)/$($script:Config.Repo)/git/trees" -Headers $script:Headers -Method POST -Body $treeBody -ContentType "application/json"
        Write-Host "   New tree: $($treeResult.sha.Substring(0, 7))" -ForegroundColor Gray
        
        # Step 5: Create commit
        Write-Host "💾 Creating commit..." -ForegroundColor Yellow
        $commitBody = @{ 
            message = $Message
            tree = $treeResult.sha
            parents = @($latestCommitSha) 
        } | ConvertTo-Json -Depth 5
        $newCommit = Invoke-RestMethod -Uri "$($script:Config.BaseUrl)/repos/$($script:Config.Owner)/$($script:Config.Repo)/git/commits" -Headers $script:Headers -Method POST -Body $commitBody -ContentType "application/json"
        Write-Host "   New commit: $($newCommit.sha.Substring(0, 7))" -ForegroundColor Gray
        
        # Step 6: Update branch reference
        Write-Host "🔄 Updating branch reference..." -ForegroundColor Yellow
        $refBody = @{ sha = $newCommit.sha; force = $false } | ConvertTo-Json
        $null = Invoke-RestMethod -Uri "$($script:Config.BaseUrl)/repos/$($script:Config.Owner)/$($script:Config.Repo)/git/refs/heads/$($script:Config.Branch)" -Headers $script:Headers -Method PATCH -Body $refBody -ContentType "application/json"
        Write-Host "   ✅ Branch '$($script:Config.Branch)' updated!" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "✨ Sync completed successfully!" -ForegroundColor Green
        Write-Host "   Repository: https://github.com/$($script:Config.Owner)/$($script:Config.Repo)" -ForegroundColor Cyan
        Write-Host "   Commit: $($newCommit.sha)" -ForegroundColor Cyan
        Write-Host "   Files synced: $($fileBlobs.path -join ', ')" -ForegroundColor Cyan
        Write-Host ""
        
        return @{
            Success = $true
            CommitSha = $newCommit.sha
            Files = $fileBlobs.path
        }
    }
    catch {
        Write-Host ""
        Write-Host "❌ Sync failed: $_" -ForegroundColor Red
        throw
    }
}

# CLI interface - Parse arguments
$argList = $args
$files = @()
$message = "Update files - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

if ($argList.Count -eq 0) {
    Write-Host ""
    Write-Host "GitHub Sync Tool" -ForegroundColor Cyan
    Write-Host "================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File sync-to-github.ps1 <file1> [file2] [...] [-m 'message']" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File sync-to-github.ps1 app.js index.html" -ForegroundColor White
    Write-Host "  powershell -ExecutionPolicy Bypass -File sync-to-github.ps1 app.js -m 'Updated app logic'" -ForegroundColor White
    Write-Host ""
    exit
}

# Parse arguments
for ($i = 0; $i -lt $argList.Count; $i++) {
    if ($argList[$i] -eq "-m" -or $argList[$i] -eq "--message") {
        if ($i + 1 -lt $argList.Count) {
            $message = $argList[$i + 1]
            $i++
        }
    } else {
        $files += $argList[$i]
    }
}

if ($files.Count -gt 0) {
    Sync-ToGitHub -Files $files -Message $message
}
