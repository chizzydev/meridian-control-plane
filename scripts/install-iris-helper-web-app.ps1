[CmdletBinding()]
param(
    [switch]$Apply,

    [string]$ContainerName = "iris-cert"
)

$ErrorActionPreference = "Stop"

$AppName = `
    "/meridian-control-plane-internal"

# Existing-app invariants.
#
# Recurse is deliberately excluded here because Recurse is the one
# property this installer is allowed to repair from 0 -> 1.
$ExpectedInvariant = [ordered]@{
    Enabled =
        "1"

    NameSpace =
        "USER"

    DispatchClass =
        "Meridian.ControlPlane.Internal.REST"

    Resource =
        "Meridian_ControlPlane_Internal"

    MatchRoles =
        ":MeridianControlPlaneHelperExecution"

    CSRFToken =
        "1"

    AutheEnabled =
        "32"

    UseCookies =
        "0"

    CSPZENEnabled =
        "1"

    JWTAuthEnabled =
        "1"

    InbndWebServicesEnabled =
        "1"

    ServeFiles =
        "0"

    RedirectEmptyPath =
        "0"

    AutoCompile =
        "0"

    TraceEnabled =
        "0"

    SessionScope =
        "2"

    UserCookieScope =
        "2"

    CookiePath =
        "/meridian-control-plane-internal/"

    Description =
        "Meridian Control Plane private runtime helper"
}

function Get-MarkerValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,

        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $Match = [regex]::Match(
        $Text,
        "(?m)^" +
        [regex]::Escape(
            $Name
        ) +
        "=(.*)$"
    )

    if (-not $Match.Success) {
        return $null
    }

    return $Match.Groups[1].Value.Trim()
}

function Invoke-IrisSys {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Script
    )

    $SavedPreference =
        $ErrorActionPreference

    try {

        $ErrorActionPreference =
            "Continue"

        $Output = @(
            $Script |
                docker exec `
                    -i `
                    $ContainerName `
                    iris session IRIS -U%SYS 2>&1
        )

        $ExitCode =
            $LASTEXITCODE
    }
    finally {

        $ErrorActionPreference =
            $SavedPreference
    }

    $Output |
        ForEach-Object {
            Write-Host $_
        }

    $Text =
        $Output -join "`n"

    if ($ExitCode -ne 0) {
        throw "IRIS %SYS session failed."
    }

    foreach ($Fatal in @(
        "<SYNTAX>",
        "<UNDEFINED>",
        "<PROTECT>",
        "<CLASS DOES NOT EXIST>",
        "<METHOD DOES NOT EXIST>"
    )) {

        if ($Text.Contains($Fatal)) {
            throw "IRIS session emitted fatal marker: $Fatal"
        }
    }

    return $Text
}

