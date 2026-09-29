$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:5000"

Write-Host ""
Write-Host "========== BIZFLOW BUSINESS UPDATE SECURITY TEST ==========" -ForegroundColor Cyan
Write-Host ""

$email = Read-Host "Owner login email"
$password = Read-Host "Owner login password" -AsSecureString

$plainPassword = [System.Net.NetworkCredential]::new("", $password).Password

Write-Host ""
Write-Host "========== LOGIN ==========" -ForegroundColor Yellow

$loginBody = @{
    email = $email
    password = $plainPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    if (!$loginResponse.success -or !$loginResponse.token) {
        throw "Login did not return a valid token."
    }

    $token = $loginResponse.token

    Write-Host "PASS: Login successful." -ForegroundColor Green
}
catch {
    Write-Host "FAIL: Login failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

$headers = @{
    Authorization = "Bearer $token"
}

$failures = 0
$businessId = $null

function Test-ExpectedStatus {
    param(
        [string]$Name,
        [scriptblock]$Request,
        [int]$ExpectedStatus
    )

    try {
        & $Request | Out-Null

        Write-Host "FAIL: $Name" -ForegroundColor Red
        Write-Host "      Expected HTTP $ExpectedStatus but request succeeded." -ForegroundColor Red

        $script:failures++
    }
    catch {
        $actualStatus = $null

        if ($_.Exception.Response) {
            $actualStatus = [int]$_.Exception.Response.StatusCode
        }

        if ($actualStatus -eq $ExpectedStatus) {
            Write-Host "PASS: $Name -> HTTP $actualStatus" -ForegroundColor Green
        }
        else {
            Write-Host "FAIL: $Name" -ForegroundColor Red
            Write-Host "      Expected HTTP $ExpectedStatus, got HTTP $actualStatus" -ForegroundColor Red

            $script:failures++
        }
    }
}

Write-Host ""
Write-Host "========== CREATE TEMP BUSINESS ==========" -ForegroundColor Yellow

$createPayload = @{
    name = "TEMP UPDATE SECURITY TEST"
    type = "Security Test"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/businesses" `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $createPayload

    if (!$createResponse.success -or !$createResponse.business._id) {
        throw "Temporary business creation failed."
    }

    $businessId = $createResponse.business._id

    Write-Host "PASS: Temporary business created." -ForegroundColor Green
    Write-Host "Business ID: $businessId" -ForegroundColor DarkGray
}
catch {
    Write-Host "FAIL: Temporary business creation failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========== VALID UPDATE TESTS ==========" -ForegroundColor Yellow

$validNamePayload = @{
    name = "TEMP UPDATED BUSINESS"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod `
        -Uri "$baseUrl/api/businesses/$businessId" `
        -Method Patch `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $validNamePayload

    if ($response.success -and $response.business.name -eq "TEMP UPDATED BUSINESS") {
        Write-Host "PASS: Valid name update works." -ForegroundColor Green
    }
    else {
        Write-Host "FAIL: Valid name update returned unexpected response." -ForegroundColor Red
        $failures++
    }
}
catch {
    Write-Host "FAIL: Valid name update failed." -ForegroundColor Red
    $failures++
}

$validTypePayload = @{
    type = "Professional Business"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod `
        -Uri "$baseUrl/api/businesses/$businessId" `
        -Method Patch `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $validTypePayload

    if ($response.success -and $response.business.type -eq "Professional Business") {
        Write-Host "PASS: Valid type update works." -ForegroundColor Green
    }
    else {
        Write-Host "FAIL: Valid type update returned unexpected response." -ForegroundColor Red
        $failures++
    }
}
catch {
    Write-Host "FAIL: Valid type update failed." -ForegroundColor Red
    $failures++
}

$validStatusPayload = @{
    status = "inactive"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod `
        -Uri "$baseUrl/api/businesses/$businessId" `
        -Method Patch `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $validStatusPayload

    if ($response.success -and $response.business.status -eq "inactive") {
        Write-Host "PASS: Valid status update works." -ForegroundColor Green
    }
    else {
        Write-Host "FAIL: Valid status update returned unexpected response." -ForegroundColor Red
        $failures++
    }
}
catch {
    Write-Host "FAIL: Valid status update failed." -ForegroundColor Red
    $failures++
}

$validWebsitePayload = @{
    website = @{
        enabled = $true
        hidden = $false
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod `
        -Uri "$baseUrl/api/businesses/$businessId" `
        -Method Patch `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $validWebsitePayload

    if (
        $response.success -and
        $response.business.website.enabled -eq $true
    ) {
        Write-Host "PASS: Valid website settings update works." -ForegroundColor Green
    }
    else {
        Write-Host "FAIL: Valid website update returned unexpected response." -ForegroundColor Red
        $failures++
    }
}
catch {
    Write-Host "FAIL: Valid website update failed." -ForegroundColor Red
    $failures++
}

Write-Host ""
Write-Host "========== UPDATE INJECTION TESTS ==========" -ForegroundColor Yellow

$payload = @{
    owner = "000000000000000000000000"
} | ConvertTo-Json

Test-ExpectedStatus `
    "owner injection" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses/$businessId" `
            -Method Patch `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payload
    } `
    400

$payload = @{
    role = "admin"
} | ConvertTo-Json

Test-ExpectedStatus `
    "role injection" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses/$businessId" `
            -Method Patch `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payload
    } `
    400

$payload = @{
    isAdmin = $true
} | ConvertTo-Json

Test-ExpectedStatus `
    "isAdmin injection" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses/$businessId" `
            -Method Patch `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payload
    } `
    400

$payload = @{
    secretField = "privileged"
} | ConvertTo-Json

Test-ExpectedStatus `
    "unknown field injection" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses/$businessId" `
            -Method Patch `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payload
    } `
    400

Write-Host ""
Write-Host "========== INVALID VALUE TESTS ==========" -ForegroundColor Yellow

$payload = @{
    status = "administrator"
} | ConvertTo-Json

Test-ExpectedStatus `
    "invalid status" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses/$businessId" `
            -Method Patch `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payload
    } `
    400

$payload = @{
    website = @{
        enabled = "true"
    }
} | ConvertTo-Json

Test-ExpectedStatus `
    "website enabled string bypass" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses/$businessId" `
            -Method Patch `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payload
    } `
    400

$payload = @{
    website = @{
        hidden = "false"
    }
} | ConvertTo-Json

Test-ExpectedStatus `
    "website hidden string bypass" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses/$businessId" `
            -Method Patch `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payload
    } `
    400

Write-Host ""
Write-Host "========== CLEANUP ==========" -ForegroundColor Yellow

if ($businessId) {
    try {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses/$businessId" `
            -Method Delete `
            -Headers $headers | Out-Null

        Write-Host "PASS: Temporary business deleted." -ForegroundColor Green
    }
    catch {
        Write-Host "WARNING: Temporary business could not be deleted." -ForegroundColor Yellow
        Write-Host "Business ID: $businessId" -ForegroundColor Yellow
    }
}

Remove-Variable plainPassword -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========== FINAL RESULT ==========" -ForegroundColor Cyan

if ($failures -eq 0) {
    Write-Host ""
    Write-Host "PASS: BUSINESS UPDATE SECURITY TEST PASSED." -ForegroundColor Green
    Write-Host "All tested update protections are working." -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host ""
    Write-Host "FAIL: $failures security test(s) failed." -ForegroundColor Red
    Write-Host ""
}
