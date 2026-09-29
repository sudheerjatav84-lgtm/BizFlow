$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:5000"

Write-Host ""
Write-Host "========== BIZFLOW BUSINESS API SECURITY TEST ==========" -ForegroundColor Cyan
Write-Host ""

$email = Read-Host "Owner login email"
$password = Read-Host "Owner login password" -AsSecureString

$plainPassword =
    [System.Net.NetworkCredential]::new(
        "",
        $password
    ).Password

Write-Host ""
Write-Host "========== LOGIN TEST ==========" -ForegroundColor Yellow

try {

    $loginBody = @{
        email = $email
        password = $plainPassword
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    if (
        !$loginResponse.success -or
        !$loginResponse.token
    ) {
        throw "Login did not return a valid token."
    }

    $token = $loginResponse.token

    Write-Host "PASS: Owner login successful." -ForegroundColor Green
    Write-Host "Owner ID: $($loginResponse.owner._id)" -ForegroundColor DarkGray

}
catch {

    Write-Host ""
    Write-Host "FAIL: Owner login failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

$headers = @{
    Authorization = "Bearer $token"
}

$failures = 0
$createdBusinessId = $null


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
            $actualStatus =
                [int]$_.Exception.Response.StatusCode
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
Write-Host "========== NO TOKEN TEST ==========" -ForegroundColor Yellow

Test-ExpectedStatus `
    "Request without authentication token" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses" `
            -Method Get
    } `
    401


Write-Host ""
Write-Host "========== INVALID TOKEN TEST ==========" -ForegroundColor Yellow

$badHeaders = @{
    Authorization = "Bearer invalid.invalid.invalid"
}

Test-ExpectedStatus `
    "Request with invalid JWT" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses" `
            -Method Get `
            -Headers $badHeaders
    } `
    401


Write-Host ""
Write-Host "========== CREATE FIELD INJECTION TESTS ==========" -ForegroundColor Yellow


$payloadOwner = @{
    name = "SECURITY OWNER INJECTION TEST"
    type = "Security Test"
    owner = "000000000000000000000000"
} | ConvertTo-Json

Test-ExpectedStatus `
    "owner field injection" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses" `
            -Method Post `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payloadOwner
    } `
    400


$payloadRole = @{
    name = "SECURITY ROLE INJECTION TEST"
    type = "Security Test"
    role = "admin"
} | ConvertTo-Json

Test-ExpectedStatus `
    "role field injection" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses" `
            -Method Post `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payloadRole
    } `
    400


$payloadAdmin = @{
    name = "SECURITY ADMIN INJECTION TEST"
    type = "Security Test"
    isAdmin = $true
} | ConvertTo-Json

Test-ExpectedStatus `
    "isAdmin field injection" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses" `
            -Method Post `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payloadAdmin
    } `
    400


$payloadUnknown = @{
    name = "SECURITY UNKNOWN FIELD TEST"
    type = "Security Test"
    secretField = "privileged"
} | ConvertTo-Json

Test-ExpectedStatus `
    "arbitrary unknown field injection" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses" `
            -Method Post `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payloadUnknown
    } `
    400


Write-Host ""
Write-Host "========== STRICT TYPE TESTS ==========" -ForegroundColor Yellow


$payloadNumberName = @{
    name = 12345
    type = "Security Test"
} | ConvertTo-Json

Test-ExpectedStatus `
    "numeric business name" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses" `
            -Method Post `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payloadNumberName
    } `
    400


$payloadObjectName = @{
    name = @{
        value = "Injected"
    }
    type = "Security Test"
} | ConvertTo-Json -Depth 5

Test-ExpectedStatus `
    "object business name" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses" `
            -Method Post `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payloadObjectName
    } `
    400


$payloadArrayType = @{
    name = "Security Test"
    type = @(
        "admin"
    )
} | ConvertTo-Json

Test-ExpectedStatus `
    "array business type" `
    {
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses" `
            -Method Post `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payloadArrayType
    } `
    400


Write-Host ""
Write-Host "========== UPDATE FIELD INJECTION TESTS ==========" -ForegroundColor Yellow


$businessesResponse =
    Invoke-RestMethod `
        -Uri "$baseUrl/api/businesses" `
        -Method Get `
        -Headers $headers

if (
    !$businessesResponse.success
) {
    throw "Unable to load businesses for update security tests."
}

if (
    !$businessesResponse.businesses -or
    $businessesResponse.businesses.Count -eq 0
) {

    Write-Host "INFO: No existing business available for update tests." -ForegroundColor Yellow

}
else {

    $testBusiness =
        $businessesResponse.businesses[0]

    $testBusinessId =
        $testBusiness._id

    Write-Host "Using business ID: $testBusinessId" -ForegroundColor DarkGray


    $updateOwnerPayload = @{
        owner = "000000000000000000000000"
    } | ConvertTo-Json

    Test-ExpectedStatus `
        "update owner injection" `
        {
            Invoke-RestMethod `
                -Uri "$baseUrl/api/businesses/$testBusinessId" `
                -Method Patch `
                -Headers $headers `
                -ContentType "application/json" `
                -Body $updateOwnerPayload
        } `
        400


    $updateRolePayload = @{
        role = "admin"
    } | ConvertTo-Json

    Test-ExpectedStatus `
        "update role injection" `
        {
            Invoke-RestMethod `
                -Uri "$baseUrl/api/businesses/$testBusinessId" `
                -Method Patch `
                -Headers $headers `
                -ContentType "application/json" `
                -Body $updateRolePayload
        } `
        400


    $updateAdminPayload = @{
        isAdmin = $true
    } | ConvertTo-Json

    Test-ExpectedStatus `
        "update isAdmin injection" `
        {
            Invoke-RestMethod `
                -Uri "$baseUrl/api/businesses/$testBusinessId" `
                -Method Patch `
                -Headers $headers `
                -ContentType "application/json" `
                -Body $updateAdminPayload
        } `
        400


    $invalidStatusPayload = @{
        status = "administrator"
    } | ConvertTo-Json

    Test-ExpectedStatus `
        "invalid status value" `
        {
            Invoke-RestMethod `
                -Uri "$baseUrl/api/businesses/$testBusinessId" `
                -Method Patch `
                -Headers $headers `
                -ContentType "application/json" `
                -Body $invalidStatusPayload
        } `
        400


    $invalidWebsitePayload = @{
        website = @{
            enabled = "true"
        }
    } | ConvertTo-Json

    Test-ExpectedStatus `
        "website boolean type bypass" `
        {
            Invoke-RestMethod `
                -Uri "$baseUrl/api/businesses/$testBusinessId" `
                -Method Patch `
                -Headers $headers `
                -ContentType "application/json" `
                -Body $invalidWebsitePayload
        } `
        400
}


Write-Host ""
Write-Host "========== VALID CREATE + OWNERSHIP TEST ==========" -ForegroundColor Yellow


$validPayload = @{
    name = "TEMP SECURITY VALIDATION BUSINESS"
    type = "Security Test"
} | ConvertTo-Json


try {

    $createResponse =
        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses" `
            -Method Post `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $validPayload

    if (
        !$createResponse.success -or
        !$createResponse.business._id
    ) {
        throw "Valid business creation did not return expected response."
    }

    $createdBusinessId =
        $createResponse.business._id

    Write-Host "PASS: Valid authenticated business creation works." -ForegroundColor Green
    Write-Host "Created ID: $createdBusinessId" -ForegroundColor DarkGray

    if (
        $createResponse.business.owner
    ) {
        Write-Host "FAIL: Owner field leaked in Business API response." -ForegroundColor Red
        $failures++
    }
    else {
        Write-Host "PASS: Owner field is not exposed in Business API response." -ForegroundColor Green
    }

}
catch {

    Write-Host "FAIL: Valid authenticated business creation failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    $failures++
}


Write-Host ""
Write-Host "========== CLEANUP ==========" -ForegroundColor Yellow


if ($createdBusinessId) {

    try {

        Invoke-RestMethod `
            -Uri "$baseUrl/api/businesses/$createdBusinessId" `
            -Method Delete `
            -Headers $headers | Out-Null

        Write-Host "PASS: Temporary security-test business deleted." -ForegroundColor Green

    }
    catch {

        Write-Host "WARNING: Temporary test business could not be deleted." -ForegroundColor Yellow
        Write-Host "Business ID: $createdBusinessId" -ForegroundColor Yellow
    }
}


Write-Host ""
Write-Host "========== FINAL RESULT ==========" -ForegroundColor Cyan

if ($failures -eq 0) {

    Write-Host ""
    Write-Host "PASS: BUSINESS API SECURITY TEST COMPLETED SUCCESSFULLY." -ForegroundColor Green
    Write-Host "No tested privilege/field/type bypass was detected." -ForegroundColor Green
    Write-Host ""

}
else {

    Write-Host ""
    Write-Host "FAIL: $failures security test(s) failed." -ForegroundColor Red
    Write-Host "Review the failed checks before continuing." -ForegroundColor Red
    Write-Host ""
}

Remove-Variable plainPassword -ErrorAction SilentlyContinue