function Read-HelperApp {

    $Script = @(
        'set app="/meridian-control-plane-internal"'
        'kill obj,esc,p'
        'set exists=##class(Security.Applications).Exists(app,.obj,.esc)'
        'write "APP_EXISTS="_exists,!'
        'if ''exists halt'
        'set sc=##class(Security.Applications).Get(app,.p)'
        'write "APP_GET_OK="_$SYSTEM.Status.IsOK(sc),!'
        'write "APP_ENABLED="_$get(p("Enabled")),!'
        'write "APP_NAMESPACE="_$get(p("NameSpace")),!'
        'write "APP_DISPATCH="_$get(p("DispatchClass")),!'
        'write "APP_RESOURCE="_$get(p("Resource")),!'
        'write "APP_MATCHROLES="_$get(p("MatchRoles")),!'
        'write "APP_RECURSE="_$get(p("Recurse")),!'
        'write "APP_CSRF="_$get(p("CSRFToken")),!'
        'write "APP_AUTH="_$get(p("AutheEnabled")),!'
        'write "APP_USECOOKIES="_$get(p("UseCookies")),!'
        'write "APP_CSPZEN="_$get(p("CSPZENEnabled")),!'
        'write "APP_JWT="_$get(p("JWTAuthEnabled")),!'
        'write "APP_INBOUND="_$get(p("InbndWebServicesEnabled")),!'
        'write "APP_SERVEFILES="_$get(p("ServeFiles")),!'
        'write "APP_REDIRECT_EMPTY="_$get(p("RedirectEmptyPath")),!'
        'write "APP_AUTOCOMPILE="_$get(p("AutoCompile")),!'
        'write "APP_TRACE="_$get(p("TraceEnabled")),!'
        'write "APP_SESSION_SCOPE="_$get(p("SessionScope")),!'
        'write "APP_USER_COOKIE_SCOPE="_$get(p("UserCookieScope")),!'
        'write "APP_COOKIE_PATH="_$get(p("CookiePath")),!'
        'write "APP_DESCRIPTION="_$get(p("Description")),!'
        'halt'
    ) -join "`n"

    $Text =
        Invoke-IrisSys `
            -Script $Script

    $Exists =
        Get-MarkerValue `
            -Text $Text `
            -Name "APP_EXISTS"

    if ($Exists -eq "0") {

        return [pscustomobject]@{
            Exists =
                $false

            Raw =
                $Text
        }
    }

    if ($Exists -ne "1") {
        throw "Could not classify helper web-app existence."
    }

    if (
        (
            Get-MarkerValue `
                -Text $Text `
                -Name "APP_GET_OK"
        ) -ne "1"
    ) {
        throw "Helper web application exists but could not be read."
    }

    return [pscustomobject]@{
        Exists =
            $true

        Enabled =
            Get-MarkerValue $Text "APP_ENABLED"

        NameSpace =
            Get-MarkerValue $Text "APP_NAMESPACE"

        DispatchClass =
            Get-MarkerValue $Text "APP_DISPATCH"

        Resource =
            Get-MarkerValue $Text "APP_RESOURCE"

        MatchRoles =
            Get-MarkerValue $Text "APP_MATCHROLES"

        Recurse =
            Get-MarkerValue $Text "APP_RECURSE"

        CSRFToken =
            Get-MarkerValue $Text "APP_CSRF"

        AutheEnabled =
            Get-MarkerValue $Text "APP_AUTH"

        UseCookies =
            Get-MarkerValue $Text "APP_USECOOKIES"

        CSPZENEnabled =
            Get-MarkerValue $Text "APP_CSPZEN"

        JWTAuthEnabled =
            Get-MarkerValue $Text "APP_JWT"

        InbndWebServicesEnabled =
            Get-MarkerValue $Text "APP_INBOUND"

        ServeFiles =
            Get-MarkerValue $Text "APP_SERVEFILES"

        RedirectEmptyPath =
            Get-MarkerValue $Text "APP_REDIRECT_EMPTY"

        AutoCompile =
            Get-MarkerValue $Text "APP_AUTOCOMPILE"

        TraceEnabled =
            Get-MarkerValue $Text "APP_TRACE"

        SessionScope =
            Get-MarkerValue $Text "APP_SESSION_SCOPE"

        UserCookieScope =
            Get-MarkerValue $Text "APP_USER_COOKIE_SCOPE"

        CookiePath =
            Get-MarkerValue $Text "APP_COOKIE_PATH"

        Description =
            Get-MarkerValue $Text "APP_DESCRIPTION"

        Raw =
            $Text
    }
}

function Assert-ExistingInvariant {
    param(
        [Parameter(Mandatory = $true)]
        [psobject]$State
    )

    foreach (
        $Entry in
        $ExpectedInvariant.GetEnumerator()
    ) {

        $Property =
            $State.PSObject.Properties[
                $Entry.Key
            ]

        if ($null -eq $Property) {
            throw (
                "Existing helper application property missing: " +
                $Entry.Key
            )
        }

        $Actual =
            [string]$Property.Value

        if (
            $Actual -ne
            [string]$Entry.Value
        ) {
            throw (
                "Existing helper application invariant mismatch: " +
                "$($Entry.Key); " +
                "expected=[$($Entry.Value)] " +
                "actual=[$Actual]. " +
                "Refusing broad reconciliation."
            )
        }
    }

    Write-Host `
        "INSTALLER_EXISTING_APP_INVARIANTS=PASS"
}

Write-Host `
    "`n===== MERIDIAN HELPER WEB-APP INSTALLER ====="

