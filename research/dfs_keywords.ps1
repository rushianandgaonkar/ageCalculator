# dfs_keywords.ps1 — pulls keyword data for the age calculator site from DataForSEO.
# Uses the login stored with:  setx DFS_LOGIN "..."   and   setx DFS_PASSWORD "..."
# Run:  powershell -ExecutionPolicy Bypass -File .\dfs_keywords.ps1
# Output: keywords_<date>.csv (all keywords) + raw\*.json, in this folder.
# Expected cost: about USD 0.40–0.80 (DataForSEO Labs + Google Ads endpoints).

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$raw = Join-Path $here "raw"
New-Item -ItemType Directory -Force -Path $raw | Out-Null

function Get-Var($names) {
  foreach ($n in $names) {
    foreach ($scope in "Process", "User", "Machine") {
      $v = [Environment]::GetEnvironmentVariable($n, $scope)
      if ($v) { return $v }
    }
  }
  return $null
}
$login = Get-Var @("DFS_LOGIN", "DATAFORSEO_LOGIN", "DFS_USER", "DFS_EMAIL")
$pass  = Get-Var @("DFS_PASSWORD", "DFS_PASS", "DFS_API_PASSWORD", "DATAFORSEO_PASSWORD", "DFS_KEY", "DFS_API_KEY")
if (-not $login -or -not $pass) {
  Write-Host "Could not find the DataForSEO login. Variables starting with DFS that exist (names only):"
  foreach ($scope in "User", "Machine") {
    ([Environment]::GetEnvironmentVariables($scope)).Keys | Where-Object { $_ -like "DFS*" -or $_ -like "DATAFORSEO*" } | ForEach-Object { Write-Host "  $_ ($scope)" }
  }
  exit 1
}
$auth = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$login`:$pass"))
$script:totalCost = 0.0

function Invoke-DFS($path, $body, $tag) {
  $json = ConvertTo-Json -InputObject @($body) -Depth 10 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $r = Invoke-WebRequest -UseBasicParsing -Method Post -Uri ("https://api.dataforseo.com" + $path) `
        -Headers @{ Authorization = $auth } -ContentType "application/json; charset=utf-8" -Body $bytes
  $text = [System.Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
  [System.IO.File]::WriteAllText((Join-Path $raw "$tag.json"), $text, (New-Object System.Text.UTF8Encoding($false)))
  $obj = $text | ConvertFrom-Json
  if ($obj.cost) { $script:totalCost += [double]$obj.cost }
  $task = $obj.tasks[0]
  if ($task.status_code -ne 20000) { Write-Host "  ! $tag : $($task.status_code) $($task.status_message)"; return $null }
  return $task
}

# market, seed, location_code, language_code
$jobs = @(
  @{ m = "US";    seed = "age calculator";               loc = 2840; lang = "en" },
  @{ m = "India"; seed = "age calculator";               loc = 2356; lang = "en" },
  @{ m = "India"; seed = "age limit";                    loc = 2356; lang = "en" },
  @{ m = "Saudi"; seed = "حساب العمر";                   loc = 2682; lang = "ar" },
  @{ m = "Saudi"; seed = "حاسبة العمر";                  loc = 2682; lang = "ar" },
  @{ m = "Egypt"; seed = "حساب العمر";                   loc = 2818; lang = "ar" },
  @{ m = "Japan"; seed = "年齢早見表";                    loc = 2392; lang = "ja" },
  @{ m = "Japan"; seed = "年齢計算";                      loc = 2392; lang = "ja" },
  @{ m = "US";    seed = "chronological age calculator"; loc = 2840; lang = "en" },
  @{ m = "Nepal"; seed = "nepali age calculator";        loc = 2524; lang = "en" },
  @{ m = "Nepal"; seed = "nepali date";                  loc = 2524; lang = "en" }
)

$rows = New-Object System.Collections.Generic.List[object]
$i = 0
foreach ($j in $jobs) {
  $i++
  $tag = "{0:D2}_{1}_labs" -f $i, $j.m
  Write-Host "[$i/$($jobs.Count)] $($j.m): $($j.seed)"
  $task = $null
  try {
    $task = Invoke-DFS "/v3/dataforseo_labs/google/keyword_suggestions/live" @{
      keyword = $j.seed; location_code = $j.loc; language_code = $j.lang; limit = 300
      include_seed_keyword = $true; order_by = @("keyword_info.search_volume,desc")
    } $tag
  } catch { Write-Host "  ! Labs request failed: $($_.Exception.Message)" }

  $items = @()
  if ($task -and $task.result -and $task.result[0]) {
    if ($task.result[0].seed_keyword_data) { $items += $task.result[0].seed_keyword_data }
    if ($task.result[0].items) { $items += $task.result[0].items }
  }
  if ($items.Count -gt 1) {
    foreach ($it in $items) {
      $ki = $it.keyword_info
      $rows.Add([pscustomobject]@{
        market = $j.m; seed = $j.seed; keyword = $it.keyword
        volume = $ki.search_volume; kd = $it.keyword_properties.keyword_difficulty
        cpc = $ki.cpc; competition = $ki.competition_level
        intent = $it.search_intent_info.main_intent; source = "labs"
      })
    }
  } else {
    # Fallback for markets DataForSEO Labs doesn't cover: Google Ads keyword ideas
    Write-Host "  -> using Google Ads keyword ideas"
    try {
      $g = Invoke-DFS "/v3/keywords_data/google_ads/keywords_for_keywords/live" @{
        keywords = @($j.seed); location_code = $j.loc; language_code = $j.lang; sort_by = "search_volume"
      } ("{0:D2}_{1}_ads" -f $i, $j.m)
      if ($g -and $g.result) {
        foreach ($it in $g.result) {
          $rows.Add([pscustomobject]@{
            market = $j.m; seed = $j.seed; keyword = $it.keyword
            volume = $it.search_volume; kd = $null; cpc = $it.cpc; competition = $it.competition
            intent = $null; source = "google_ads"
          })
        }
      }
    } catch { Write-Host "  ! Google Ads request failed: $($_.Exception.Message)" }
  }
}

$out = Join-Path $here ("keywords_{0}.csv" -f (Get-Date -Format "yyyy-MM-dd"))
$rows | Sort-Object market, @{ Expression = { [int]$_.volume }; Descending = $true } |
  Export-Csv -Path $out -NoTypeInformation -Encoding UTF8
Write-Host ""
Write-Host ("Saved {0} keywords to {1}" -f $rows.Count, $out)
Write-Host ("DataForSEO cost for this run: USD {0:N4}" -f $script:totalCost)
