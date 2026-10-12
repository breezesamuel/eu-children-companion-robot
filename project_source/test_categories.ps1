$env:NODE_ENV='development'
$serverDir = "F:\2026\欧洲儿童陪护机器人\project_source"

# Kill any existing node
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start server
Start-Process -FilePath "node" -ArgumentList "$serverDir\server.js" -WindowStyle Hidden -WorkingDirectory $serverDir
Start-Sleep -Seconds 6

# Test categories
$cats = @(
    @("science_biology", "Science"),
    @("science_physics", "Science"),
    @("science_chemistry", "Science"),
    @("science_astronomy", "Science"),
    @("science_earth", "Science"),
    @("stories_bedtime", "Stories"),
    @("stories_fairy_tales", "Stories"),
    @("music_rhymes", "Music"),
    @("music_instruments", "Music"),
    @("music_singing", "Music"),
    @("music_classical", "Music"),
    @("arts_drawing", "Arts"),
    @("arts_painting", "Arts"),
    @("arts_crafts", "Arts"),
    @("arts_drama", "Arts"),
    @("arts_sculpture", "Arts"),
    @("tech_coding", "Tech"),
    @("tech_robotics", "Tech"),
    @("tech_ai", "Tech"),
    @("tech_internet", "Tech"),
    @("tech_electronics", "Tech"),
    @("eng_structure", "Engineering"),
    @("eng_aerospace", "Engineering"),
    @("eng_automotive", "Engineering"),
    @("eng_industrial", "Engineering"),
    @("eng_electrical", "Engineering"),
    @("math_addition", "Math"),
    @("math_geometry", "Math"),
    @("math_measurement", "Math")
)

$passed = 0
$failed = 0
foreach ($pair in $cats) {
    $c = $pair[0]
    $type = $pair[1]
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000/api/learn/content/$c?limit=1" -UseBasicParsing -TimeoutSec 5
        $j = $r.Content | ConvertFrom-Json
        if ($j.data.Count -gt 0) {
            Write-Host "PASS $type/$c -> $($j.total) items"
            $passed++
        } else {
            Write-Host "FAIL $type/$c -> 0 items"
            $failed++
        }
    } catch {
        Write-Host "FAIL $type/$c -> $_"
        $failed++
    }
}

Write-Host "=== Summary: $passed passed, $failed failed ==="

# Test voice chat
try {
    $b = @{message='Hello, can you teach me English?'} | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "http://localhost:3000/api/voice-chat/chat" -Method Post -Body $b -ContentType 'application/json' -UseBasicParsing -TimeoutSec 10
    $j = $r.Content | ConvertFrom-Json
    Write-Host "Voice chat: success=$($j.success), reply=$($j.reply.Substring(0, [Math]::Min(100, $j.reply.Length)))..."
} catch {
    Write-Host "Voice chat ERROR: $_"
}