Write-Host `
    "INSTALLER_APP=$AppName"

if ($Apply) {
    Write-Host "INSTALLER_MODE=APPLY"
}
else {
    Write-Host "INSTALLER_MODE=DRY_RUN"
}

Write-Host "DESIRED_RECURSE=1"
Write-Host "ARBITRARY_APP_TARGET_SUPPORTED=NO"
Write-Host "USER_ROLE_RESOURCE_MUTATION_IMPLEMENTED=NO"

$ContainerRunning = (
    docker inspect `
        --format '{{.State.Running}}' `
        $ContainerName
).Trim()

if ($ContainerRunning -ne "true") {
    throw "Target IRIS container is not running."
}

$Before =
    Read-HelperApp

if (-not $Before.Exists) {

    Write-Host "INSTALLER_APP_EXISTS=NO"

    if (-not $Apply) {

        Write-Host "INSTALLER_WOULD_CREATE=YES"
        Write-Host "INSTALLER_WOULD_MODIFY=NO"
        Write-Host "INSTALLER_WRITE_PERFORMED=NO"
        Write-Host "INSTALLER_RESULT=WOULD_CREATE_FIXED_HELPER_APP"

        exit 0
    }

    $CreateScript = @(
        'set app="/meridian-control-plane-internal"'
        'kill p'
        'set p("Description")="Meridian Control Plane private runtime helper"'
        'set p("Enabled")=1'
        'set p("NameSpace")="USER"'
        'set p("DispatchClass")="Meridian.ControlPlane.Internal.REST"'
        'set p("Resource")="Meridian_ControlPlane_Internal"'
        'set p("MatchRoles")=":MeridianControlPlaneHelperExecution"'
        'set p("Recurse")=1'
        'set p("CSRFToken")=1'
        'set p("AutheEnabled")=32'
        'set p("UseCookies")=0'
        'set p("CSPZENEnabled")=1'
        'set p("JWTAuthEnabled")=1'
        'set p("InbndWebServicesEnabled")=1'
        'set p("ServeFiles")=0'
        'set p("RedirectEmptyPath")=0'
        'set p("AutoCompile")=0'
        'set p("TraceEnabled")=0'
        'set p("SessionScope")=2'
        'set p("UserCookieScope")=2'
        'set p("CookiePath")="/meridian-control-plane-internal/"'
        'set sc=##class(Security.Applications).Create(app,.p)'
        'write "INSTALL_CREATE_OK="_$SYSTEM.Status.IsOK(sc),!'
        'write "INSTALL_CREATE_STATUS="_sc,!'
        'halt'
    ) -join "`n"

    $CreateText =
        Invoke-IrisSys `
            -Script $CreateScript

    if (
        (
            Get-MarkerValue `
                -Text $CreateText `
                -Name "INSTALL_CREATE_OK"
        ) -ne "1"
    ) {
        throw "Security.Applications.Create failed."
    }

    $AfterCreate =
        Read-HelperApp

    if (-not $AfterCreate.Exists) {
        throw "Helper application absent after Create."
    }

    Assert-ExistingInvariant `
        -State $AfterCreate

    if ($AfterCreate.Recurse -ne "1") {
        throw "Created helper app does not have Recurse=1."
    }

    Write-Host "INSTALLER_WOULD_CREATE=NO"
    Write-Host "INSTALLER_WOULD_MODIFY=NO"
    Write-Host "INSTALLER_WRITE_PERFORMED=YES"
    Write-Host "INSTALLER_WRITE_TYPE=CREATE_APPLICATION"
    Write-Host "INSTALLER_RESULT=CREATED_FIXED_HELPER_APP"

    exit 0
}

Write-Host "INSTALLER_APP_EXISTS=YES"

Assert-ExistingInvariant `
    -State $Before

Write-Host "CURRENT_RECURSE=$($Before.Recurse)"

if ($Before.Recurse -eq "1") {

    Write-Host "INSTALLER_WOULD_CREATE=NO"
    Write-Host "INSTALLER_WOULD_MODIFY=NO"
    Write-Host "INSTALLER_WRITE_PERFORMED=NO"
    Write-Host "INSTALLER_RESULT=ALREADY_CONVERGED"

    exit 0
}

if ($Before.Recurse -ne "0") {
    throw "Unexpected Recurse value. Refusing reconciliation."
}

if (-not $Apply) {

    Write-Host "INSTALLER_WOULD_CREATE=NO"
    Write-Host "INSTALLER_WOULD_MODIFY=YES"
    Write-Host "INSTALLER_WOULD_MODIFY_PROPERTY=Recurse"
    Write-Host "INSTALLER_WOULD_MODIFY_FROM=0"
    Write-Host "INSTALLER_WOULD_MODIFY_TO=1"
    Write-Host "INSTALLER_WRITE_PERFORMED=NO"
    Write-Host "INSTALLER_RESULT=WOULD_REPAIR_RECURSE"

    exit 0
}

$ModifyScript = @(
    'set app="/meridian-control-plane-internal"'
    'kill change'
    'set change("Recurse")=1'
    'set sc=##class(Security.Applications).Modify(app,.change)'
    'write "INSTALL_MODIFY_OK="_$SYSTEM.Status.IsOK(sc),!'
    'write "INSTALL_MODIFY_STATUS="_sc,!'
    'halt'
) -join "`n"

$ModifyText =
    Invoke-IrisSys `
        -Script $ModifyScript

if (
    (
        Get-MarkerValue `
            -Text $ModifyText `
            -Name "INSTALL_MODIFY_OK"
    ) -ne "1"
) {
    throw "Security.Applications.Modify failed."
}

$AfterModify =
    Read-HelperApp

if (-not $AfterModify.Exists) {
    throw "Helper application disappeared after Modify."
}

Assert-ExistingInvariant `
    -State $AfterModify

if ($AfterModify.Recurse -ne "1") {
    throw "Recurse repair did not converge to 1."
}

Write-Host "INSTALLER_WOULD_CREATE=NO"
Write-Host "INSTALLER_WOULD_MODIFY=NO"
Write-Host "INSTALLER_WRITE_PERFORMED=YES"
Write-Host "INSTALLER_WRITE_TYPE=MODIFY_RECURSE_ONLY"
Write-Host "INSTALLER_RESULT=REPAIRED_RECURSE"