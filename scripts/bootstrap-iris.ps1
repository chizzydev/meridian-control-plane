param(
    [string]$ContainerName = "iris-cert",
    [switch]$Apply
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Repo = Split-Path -Parent $PSScriptRoot
$HelperInstaller = Join-Path $PSScriptRoot "install-iris-helper-web-app.ps1"
$PinnedImage = "intersystems/iris-community@sha256:d4331089a4d19aafa867c26b343eb2b8486cf112ef1522132761e6327691377e"
$ExpectedSourceHashes = [ordered]@{
    "iris/Meridian.ControlPlane.Internal.REST.cls" = "FD400F1F6CC3DF778C8A34E7BEF7FC55ADC3C060AD8FD61E544B3AE085025CC1"
    "iris/Meridian.ControlPlane.History.REST.cls" = "B99BDE892570E51F3A1CA8BA14A77EF2E4EE13E9F9E7012E2875573C8B86962D"
    "iris/Meridian.Lab.Orders.REST.cls" = "F62A0676B65D5D4648996D5F39A76E5A23E1CDAD915F4918073C54A1C6F01999"
    "iris/Meridian.API.spec.cls" = "7787320DBA20C9B996C2D3B7E4E6C19556338435EE78832724CAB454A3CB2E16"
    "iris/Meridian.API.impl.cls" = "41D04211838375D34D99F51329E492507B731D33A781F1BFF8DFB0C5A0B73B12"
}

function Native-Text {
    param([Parameter(Mandatory=$true)]$Result)
    return (($Result.Output | ForEach-Object { [string]$_ }) -join "`n")
}

function Invoke-Iris {
    param([Parameter(Mandatory=$true)][string]$Script)
    $Old = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $Output = @($Script | docker exec -i $ContainerName iris session IRIS -U %SYS 2>&1)
        $Exit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $Old }
    foreach ($Line in $Output) { Write-Host $Line }
    return [pscustomobject]@{ ExitCode=$Exit; Output=$Output }
}

function Assert-IrisClean {
    param([Parameter(Mandatory=$true)]$Result,[Parameter(Mandatory=$true)][string]$Label)
    if ($Result.ExitCode -ne 0) { throw "$Label native session failed." }
    $Text = Native-Text -Result $Result
    foreach ($Fatal in @("<SYNTAX>","<COMMAND>","<UNDEFINED>","<PROTECT>","<METHOD DOES NOT EXIST>","<CLASS DOES NOT EXIST>")) {
        if ($Text.IndexOf($Fatal,[System.StringComparison]::OrdinalIgnoreCase) -ge 0) { throw "$Label emitted $Fatal" }
    }
    Write-Host "$Label=PASS"
}

function Require-Marker {
    param([string]$Text,[string]$Marker,[string]$Label)
    if ($Text.IndexOf($Marker,[System.StringComparison]::Ordinal) -lt 0) { throw "$Label missing: $Marker" }
}

function Test-ExactLine {
    param([string]$Text,[string]$Line)
    $Pattern = "(?m)^" + [regex]::Escape($Line) + "$"
    return [regex]::IsMatch($Text,$Pattern)
}

function Require-ExactLine {
    param([string]$Text,[string]$Line,[string]$Label)
    if (-not (Test-ExactLine -Text $Text -Line $Line)) { throw "$Label missing exact line: $Line" }
}

function Assert-Container {
    $Inspect = @(docker inspect --format "{{.State.Running}}|{{.State.Health.Status}}|{{.Config.Image}}" $ContainerName 2>&1)
    if ($LASTEXITCODE -ne 0 -or $Inspect.Count -ne 1) { throw "B1B2 container inspection failed." }
    $State = ([string]$Inspect[0]).Trim()
    Write-Host "MERIDIAN_BOOTSTRAP_CONTAINER_STATE=$State"
    if (-not $State.StartsWith("true|healthy|",[System.StringComparison]::Ordinal)) { throw "B1B2 target container is not healthy." }
    if (-not $State.EndsWith($PinnedImage,[System.StringComparison]::Ordinal)) { throw "B1B2 target image is not the frozen IRIS 2026.2 image." }
    Write-Host "MERIDIAN_BOOTSTRAP_PINNED_CONTAINER=PASS"
}

function Assert-TrackedSources {
    foreach ($Entry in $ExpectedSourceHashes.GetEnumerator()) {
        $Path = Join-Path $Repo $Entry.Key
        if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Missing tracked IRIS source: $($Entry.Key)" }
        $Hash = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
        Write-Host "MERIDIAN_BOOTSTRAP_SOURCE|$($Entry.Key)|SHA256=$Hash"
        if ($Hash -ne $Entry.Value) { throw "Tracked IRIS source hash drift: $($Entry.Key)" }
    }
    $InstallerHash = (Get-FileHash -LiteralPath $HelperInstaller -Algorithm SHA256).Hash
    Write-Host "MERIDIAN_BOOTSTRAP_HELPER_INSTALLER_SHA256=$InstallerHash"
    if ($InstallerHash -ne "DCCF7B3302F5E0CC42ECC256471214D6EA602880BF227D843D37FAF7308AE5D2") { throw "Helper installer hash drift." }
    Write-Host "MERIDIAN_BOOTSTRAP_TRACKED_SOURCES=PASS"
}

$StateScript = @'
zn "%SYS"
write "B1B2_ZVERSION="_$zversion,!
kill role
set roleName="MeridianViewer"
set sc=##class(Security.Roles).Get(roleName,.role)
write "B1B2_ROLE|"_roleName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|RESOURCES="_$get(role("Resources"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|GRANTED="_$get(role("GrantedRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|ESCALATION="_$get(role("EscalationOnly"),"__MISSING__"),!
kill role
set roleName="MeridianJobRunner"
set sc=##class(Security.Roles).Get(roleName,.role)
write "B1B2_ROLE|"_roleName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|RESOURCES="_$get(role("Resources"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|GRANTED="_$get(role("GrantedRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|ESCALATION="_$get(role("EscalationOnly"),"__MISSING__"),!
kill role
set roleName="MeridianEmployee"
set sc=##class(Security.Roles).Get(roleName,.role)
write "B1B2_ROLE|"_roleName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|RESOURCES="_$get(role("Resources"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|GRANTED="_$get(role("GrantedRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|ESCALATION="_$get(role("EscalationOnly"),"__MISSING__"),!
kill role
set roleName="MeridianOperator"
set sc=##class(Security.Roles).Get(roleName,.role)
write "B1B2_ROLE|"_roleName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|RESOURCES="_$get(role("Resources"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|GRANTED="_$get(role("GrantedRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|ESCALATION="_$get(role("EscalationOnly"),"__MISSING__"),!
kill role
set roleName="MeridianSupervisor"
set sc=##class(Security.Roles).Get(roleName,.role)
write "B1B2_ROLE|"_roleName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|RESOURCES="_$get(role("Resources"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|GRANTED="_$get(role("GrantedRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|ESCALATION="_$get(role("EscalationOnly"),"__MISSING__"),!
kill role
set roleName="MeridianControlPlaneRuntime"
set sc=##class(Security.Roles).Get(roleName,.role)
write "B1B2_ROLE|"_roleName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|RESOURCES="_$get(role("Resources"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|GRANTED="_$get(role("GrantedRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|ESCALATION="_$get(role("EscalationOnly"),"__MISSING__"),!
kill role
set roleName="MeridianControlPlaneHelperExecution"
set sc=##class(Security.Roles).Get(roleName,.role)
write "B1B2_ROLE|"_roleName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|RESOURCES="_$get(role("Resources"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|GRANTED="_$get(role("GrantedRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|ESCALATION="_$get(role("EscalationOnly"),"__MISSING__"),!
kill role
set roleName="MeridianReceiptHistoryWriter"
set sc=##class(Security.Roles).Get(roleName,.role)
write "B1B2_ROLE|"_roleName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|RESOURCES="_$get(role("Resources"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|GRANTED="_$get(role("GrantedRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|ESCALATION="_$get(role("EscalationOnly"),"__MISSING__"),!
kill role
set roleName="MeridianSecurityMetadataReader"
set sc=##class(Security.Roles).Get(roleName,.role)
write "B1B2_ROLE|"_roleName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|RESOURCES="_$get(role("Resources"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|GRANTED="_$get(role("GrantedRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|ESCALATION="_$get(role("EscalationOnly"),"__MISSING__"),!
kill role
set roleName="MeridianTaskActionExecutor"
set sc=##class(Security.Roles).Get(roleName,.role)
write "B1B2_ROLE|"_roleName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|RESOURCES="_$get(role("Resources"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|GRANTED="_$get(role("GrantedRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|ESCALATION="_$get(role("EscalationOnly"),"__MISSING__"),!
kill role
set roleName="MeridianProcessActionExecutor"
set sc=##class(Security.Roles).Get(roleName,.role)
write "B1B2_ROLE|"_roleName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|RESOURCES="_$get(role("Resources"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|GRANTED="_$get(role("GrantedRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|ESCALATION="_$get(role("EscalationOnly"),"__MISSING__"),!
kill role
set roleName="MeridianTaskMetadataReader"
set sc=##class(Security.Roles).Get(roleName,.role)
write "B1B2_ROLE|"_roleName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|RESOURCES="_$get(role("Resources"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|GRANTED="_$get(role("GrantedRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|ESCALATION="_$get(role("EscalationOnly"),"__MISSING__"),!
kill role
set roleName="MeridianSystemMetadataReader"
set sc=##class(Security.Roles).Get(roleName,.role)
write "B1B2_ROLE|"_roleName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|RESOURCES="_$get(role("Resources"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|GRANTED="_$get(role("GrantedRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_ROLE|"_roleName_"|ESCALATION="_$get(role("EscalationOnly"),"__MISSING__"),!
kill user
set userName="maya.patel"
set sc=##class(Security.Users).Get(userName,.user)
write "B1B2_USER|"_userName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_USER|"_userName_"|ENABLED="_$get(user("Enabled"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_USER|"_userName_"|FULLNAME="_$get(user("FullName"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_USER|"_userName_"|NAMESPACE="_$get(user("NameSpace"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_USER|"_userName_"|ROLES="_$get(user("Roles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_USER|"_userName_"|ESCALATION="_$get(user("EscalationRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_USER|"_userName_"|ACCOUNT_NEVER_EXPIRES="_$get(user("AccountNeverExpires"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_USER|"_userName_"|PASSWORD_NEVER_EXPIRES="_$get(user("PasswordNeverExpires"),"__MISSING__"),!
kill user
set userName="meridian.runtime"
set sc=##class(Security.Users).Get(userName,.user)
write "B1B2_USER|"_userName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_USER|"_userName_"|ENABLED="_$get(user("Enabled"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_USER|"_userName_"|FULLNAME="_$get(user("FullName"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_USER|"_userName_"|NAMESPACE="_$get(user("NameSpace"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_USER|"_userName_"|ROLES="_$get(user("Roles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_USER|"_userName_"|ESCALATION="_$get(user("EscalationRoles"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_USER|"_userName_"|ACCOUNT_NEVER_EXPIRES="_$get(user("AccountNeverExpires"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_USER|"_userName_"|PASSWORD_NEVER_EXPIRES="_$get(user("PasswordNeverExpires"),"__MISSING__"),!
kill resource
set resourceName="Meridian_Portal"
set sc=##class(Security.Resources).Get(resourceName,.resource)
write "B1B2_RESOURCE|"_resourceName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_RESOURCE|"_resourceName_"|DESCRIPTION="_$get(resource("Description"),""),!
kill resource
set resourceName="Meridian_Admin"
set sc=##class(Security.Resources).Get(resourceName,.resource)
write "B1B2_RESOURCE|"_resourceName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_RESOURCE|"_resourceName_"|DESCRIPTION="_$get(resource("Description"),""),!
kill resource
set resourceName="Meridian_Orders"
set sc=##class(Security.Resources).Get(resourceName,.resource)
write "B1B2_RESOURCE|"_resourceName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_RESOURCE|"_resourceName_"|DESCRIPTION="_$get(resource("Description"),""),!
kill resource
set resourceName="Meridian_Jobs"
set sc=##class(Security.Resources).Get(resourceName,.resource)
write "B1B2_RESOURCE|"_resourceName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_RESOURCE|"_resourceName_"|DESCRIPTION="_$get(resource("Description"),""),!
kill resource
set resourceName="Meridian_ControlPlane_Internal"
set sc=##class(Security.Resources).Get(resourceName,.resource)
write "B1B2_RESOURCE|"_resourceName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_RESOURCE|"_resourceName_"|DESCRIPTION="_$get(resource("Description"),""),!
kill app
set appName="/meridian/api"
set sc=##class(Security.Applications).Get(appName,.app)
write "B1B2_APP|"_appName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|ENABLED="_$get(app("Enabled"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|NAMESPACE="_$get(app("NameSpace"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|DISPATCH="_$get(app("DispatchClass"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|RESOURCE="_$get(app("Resource"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|MATCHROLES="_$get(app("MatchRoles"),""),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|RECURSE="_$get(app("Recurse"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|AUTH="_$get(app("AutheEnabled"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|JWT="_$get(app("JWTAuthEnabled"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|SERVEFILES="_$get(app("ServeFiles"),"__MISSING__"),!
kill app
set appName="/meridian/admin"
set sc=##class(Security.Applications).Get(appName,.app)
write "B1B2_APP|"_appName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|ENABLED="_$get(app("Enabled"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|NAMESPACE="_$get(app("NameSpace"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|DISPATCH="_$get(app("DispatchClass"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|RESOURCE="_$get(app("Resource"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|MATCHROLES="_$get(app("MatchRoles"),""),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|RECURSE="_$get(app("Recurse"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|AUTH="_$get(app("AutheEnabled"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|JWT="_$get(app("JWTAuthEnabled"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|SERVEFILES="_$get(app("ServeFiles"),"__MISSING__"),!
kill app
set appName="/meridian-control-plane-internal"
set sc=##class(Security.Applications).Get(appName,.app)
write "B1B2_APP|"_appName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|ENABLED="_$get(app("Enabled"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|NAMESPACE="_$get(app("NameSpace"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|DISPATCH="_$get(app("DispatchClass"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|RESOURCE="_$get(app("Resource"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|MATCHROLES="_$get(app("MatchRoles"),""),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|RECURSE="_$get(app("Recurse"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|AUTH="_$get(app("AutheEnabled"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|JWT="_$get(app("JWTAuthEnabled"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|SERVEFILES="_$get(app("ServeFiles"),"__MISSING__"),!
kill app
set appName="/meridian-control-plane-history"
set sc=##class(Security.Applications).Get(appName,.app)
write "B1B2_APP|"_appName_"|GET_OK="_$SYSTEM.Status.IsOK(sc),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|ENABLED="_$get(app("Enabled"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|NAMESPACE="_$get(app("NameSpace"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|DISPATCH="_$get(app("DispatchClass"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|RESOURCE="_$get(app("Resource"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|MATCHROLES="_$get(app("MatchRoles"),""),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|RECURSE="_$get(app("Recurse"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|AUTH="_$get(app("AutheEnabled"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|JWT="_$get(app("JWTAuthEnabled"),"__MISSING__"),!
if $SYSTEM.Status.IsOK(sc) write "B1B2_APP|"_appName_"|SERVEFILES="_$get(app("ServeFiles"),"__MISSING__"),!
kill runtime
set runtimeSc=##class(Security.Users).Get("meridian.runtime",.runtime)
set runtimeExists=$SYSTEM.Status.IsOK(runtimeSc)
write "B1B2_RUNTIME_EXISTS="_runtimeExists,!
if runtimeExists write "B1B2_SQL|ProcessQuery|SELECT="_$SYSTEM.SQL.Security.CheckPrivilege("meridian.runtime",1,"%SYS.ProcessQuery","s","%SYS"),!
if runtimeExists write "B1B2_SQL|ProcessQuery|INSERT="_$SYSTEM.SQL.Security.CheckPrivilege("meridian.runtime",1,"%SYS.ProcessQuery","i","%SYS"),!
if runtimeExists write "B1B2_SQL|SysLogTable|SELECT="_$SYSTEM.SQL.Security.CheckPrivilege("meridian.runtime",1,"%Library.SysLogTable","s","%SYS"),!
if runtimeExists write "B1B2_SQL|SysLogTable|INSERT="_$SYSTEM.SQL.Security.CheckPrivilege("meridian.runtime",1,"%Library.SysLogTable","i","%SYS"),!
if runtimeExists write "B1B2_SQL|SysLogTable|UPDATE="_$SYSTEM.SQL.Security.CheckPrivilege("meridian.runtime",1,"%Library.SysLogTable","u","%SYS"),!
if runtimeExists write "B1B2_SQL|SysLogTable|DELETE="_$SYSTEM.SQL.Security.CheckPrivilege("meridian.runtime",1,"%Library.SysLogTable","d","%SYS"),!
if 'runtimeExists write "B1B2_SQL|ProcessQuery|SELECT=0",!
if 'runtimeExists write "B1B2_SQL|ProcessQuery|INSERT=0",!
if 'runtimeExists write "B1B2_SQL|SysLogTable|SELECT=0",!
if 'runtimeExists write "B1B2_SQL|SysLogTable|INSERT=0",!
if 'runtimeExists write "B1B2_SQL|SysLogTable|UPDATE=0",!
if 'runtimeExists write "B1B2_SQL|SysLogTable|DELETE=0",!
if runtimeExists write "B1B2_RUNTIME|ADMIN_TASK="_$SYSTEM.Security.CheckUserPermission("meridian.runtime","%Admin_Task","USE"),!
if runtimeExists write "B1B2_RUNTIME|ADMIN_OPERATE="_$SYSTEM.Security.CheckUserPermission("meridian.runtime","%Admin_Operate","USE"),!
if runtimeExists write "B1B2_RUNTIME|ADMIN_MANAGE="_$SYSTEM.Security.CheckUserPermission("meridian.runtime","%Admin_Manage","USE"),!
if runtimeExists write "B1B2_RUNTIME|ADMIN_JOURNAL="_$SYSTEM.Security.CheckUserPermission("meridian.runtime","%Admin_Journal","USE"),!
if runtimeExists write "B1B2_RUNTIME|DB_USER_WRITE="_$SYSTEM.Security.CheckUserPermission("meridian.runtime","%DB_USER","WRITE"),!
if 'runtimeExists write "B1B2_RUNTIME|ADMIN_TASK=0",!
if 'runtimeExists write "B1B2_RUNTIME|ADMIN_OPERATE=0",!
if 'runtimeExists write "B1B2_RUNTIME|ADMIN_MANAGE=0",!
if 'runtimeExists write "B1B2_RUNTIME|ADMIN_JOURNAL=0",!
if 'runtimeExists write "B1B2_RUNTIME|DB_USER_WRITE=0",!
zn "USER"
write "B1B2_CLASS_NAMESPACE="_$namespace,!
write "B1B2_CLASS|Meridian.ControlPlane.Internal.REST|EXISTS="_##class(%Dictionary.CompiledClass).%ExistsId("Meridian.ControlPlane.Internal.REST"),!
write "B1B2_CLASS|Meridian.ControlPlane.History.REST|EXISTS="_##class(%Dictionary.CompiledClass).%ExistsId("Meridian.ControlPlane.History.REST"),!
write "B1B2_CLASS|Meridian.Lab.Orders.REST|EXISTS="_##class(%Dictionary.CompiledClass).%ExistsId("Meridian.Lab.Orders.REST"),!
write "B1B2_CLASS|Meridian.API.spec|EXISTS="_##class(%Dictionary.CompiledClass).%ExistsId("Meridian.API.spec"),!
write "B1B2_CLASS|Meridian.API.impl|EXISTS="_##class(%Dictionary.CompiledClass).%ExistsId("Meridian.API.impl"),!
write "B1B2_CLASS|Meridian.API.disp|EXISTS="_##class(%Dictionary.CompiledClass).%ExistsId("Meridian.API.disp"),!
halt
'@

$ExpectedConvergedMarkers = @(
        "B1B2_ROLE|MeridianViewer|GET_OK=1",
        "B1B2_ROLE|MeridianViewer|RESOURCES=%DB_USER:R,Meridian_Orders:R,Meridian_Portal:U",
        "B1B2_ROLE|MeridianViewer|GRANTED=",
        "B1B2_ROLE|MeridianViewer|ESCALATION=0",
        "B1B2_ROLE|MeridianJobRunner|GET_OK=1",
        "B1B2_ROLE|MeridianJobRunner|RESOURCES=Meridian_Jobs:U",
        "B1B2_ROLE|MeridianJobRunner|GRANTED=",
        "B1B2_ROLE|MeridianJobRunner|ESCALATION=0",
        "B1B2_ROLE|MeridianEmployee|GET_OK=1",
        "B1B2_ROLE|MeridianEmployee|RESOURCES=",
        "B1B2_ROLE|MeridianEmployee|GRANTED=MeridianViewer",
        "B1B2_ROLE|MeridianEmployee|ESCALATION=0",
        "B1B2_ROLE|MeridianOperator|GET_OK=1",
        "B1B2_ROLE|MeridianOperator|RESOURCES=Meridian_Orders:W",
        "B1B2_ROLE|MeridianOperator|GRANTED=MeridianJobRunner",
        "B1B2_ROLE|MeridianOperator|ESCALATION=0",
        "B1B2_ROLE|MeridianSupervisor|GET_OK=1",
        "B1B2_ROLE|MeridianSupervisor|RESOURCES=%Admin_Task:U,Meridian_Admin:U",
        "B1B2_ROLE|MeridianSupervisor|GRANTED=MeridianOperator",
        "B1B2_ROLE|MeridianSupervisor|ESCALATION=0",
        "B1B2_ROLE|MeridianControlPlaneRuntime|GET_OK=1",
        "B1B2_ROLE|MeridianControlPlaneRuntime|RESOURCES=%Admin_Secure:U,%DB_IRISSYS:R,Meridian_ControlPlane_Internal:U",
        "B1B2_ROLE|MeridianControlPlaneRuntime|GRANTED=",
        "B1B2_ROLE|MeridianControlPlaneRuntime|ESCALATION=0",
        "B1B2_ROLE|MeridianControlPlaneHelperExecution|GET_OK=1",
        "B1B2_ROLE|MeridianControlPlaneHelperExecution|RESOURCES=%DB_USER:R",
        "B1B2_ROLE|MeridianControlPlaneHelperExecution|GRANTED=",
        "B1B2_ROLE|MeridianControlPlaneHelperExecution|ESCALATION=0",
        "B1B2_ROLE|MeridianReceiptHistoryWriter|GET_OK=1",
        "B1B2_ROLE|MeridianReceiptHistoryWriter|RESOURCES=%DB_USER:RW",
        "B1B2_ROLE|MeridianReceiptHistoryWriter|GRANTED=",
        "B1B2_ROLE|MeridianReceiptHistoryWriter|ESCALATION=0",
        "B1B2_ROLE|MeridianSecurityMetadataReader|GET_OK=1",
        "B1B2_ROLE|MeridianSecurityMetadataReader|RESOURCES=%Admin_OAuth2_Client:U,%Admin_OAuth2_Registration:U,%Admin_Secure:U,%Admin_Wallet:U,%DB_IRISSYS:R",
        "B1B2_ROLE|MeridianSecurityMetadataReader|GRANTED=",
        "B1B2_ROLE|MeridianSecurityMetadataReader|ESCALATION=1",
        "B1B2_ROLE|MeridianTaskActionExecutor|GET_OK=1",
        "B1B2_ROLE|MeridianTaskActionExecutor|RESOURCES=%Admin_Task:U",
        "B1B2_ROLE|MeridianTaskActionExecutor|GRANTED=",
        "B1B2_ROLE|MeridianTaskActionExecutor|ESCALATION=1",
        "B1B2_ROLE|MeridianProcessActionExecutor|GET_OK=1",
        "B1B2_ROLE|MeridianProcessActionExecutor|RESOURCES=%Admin_Operate:U,%DB_IRISSYS:RW",
        "B1B2_ROLE|MeridianProcessActionExecutor|GRANTED=",
        "B1B2_ROLE|MeridianProcessActionExecutor|ESCALATION=1",
        "B1B2_ROLE|MeridianTaskMetadataReader|GET_OK=1",
        "B1B2_ROLE|MeridianTaskMetadataReader|RESOURCES=%Admin_Task:U",
        "B1B2_ROLE|MeridianTaskMetadataReader|GRANTED=",
        "B1B2_ROLE|MeridianTaskMetadataReader|ESCALATION=1",
        "B1B2_ROLE|MeridianSystemMetadataReader|GET_OK=1",
        "B1B2_ROLE|MeridianSystemMetadataReader|RESOURCES=%Admin_Operate:U,%DB_IRISSYS:R",
        "B1B2_ROLE|MeridianSystemMetadataReader|GRANTED=",
        "B1B2_ROLE|MeridianSystemMetadataReader|ESCALATION=1",
        "B1B2_USER|maya.patel|GET_OK=1",
        "B1B2_USER|maya.patel|ENABLED=1",
        "B1B2_USER|maya.patel|FULLNAME=Maya Patel",
        "B1B2_USER|maya.patel|NAMESPACE=USER",
        "B1B2_USER|maya.patel|ROLES=MeridianEmployee",
        "B1B2_USER|maya.patel|ESCALATION=",
        "B1B2_USER|maya.patel|ACCOUNT_NEVER_EXPIRES=1",
        "B1B2_USER|maya.patel|PASSWORD_NEVER_EXPIRES=1",
        "B1B2_USER|meridian.runtime|GET_OK=1",
        "B1B2_USER|meridian.runtime|ENABLED=1",
        "B1B2_USER|meridian.runtime|FULLNAME=Meridian Control Plane Runtime",
        "B1B2_USER|meridian.runtime|NAMESPACE=%SYS",
        "B1B2_USER|meridian.runtime|ROLES=MeridianControlPlaneRuntime",
        "B1B2_USER|meridian.runtime|ESCALATION=MeridianProcessActionExecutor,MeridianSecurityMetadataReader,MeridianSystemMetadataReader,MeridianTaskActionExecutor,MeridianTaskMetadataReader",
        "B1B2_USER|meridian.runtime|ACCOUNT_NEVER_EXPIRES=1",
        "B1B2_USER|meridian.runtime|PASSWORD_NEVER_EXPIRES=1",
        "B1B2_RESOURCE|Meridian_Portal|GET_OK=1",
        "B1B2_RESOURCE|Meridian_Portal|DESCRIPTION=Meridian Operations portal access",
        "B1B2_RESOURCE|Meridian_Admin|GET_OK=1",
        "B1B2_RESOURCE|Meridian_Admin|DESCRIPTION=Meridian Operations administrative access",
        "B1B2_RESOURCE|Meridian_Orders|GET_OK=1",
        "B1B2_RESOURCE|Meridian_Orders|DESCRIPTION=Meridian Operations order access",
        "B1B2_RESOURCE|Meridian_Jobs|GET_OK=1",
        "B1B2_RESOURCE|Meridian_Jobs|DESCRIPTION=Meridian Operations job execution access",
        "B1B2_RESOURCE|Meridian_ControlPlane_Internal|GET_OK=1",
        "B1B2_RESOURCE|Meridian_ControlPlane_Internal|DESCRIPTION=Meridian Control Plane private runtime adapter",
        "B1B2_APP|/meridian/api|GET_OK=1",
        "B1B2_APP|/meridian/api|ENABLED=1",
        "B1B2_APP|/meridian/api|NAMESPACE=USER",
        "B1B2_APP|/meridian/api|DISPATCH=Meridian.API.disp",
        "B1B2_APP|/meridian/api|RESOURCE=Meridian_Portal",
        "B1B2_APP|/meridian/api|MATCHROLES=",
        "B1B2_APP|/meridian/api|RECURSE=1",
        "B1B2_APP|/meridian/api|AUTH=32",
        "B1B2_APP|/meridian/api|JWT=0",
        "B1B2_APP|/meridian/api|SERVEFILES=1",
        "B1B2_APP|/meridian/admin|GET_OK=1",
        "B1B2_APP|/meridian/admin|ENABLED=1",
        "B1B2_APP|/meridian/admin|NAMESPACE=USER",
        "B1B2_APP|/meridian/admin|DISPATCH=",
        "B1B2_APP|/meridian/admin|RESOURCE=Meridian_Admin",
        "B1B2_APP|/meridian/admin|MATCHROLES=",
        "B1B2_APP|/meridian/admin|RECURSE=1",
        "B1B2_APP|/meridian/admin|AUTH=32",
        "B1B2_APP|/meridian/admin|JWT=0",
        "B1B2_APP|/meridian/admin|SERVEFILES=1",
        "B1B2_APP|/meridian-control-plane-internal|GET_OK=1",
        "B1B2_APP|/meridian-control-plane-internal|ENABLED=1",
        "B1B2_APP|/meridian-control-plane-internal|NAMESPACE=USER",
        "B1B2_APP|/meridian-control-plane-internal|DISPATCH=Meridian.ControlPlane.Internal.REST",
        "B1B2_APP|/meridian-control-plane-internal|RESOURCE=Meridian_ControlPlane_Internal",
        "B1B2_APP|/meridian-control-plane-internal|MATCHROLES=:MeridianControlPlaneHelperExecution",
        "B1B2_APP|/meridian-control-plane-internal|RECURSE=1",
        "B1B2_APP|/meridian-control-plane-internal|AUTH=32",
        "B1B2_APP|/meridian-control-plane-internal|JWT=1",
        "B1B2_APP|/meridian-control-plane-internal|SERVEFILES=0",
        "B1B2_APP|/meridian-control-plane-history|GET_OK=1",
        "B1B2_APP|/meridian-control-plane-history|ENABLED=1",
        "B1B2_APP|/meridian-control-plane-history|NAMESPACE=USER",
        "B1B2_APP|/meridian-control-plane-history|DISPATCH=Meridian.ControlPlane.History.REST",
        "B1B2_APP|/meridian-control-plane-history|RESOURCE=Meridian_ControlPlane_Internal",
        "B1B2_APP|/meridian-control-plane-history|MATCHROLES=:MeridianControlPlaneHelperExecution:MeridianReceiptHistoryWriter",
        "B1B2_APP|/meridian-control-plane-history|RECURSE=1",
        "B1B2_APP|/meridian-control-plane-history|AUTH=32",
        "B1B2_APP|/meridian-control-plane-history|JWT=1",
        "B1B2_APP|/meridian-control-plane-history|SERVEFILES=0",
        "B1B2_SQL|ProcessQuery|SELECT=1",
        "B1B2_SQL|ProcessQuery|INSERT=0",
        "B1B2_SQL|SysLogTable|SELECT=1",
        "B1B2_SQL|SysLogTable|INSERT=0",
        "B1B2_SQL|SysLogTable|UPDATE=0",
        "B1B2_SQL|SysLogTable|DELETE=0",
        "B1B2_RUNTIME|ADMIN_TASK=0",
        "B1B2_RUNTIME|ADMIN_OPERATE=0",
        "B1B2_RUNTIME|ADMIN_MANAGE=0",
        "B1B2_RUNTIME|ADMIN_JOURNAL=0",
        "B1B2_RUNTIME|DB_USER_WRITE=0",
        "B1B2_CLASS_NAMESPACE=USER",
        "B1B2_CLASS|Meridian.ControlPlane.Internal.REST|EXISTS=1",
        "B1B2_CLASS|Meridian.ControlPlane.History.REST|EXISTS=1",
        "B1B2_CLASS|Meridian.Lab.Orders.REST|EXISTS=1",
        "B1B2_CLASS|Meridian.API.spec|EXISTS=1",
        "B1B2_CLASS|Meridian.API.impl|EXISTS=1",
        "B1B2_CLASS|Meridian.API.disp|EXISTS=1"
    )

function Get-State {
    $Result = Invoke-Iris -Script $StateScript
    Assert-IrisClean -Result $Result -Label "MERIDIAN_BOOTSTRAP_STATE_CENSUS"
    return (Native-Text -Result $Result)
}

function Assert-ExistingObjectExact {
    param([string]$Text,[string]$ExistsMarker,[string[]]$ExpectedMarkers)
    if (Test-ExactLine -Text $Text -Line $ExistsMarker) {
        foreach ($Marker in $ExpectedMarkers) {
            if (-not (Test-ExactLine -Text $Text -Line $Marker)) {
                throw "B1B2 refused existing-object drift. Sentinel=$ExistsMarker MissingExactLine=$Marker"
            }
        }
    }
}

function Assert-NoUnexpectedDrift {
    param([string]$Text)
    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_ROLE|MeridianViewer|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_ROLE|MeridianViewer|RESOURCES=%DB_USER:R,Meridian_Orders:R,Meridian_Portal:U",
            "B1B2_ROLE|MeridianViewer|GRANTED=",
            "B1B2_ROLE|MeridianViewer|ESCALATION=0"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_ROLE|MeridianJobRunner|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_ROLE|MeridianJobRunner|RESOURCES=Meridian_Jobs:U",
            "B1B2_ROLE|MeridianJobRunner|GRANTED=",
            "B1B2_ROLE|MeridianJobRunner|ESCALATION=0"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_ROLE|MeridianEmployee|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_ROLE|MeridianEmployee|RESOURCES=",
            "B1B2_ROLE|MeridianEmployee|GRANTED=MeridianViewer",
            "B1B2_ROLE|MeridianEmployee|ESCALATION=0"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_ROLE|MeridianOperator|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_ROLE|MeridianOperator|RESOURCES=Meridian_Orders:W",
            "B1B2_ROLE|MeridianOperator|GRANTED=MeridianJobRunner",
            "B1B2_ROLE|MeridianOperator|ESCALATION=0"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_ROLE|MeridianSupervisor|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_ROLE|MeridianSupervisor|RESOURCES=%Admin_Task:U,Meridian_Admin:U",
            "B1B2_ROLE|MeridianSupervisor|GRANTED=MeridianOperator",
            "B1B2_ROLE|MeridianSupervisor|ESCALATION=0"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_ROLE|MeridianControlPlaneRuntime|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_ROLE|MeridianControlPlaneRuntime|RESOURCES=%Admin_Secure:U,%DB_IRISSYS:R,Meridian_ControlPlane_Internal:U",
            "B1B2_ROLE|MeridianControlPlaneRuntime|GRANTED=",
            "B1B2_ROLE|MeridianControlPlaneRuntime|ESCALATION=0"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_ROLE|MeridianControlPlaneHelperExecution|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_ROLE|MeridianControlPlaneHelperExecution|RESOURCES=%DB_USER:R",
            "B1B2_ROLE|MeridianControlPlaneHelperExecution|GRANTED=",
            "B1B2_ROLE|MeridianControlPlaneHelperExecution|ESCALATION=0"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_ROLE|MeridianReceiptHistoryWriter|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_ROLE|MeridianReceiptHistoryWriter|RESOURCES=%DB_USER:RW",
            "B1B2_ROLE|MeridianReceiptHistoryWriter|GRANTED=",
            "B1B2_ROLE|MeridianReceiptHistoryWriter|ESCALATION=0"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_ROLE|MeridianSecurityMetadataReader|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_ROLE|MeridianSecurityMetadataReader|RESOURCES=%Admin_OAuth2_Client:U,%Admin_OAuth2_Registration:U,%Admin_Secure:U,%Admin_Wallet:U,%DB_IRISSYS:R",
            "B1B2_ROLE|MeridianSecurityMetadataReader|GRANTED=",
            "B1B2_ROLE|MeridianSecurityMetadataReader|ESCALATION=1"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_ROLE|MeridianTaskActionExecutor|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_ROLE|MeridianTaskActionExecutor|RESOURCES=%Admin_Task:U",
            "B1B2_ROLE|MeridianTaskActionExecutor|GRANTED=",
            "B1B2_ROLE|MeridianTaskActionExecutor|ESCALATION=1"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_ROLE|MeridianProcessActionExecutor|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_ROLE|MeridianProcessActionExecutor|RESOURCES=%Admin_Operate:U,%DB_IRISSYS:RW",
            "B1B2_ROLE|MeridianProcessActionExecutor|GRANTED=",
            "B1B2_ROLE|MeridianProcessActionExecutor|ESCALATION=1"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_ROLE|MeridianTaskMetadataReader|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_ROLE|MeridianTaskMetadataReader|RESOURCES=%Admin_Task:U",
            "B1B2_ROLE|MeridianTaskMetadataReader|GRANTED=",
            "B1B2_ROLE|MeridianTaskMetadataReader|ESCALATION=1"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_ROLE|MeridianSystemMetadataReader|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_ROLE|MeridianSystemMetadataReader|RESOURCES=%Admin_Operate:U,%DB_IRISSYS:R",
            "B1B2_ROLE|MeridianSystemMetadataReader|GRANTED=",
            "B1B2_ROLE|MeridianSystemMetadataReader|ESCALATION=1"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_USER|maya.patel|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_USER|maya.patel|ENABLED=1",
            "B1B2_USER|maya.patel|FULLNAME=Maya Patel",
            "B1B2_USER|maya.patel|NAMESPACE=USER",
            "B1B2_USER|maya.patel|ROLES=MeridianEmployee",
            "B1B2_USER|maya.patel|ESCALATION=",
            "B1B2_USER|maya.patel|ACCOUNT_NEVER_EXPIRES=1",
            "B1B2_USER|maya.patel|PASSWORD_NEVER_EXPIRES=1"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_USER|meridian.runtime|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_USER|meridian.runtime|ENABLED=1",
            "B1B2_USER|meridian.runtime|FULLNAME=Meridian Control Plane Runtime",
            "B1B2_USER|meridian.runtime|NAMESPACE=%SYS",
            "B1B2_USER|meridian.runtime|ROLES=MeridianControlPlaneRuntime",
            "B1B2_USER|meridian.runtime|ESCALATION=MeridianProcessActionExecutor,MeridianSecurityMetadataReader,MeridianSystemMetadataReader,MeridianTaskActionExecutor,MeridianTaskMetadataReader",
            "B1B2_USER|meridian.runtime|ACCOUNT_NEVER_EXPIRES=1",
            "B1B2_USER|meridian.runtime|PASSWORD_NEVER_EXPIRES=1"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_RESOURCE|Meridian_Portal|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_RESOURCE|Meridian_Portal|DESCRIPTION=Meridian Operations portal access"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_RESOURCE|Meridian_Admin|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_RESOURCE|Meridian_Admin|DESCRIPTION=Meridian Operations administrative access"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_RESOURCE|Meridian_Orders|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_RESOURCE|Meridian_Orders|DESCRIPTION=Meridian Operations order access"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_RESOURCE|Meridian_Jobs|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_RESOURCE|Meridian_Jobs|DESCRIPTION=Meridian Operations job execution access"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_RESOURCE|Meridian_ControlPlane_Internal|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_RESOURCE|Meridian_ControlPlane_Internal|DESCRIPTION=Meridian Control Plane private runtime adapter"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_APP|/meridian/api|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_APP|/meridian/api|ENABLED=1",
            "B1B2_APP|/meridian/api|NAMESPACE=USER",
            "B1B2_APP|/meridian/api|DISPATCH=Meridian.API.disp",
            "B1B2_APP|/meridian/api|RESOURCE=Meridian_Portal",
            "B1B2_APP|/meridian/api|MATCHROLES=",
            "B1B2_APP|/meridian/api|RECURSE=1",
            "B1B2_APP|/meridian/api|AUTH=32",
            "B1B2_APP|/meridian/api|JWT=0",
            "B1B2_APP|/meridian/api|SERVEFILES=1"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_APP|/meridian/admin|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_APP|/meridian/admin|ENABLED=1",
            "B1B2_APP|/meridian/admin|NAMESPACE=USER",
            "B1B2_APP|/meridian/admin|DISPATCH=",
            "B1B2_APP|/meridian/admin|RESOURCE=Meridian_Admin",
            "B1B2_APP|/meridian/admin|MATCHROLES=",
            "B1B2_APP|/meridian/admin|RECURSE=1",
            "B1B2_APP|/meridian/admin|AUTH=32",
            "B1B2_APP|/meridian/admin|JWT=0",
            "B1B2_APP|/meridian/admin|SERVEFILES=1"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_APP|/meridian-control-plane-internal|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_APP|/meridian-control-plane-internal|ENABLED=1",
            "B1B2_APP|/meridian-control-plane-internal|NAMESPACE=USER",
            "B1B2_APP|/meridian-control-plane-internal|DISPATCH=Meridian.ControlPlane.Internal.REST",
            "B1B2_APP|/meridian-control-plane-internal|RESOURCE=Meridian_ControlPlane_Internal",
            "B1B2_APP|/meridian-control-plane-internal|MATCHROLES=:MeridianControlPlaneHelperExecution",
            "B1B2_APP|/meridian-control-plane-internal|RECURSE=1",
            "B1B2_APP|/meridian-control-plane-internal|AUTH=32",
            "B1B2_APP|/meridian-control-plane-internal|JWT=1",
            "B1B2_APP|/meridian-control-plane-internal|SERVEFILES=0"
        )

    Assert-ExistingObjectExact `
        -Text $Text `
        -ExistsMarker "B1B2_APP|/meridian-control-plane-history|GET_OK=1" `
        -ExpectedMarkers @(
            "B1B2_APP|/meridian-control-plane-history|ENABLED=1",
            "B1B2_APP|/meridian-control-plane-history|NAMESPACE=USER",
            "B1B2_APP|/meridian-control-plane-history|DISPATCH=Meridian.ControlPlane.History.REST",
            "B1B2_APP|/meridian-control-plane-history|RESOURCE=Meridian_ControlPlane_Internal",
            "B1B2_APP|/meridian-control-plane-history|MATCHROLES=:MeridianControlPlaneHelperExecution:MeridianReceiptHistoryWriter",
            "B1B2_APP|/meridian-control-plane-history|RECURSE=1",
            "B1B2_APP|/meridian-control-plane-history|AUTH=32",
            "B1B2_APP|/meridian-control-plane-history|JWT=1",
            "B1B2_APP|/meridian-control-plane-history|SERVEFILES=0"
        )

    foreach ($Marker in @(
        "B1B2_SQL|ProcessQuery|INSERT=0",
        "B1B2_SQL|SysLogTable|INSERT=0",
        "B1B2_SQL|SysLogTable|UPDATE=0",
        "B1B2_SQL|SysLogTable|DELETE=0",
        "B1B2_RUNTIME|ADMIN_TASK=0",
        "B1B2_RUNTIME|ADMIN_OPERATE=0",
        "B1B2_RUNTIME|ADMIN_MANAGE=0",
        "B1B2_RUNTIME|ADMIN_JOURNAL=0",
        "B1B2_RUNTIME|DB_USER_WRITE=0"
    )) { Require-ExactLine -Text $Text -Line $Marker -Label "B1B2 non-deviation" }

    $ApiClassCount = 0
    foreach ($ClassMarker in @(
        "B1B2_CLASS|Meridian.API.spec|EXISTS=1",
        "B1B2_CLASS|Meridian.API.impl|EXISTS=1",
        "B1B2_CLASS|Meridian.API.disp|EXISTS=1"
    )) { if (Test-ExactLine -Text $Text -Line $ClassMarker) { $ApiClassCount++ } }
    if ($ApiClassCount -ne 0 -and $ApiClassCount -ne 3) { throw "Partial Meridian.API generated class state is refused." }

    Write-Host "MERIDIAN_BOOTSTRAP_UNEXPECTED_DRIFT=ABSENT"
}

function Test-Converged {
    param([string]$Text)
    foreach ($Marker in $ExpectedConvergedMarkers) { if (-not (Test-ExactLine -Text $Text -Line $Marker)) { return $false } }
    return $true
}

function Escape-ObjectScriptString {
    param([Parameter(Mandatory=$true)][string]$Value)
    if ($Value.IndexOf([char]0) -ge 0 -or $Value.Contains("`r") -or $Value.Contains("`n")) { throw "Password contains a control character unsupported by the bootstrap transport." }
    return $Value.Replace('"','""')
}

function Create-MissingUser {
    param([string]$UserName,[string]$FullName,[string]$NameSpace,[string]$Roles,[string]$EscalationRoles,[string]$Comment)
    $Secure = Read-Host "Password for new IRIS user $UserName" -AsSecureString
    $Bstr = [IntPtr]::Zero
    $Plain = $null
    try {
        $Bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
        $Plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr)
        if ([string]::IsNullOrWhiteSpace($Plain)) { throw "Password for $UserName is blank." }
        $Escaped = Escape-ObjectScriptString -Value $Plain
        $Template = @'
zn "%SYS"
kill current
set gsc=##class(Security.Users).Get("__USER__",.current)
if $SYSTEM.Status.IsOK(gsc) write "B1B2_USER_CREATE_REFUSED_ALREADY_EXISTS=1",! halt
kill p
set p("Roles")="__ROLES__"
set p("Password")="__PASSWORD__"
set p("FullName")="__FULLNAME__"
set p("NameSpace")="__NAMESPACE__"
set p("Routine")=""
set p("ExpirationDate")=""
set p("ChangePassword")=0
set p("Enabled")=1
set p("Comment")="__COMMENT__"
set p("AccountNeverExpires")=1
set p("PasswordNeverExpires")=1
set p("EscalationRoles")="__ESCALATION__"
set sc=##class(Security.Users).Create("__USER__",.p)
write "B1B2_USER_CREATE_OK="_$SYSTEM.Status.IsOK(sc),!
if '$SYSTEM.Status.IsOK(sc) write "B1B2_USER_CREATE_ERROR="_$SYSTEM.Status.GetErrorText(sc),!
halt
'@
        $Script = $Template.Replace("__USER__",$UserName).Replace("__ROLES__",$Roles).Replace("__FULLNAME__",$FullName).Replace("__NAMESPACE__",$NameSpace).Replace("__COMMENT__",$Comment).Replace("__ESCALATION__",$EscalationRoles).Replace("__PASSWORD__",$Escaped)
        Write-Host "MERIDIAN_BOOTSTRAP_PASSWORD_PROMPT_MASKED=YES"
        Write-Host "MERIDIAN_BOOTSTRAP_PASSWORD_FILE_CREATED=NO"
        Write-Host "MERIDIAN_BOOTSTRAP_PASSWORD_ENV_USED=NO"
        Write-Host "MERIDIAN_BOOTSTRAP_PASSWORD_COMMANDLINE_USED=NO"
        $Result = Invoke-Iris -Script $Script
        Assert-IrisClean -Result $Result -Label "MERIDIAN_BOOTSTRAP_USER_CREATE_$($UserName.Replace('.','_'))"
        Require-Marker -Text (Native-Text -Result $Result) -Marker "B1B2_USER_CREATE_OK=1" -Label "user create"
    } finally {
        $Plain = $null
        $Escaped = $null
        $Script = $null
        if ($Bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr) }
        $Secure = $null
        Write-Host "MERIDIAN_BOOTSTRAP_PASSWORD_BSTR_ZERO_FREED=YES"
        Write-Host "MERIDIAN_BOOTSTRAP_PASSWORD_STORED=NO"
    }
}

function Copy-ClassBytes {
    param([string]$Relative,[string]$ContainerPath)
    $HostPath = Join-Path $Repo $Relative
    docker cp $HostPath "${ContainerName}:$ContainerPath"
    if ($LASTEXITCODE -ne 0) { throw "docker cp failed for $Relative" }
    $Expected = $ExpectedSourceHashes[$Relative]
    $HashOut = @(docker exec $ContainerName sha256sum $ContainerPath 2>&1)
    if ($LASTEXITCODE -ne 0 -or (($HashOut -join "`n").ToUpperInvariant().IndexOf($Expected) -lt 0)) { throw "Container byte identity failed for $Relative" }
    Write-Host "MERIDIAN_BOOTSTRAP_CLASS_SOURCE_COPY|$Relative|PASS"
}

function Copy-And-LoadClass {
    param([string]$Relative,[string]$ContainerPath,[string]$ClassName)
    Copy-ClassBytes -Relative $Relative -ContainerPath $ContainerPath
    $Load = @"
zn "USER"
set sc=`$SYSTEM.OBJ.Load("$ContainerPath","ck")
write "B1B2_CLASS_LOAD_OK="_`$SYSTEM.Status.IsOK(sc),!
if '`$SYSTEM.Status.IsOK(sc) write "B1B2_CLASS_LOAD_ERROR="_`$SYSTEM.Status.GetErrorText(sc),!
write "B1B2_CLASS_COMPILED="_##class(%Dictionary.CompiledClass).%ExistsId("$ClassName"),!
halt
"@
    $Result = Invoke-Iris -Script $Load
    Assert-IrisClean -Result $Result -Label "MERIDIAN_BOOTSTRAP_CLASS_LOAD"
    $Text = Native-Text -Result $Result
    Require-Marker -Text $Text -Marker "B1B2_CLASS_LOAD_OK=1" -Label "class load"
    Require-Marker -Text $Text -Marker "B1B2_CLASS_COMPILED=1" -Label "class compile"
}

function Provision-Missing {
    param([string]$PreText)
    $Core = @'
zn "%SYS"
kill current
set gsc=##class(Security.Resources).Get("Meridian_Portal",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Resources).Create("Meridian_Portal","Meridian Operations portal access",0)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_RESOURCE|Meridian_Portal|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_RESOURCE_ERROR|Meridian_Portal="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Resources).Get("Meridian_Admin",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Resources).Create("Meridian_Admin","Meridian Operations administrative access",0)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_RESOURCE|Meridian_Admin|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_RESOURCE_ERROR|Meridian_Admin="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Resources).Get("Meridian_Orders",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Resources).Create("Meridian_Orders","Meridian Operations order access",0)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_RESOURCE|Meridian_Orders|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_RESOURCE_ERROR|Meridian_Orders="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Resources).Get("Meridian_Jobs",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Resources).Create("Meridian_Jobs","Meridian Operations job execution access",0)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_RESOURCE|Meridian_Jobs|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_RESOURCE_ERROR|Meridian_Jobs="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Resources).Get("Meridian_ControlPlane_Internal",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Resources).Create("Meridian_ControlPlane_Internal","Meridian Control Plane private runtime adapter",0)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_RESOURCE|Meridian_ControlPlane_Internal|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_RESOURCE_ERROR|Meridian_ControlPlane_Internal="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Roles).Get("MeridianViewer",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Roles).Create("MeridianViewer","Read-only Meridian portal user","%DB_USER:R,Meridian_Orders:R,Meridian_Portal:U","",0)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_ROLE|MeridianViewer|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_ROLE_ERROR|MeridianViewer="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Roles).Get("MeridianJobRunner",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Roles).Create("MeridianJobRunner","May execute Meridian jobs","Meridian_Jobs:U","",0)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_ROLE|MeridianJobRunner|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_ROLE_ERROR|MeridianJobRunner="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Roles).Get("MeridianEmployee",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Roles).Create("MeridianEmployee","Base Meridian employee","","MeridianViewer",0)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_ROLE|MeridianEmployee|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_ROLE_ERROR|MeridianEmployee="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Roles).Get("MeridianOperator",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Roles).Create("MeridianOperator","Meridian operational write access","Meridian_Orders:W","MeridianJobRunner",0)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_ROLE|MeridianOperator|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_ROLE_ERROR|MeridianOperator="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Roles).Get("MeridianSupervisor",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Roles).Create("MeridianSupervisor","Meridian supervisor access","%Admin_Task:U,Meridian_Admin:U","MeridianOperator",0)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_ROLE|MeridianSupervisor|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_ROLE_ERROR|MeridianSupervisor="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Roles).Get("MeridianControlPlaneRuntime",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Roles).Create("MeridianControlPlaneRuntime","Meridian Control Plane least-privilege runtime","%Admin_Secure:U,%DB_IRISSYS:R,Meridian_ControlPlane_Internal:U","",0)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_ROLE|MeridianControlPlaneRuntime|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_ROLE_ERROR|MeridianControlPlaneRuntime="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Roles).Get("MeridianControlPlaneHelperExecution",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Roles).Create("MeridianControlPlaneHelperExecution","Meridian Control Plane application-scoped helper execution","%DB_USER:R","",0)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_ROLE|MeridianControlPlaneHelperExecution|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_ROLE_ERROR|MeridianControlPlaneHelperExecution="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Roles).Get("MeridianReceiptHistoryWriter",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Roles).Create("MeridianReceiptHistoryWriter","Context-only Meridian receipt-history persistence","%DB_USER:RW","",0)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_ROLE|MeridianReceiptHistoryWriter|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_ROLE_ERROR|MeridianReceiptHistoryWriter="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Roles).Get("MeridianSecurityMetadataReader",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Roles).Create("MeridianSecurityMetadataReader","Meridian Security / Secrets self-contained safe-metadata read escalation","%Admin_OAuth2_Client:U,%Admin_OAuth2_Registration:U,%Admin_Secure:U,%Admin_Wallet:U,%DB_IRISSYS:R","",1)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_ROLE|MeridianSecurityMetadataReader|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_ROLE_ERROR|MeridianSecurityMetadataReader="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Roles).Get("MeridianTaskActionExecutor",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Roles).Create("MeridianTaskActionExecutor","Meridian task least-privilege action escalation","%Admin_Task:U","",1)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_ROLE|MeridianTaskActionExecutor|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_ROLE_ERROR|MeridianTaskActionExecutor="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Roles).Get("MeridianProcessActionExecutor",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Roles).Create("MeridianProcessActionExecutor","Meridian process-control least-privilege action escalation","%Admin_Operate:U,%DB_IRISSYS:RW","",1)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_ROLE|MeridianProcessActionExecutor|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_ROLE_ERROR|MeridianProcessActionExecutor="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Roles).Get("MeridianTaskMetadataReader",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Roles).Create("MeridianTaskMetadataReader","Meridian task read-only product escalation","%Admin_Task:U","",1)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_ROLE|MeridianTaskMetadataReader|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_ROLE_ERROR|MeridianTaskMetadataReader="_$SYSTEM.Status.GetErrorText(csc),!
kill current
set gsc=##class(Security.Roles).Get("MeridianSystemMetadataReader",.current)
if '$SYSTEM.Status.IsOK(gsc) set csc=##class(Security.Roles).Create("MeridianSystemMetadataReader","Meridian OS/System server-only escalation","%Admin_Operate:U,%DB_IRISSYS:R","",1)
if '$SYSTEM.Status.IsOK(gsc) write "B1B2_CREATE_ROLE|MeridianSystemMetadataReader|OK="_$SYSTEM.Status.IsOK(csc),!
if '$SYSTEM.Status.IsOK(gsc),'$SYSTEM.Status.IsOK(csc) write "B1B2_CREATE_ROLE_ERROR|MeridianSystemMetadataReader="_$SYSTEM.Status.GetErrorText(csc),!
halt
'@
    $CoreResult = Invoke-Iris -Script $Core
    Assert-IrisClean -Result $CoreResult -Label "MERIDIAN_BOOTSTRAP_RESOURCE_ROLE_CREATE"

    if (-not $PreText.Contains("B1B2_USER|maya.patel|GET_OK=1")) {
        Create-MissingUser -UserName "maya.patel" -FullName "Maya Patel" -NameSpace "USER" -Roles "MeridianEmployee" -EscalationRoles "" -Comment "Meridian Operations controlled convergence fixture"
    }
    if (-not $PreText.Contains("B1B2_USER|meridian.runtime|GET_OK=1")) {
        Create-MissingUser -UserName "meridian.runtime" -FullName "Meridian Control Plane Runtime" -NameSpace "%SYS" -Roles "MeridianControlPlaneRuntime" -EscalationRoles "MeridianProcessActionExecutor,MeridianSecurityMetadataReader,MeridianSystemMetadataReader,MeridianTaskActionExecutor,MeridianTaskMetadataReader" -Comment "Dedicated least-privilege runtime identity for Meridian Control Plane"
    }

    if (-not $PreText.Contains("B1B2_CLASS|Meridian.ControlPlane.Internal.REST|EXISTS=1")) { Copy-And-LoadClass -Relative "iris/Meridian.ControlPlane.Internal.REST.cls" -ContainerPath "/tmp/meridian_internal_rest.cls" -ClassName "Meridian.ControlPlane.Internal.REST" }
    if (-not $PreText.Contains("B1B2_CLASS|Meridian.ControlPlane.History.REST|EXISTS=1")) { Copy-And-LoadClass -Relative "iris/Meridian.ControlPlane.History.REST.cls" -ContainerPath "/tmp/meridian_history_rest.cls" -ClassName "Meridian.ControlPlane.History.REST" }
    if (-not $PreText.Contains("B1B2_CLASS|Meridian.Lab.Orders.REST|EXISTS=1")) { Copy-And-LoadClass -Relative "iris/Meridian.Lab.Orders.REST.cls" -ContainerPath "/tmp/meridian_lab_orders_rest.cls" -ClassName "Meridian.Lab.Orders.REST" }

    $ApiAbsent = -not $PreText.Contains("B1B2_CLASS|Meridian.API.spec|EXISTS=1")
    if ($ApiAbsent) {
        Copy-ClassBytes -Relative "iris/Meridian.API.spec.cls" -ContainerPath "/tmp/meridian_api_spec.cls"
        Copy-ClassBytes -Relative "iris/Meridian.API.impl.cls" -ContainerPath "/tmp/meridian_api_impl.cls"
        $Generated = Invoke-Iris -Script @'
zn "USER"
set ssc=$SYSTEM.OBJ.Load("/tmp/meridian_api_spec.cls","k")
write "B1B2_API_SPEC_DEFINITION_LOAD_OK="_$SYSTEM.Status.IsOK(ssc),!
if '$SYSTEM.Status.IsOK(ssc) write "B1B2_API_SPEC_DEFINITION_LOAD_ERROR="_$SYSTEM.Status.GetErrorText(ssc),!
set isc=$SYSTEM.OBJ.Load("/tmp/meridian_api_impl.cls","k")
write "B1B2_API_IMPL_DEFINITION_LOAD_OK="_$SYSTEM.Status.IsOK(isc),!
if '$SYSTEM.Status.IsOK(isc) write "B1B2_API_IMPL_DEFINITION_LOAD_ERROR="_$SYSTEM.Status.GetErrorText(isc),!
if $SYSTEM.Status.IsOK(ssc),$SYSTEM.Status.IsOK(isc) set csc=$SYSTEM.OBJ.Compile("Meridian.API.spec,Meridian.API.impl","ck")
write "B1B2_API_PAIR_COMPILE_OK="_$SYSTEM.Status.IsOK($get(csc)),!
if '$SYSTEM.Status.IsOK($get(csc)) write "B1B2_API_PAIR_COMPILE_ERROR="_$SYSTEM.Status.GetErrorText($get(csc)),!
write "B1B2_API_SPEC_EXISTS="_##class(%Dictionary.CompiledClass).%ExistsId("Meridian.API.spec"),!
write "B1B2_API_IMPL_EXISTS="_##class(%Dictionary.CompiledClass).%ExistsId("Meridian.API.impl"),!
write "B1B2_API_DISP_EXISTS="_##class(%Dictionary.CompiledClass).%ExistsId("Meridian.API.disp"),!
halt
'@
        Assert-IrisClean -Result $Generated -Label "MERIDIAN_BOOTSTRAP_API_GENERATION"
        $GeneratedText = Native-Text -Result $Generated
        foreach ($Marker in @(
            "B1B2_API_SPEC_DEFINITION_LOAD_OK=1",
            "B1B2_API_IMPL_DEFINITION_LOAD_OK=1",
            "B1B2_API_PAIR_COMPILE_OK=1",
            "B1B2_API_SPEC_EXISTS=1",
            "B1B2_API_IMPL_EXISTS=1",
            "B1B2_API_DISP_EXISTS=1"
        )) {
            Require-Marker -Text $GeneratedText -Marker $Marker -Label "generated API surface"
        }
        Write-Host "MERIDIAN_BOOTSTRAP_API_TWO_PHASE_LOAD_COMPILE=PASS"
    }

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $HelperInstaller -ContainerName $ContainerName -Apply
    if ($LASTEXITCODE -ne 0) { throw "Helper application installer failed." }
    Write-Host "MERIDIAN_BOOTSTRAP_HELPER_INSTALLER_REUSED=PASS"

    $Apps = @'
zn "%SYS"
kill e,s
set exists=##class(Security.Applications).Exists("/meridian/api",.e,.s)
if 'exists kill p set p("Enabled")=1 set p("NameSpace")="USER" set p("IsNameSpaceDefault")=0 set p("DispatchClass")="Meridian.API.disp" set p("Resource")="Meridian_Portal" set p("MatchRoles")="" set p("Recurse")=1 set p("CSRFToken")=1 set p("AutheEnabled")=32 set p("UseCookies")=1 set p("CSPZENEnabled")=1 set p("JWTAuthEnabled")=0 set p("InbndWebServicesEnabled")=1 set p("ServeFiles")=1 set p("RedirectEmptyPath")=0 set p("AutoCompile")=0 set p("TraceEnabled")=0 set p("SessionScope")=2 set p("UserCookieScope")=2 set p("CookiePath")="/meridian/api/" set p("Description")="Meridian Operations REST application" set sc=##class(Security.Applications).Create("/meridian/api",.p) write "B1B2_CREATE_APP_API_OK="_$SYSTEM.Status.IsOK(sc),!
kill e,s
set exists=##class(Security.Applications).Exists("/meridian/admin",.e,.s)
if 'exists kill p set p("Enabled")=1 set p("NameSpace")="USER" set p("IsNameSpaceDefault")=0 set p("DispatchClass")="" set p("Resource")="Meridian_Admin" set p("MatchRoles")="" set p("Recurse")=1 set p("CSRFToken")=1 set p("AutheEnabled")=32 set p("UseCookies")=1 set p("CSPZENEnabled")=1 set p("JWTAuthEnabled")=0 set p("InbndWebServicesEnabled")=1 set p("ServeFiles")=1 set p("RedirectEmptyPath")=0 set p("AutoCompile")=0 set p("TraceEnabled")=0 set p("SessionScope")=2 set p("UserCookieScope")=2 set p("CookiePath")="/meridian/admin/" set p("Description")="Meridian Operations administrative application" set sc=##class(Security.Applications).Create("/meridian/admin",.p) write "B1B2_CREATE_APP_ADMIN_OK="_$SYSTEM.Status.IsOK(sc),!
kill e,s
set exists=##class(Security.Applications).Exists("/meridian-control-plane-history",.e,.s)
if 'exists kill p set p("Enabled")=1 set p("NameSpace")="USER" set p("IsNameSpaceDefault")=0 set p("DispatchClass")="Meridian.ControlPlane.History.REST" set p("Resource")="Meridian_ControlPlane_Internal" set p("MatchRoles")=":MeridianControlPlaneHelperExecution:MeridianReceiptHistoryWriter" set p("Recurse")=1 set p("CSRFToken")=1 set p("AutheEnabled")=32 set p("UseCookies")=0 set p("CSPZENEnabled")=1 set p("JWTAuthEnabled")=1 set p("InbndWebServicesEnabled")=1 set p("ServeFiles")=0 set p("RedirectEmptyPath")=0 set p("AutoCompile")=0 set p("TraceEnabled")=0 set p("SessionScope")=2 set p("UserCookieScope")=2 set p("CookiePath")="/meridian-control-plane-history/" set p("Description")="Meridian Control Plane verified receipt history" set sc=##class(Security.Applications).Create("/meridian-control-plane-history",.p) write "B1B2_CREATE_APP_HISTORY_OK="_$SYSTEM.Status.IsOK(sc),!
halt
'@
    $AppResult = Invoke-Iris -Script $Apps
    Assert-IrisClean -Result $AppResult -Label "MERIDIAN_BOOTSTRAP_APPLICATION_CREATE"

    $GrantScript = @'
zn "%SYS"
set pq=$SYSTEM.SQL.Security.CheckPrivilege("meridian.runtime",1,"%SYS.ProcessQuery","s","%SYS")
if 'pq set stmt=##class(%SQL.Statement).%New() set psc=stmt.%Prepare("GRANT SELECT ON %SYS.ProcessQuery TO ""meridian.runtime""") write "B1B2_PQ_GRANT_PREPARE_OK="_$SYSTEM.Status.IsOK(psc),! set rs=stmt.%Execute() write "B1B2_PQ_GRANT_EXECUTED=1",!
set sl=$SYSTEM.SQL.Security.CheckPrivilege("meridian.runtime",1,"%Library.SysLogTable","s","%SYS")
if 'sl set stmt=##class(%SQL.Statement).%New() set psc=stmt.%Prepare("GRANT SELECT ON %Library.SysLogTable TO MeridianControlPlaneRuntime") write "B1B2_SYSLOG_GRANT_PREPARE_OK="_$SYSTEM.Status.IsOK(psc),! set rs=stmt.%Execute() write "B1B2_SYSLOG_GRANT_EXECUTED=1",!
halt
'@
    $GrantResult = Invoke-Iris -Script $GrantScript
    Assert-IrisClean -Result $GrantResult -Label "MERIDIAN_BOOTSTRAP_SQL_GRANTS"
}

Write-Host "===== MERIDIAN DECLARATIVE IRIS BOOTSTRAP ====="
Write-Host "MERIDIAN_BOOTSTRAP_MODE=$(if ($Apply) {'APPLY'} else {'DRY_RUN'})"
Write-Host "MERIDIAN_BOOTSTRAP_CONTAINER=$ContainerName"
Write-Host "MERIDIAN_BOOTSTRAP_PINNED_IMAGE_TARGET_ONLY=YES"
Write-Host "MERIDIAN_BOOTSTRAP_CONTAINER_PARAMETER_SUPPORTED=YES"
Write-Host "MERIDIAN_BOOTSTRAP_B0_EVIDENCE_SHA256=2EC1D9AD5376F9895F81A076E93D0F2BCB087219F657C5491E9238645F10C18B"
Write-Host "MERIDIAN_BOOTSTRAP_B1A_EVIDENCE_SHA256=7BA83D2AE06F7E27D7578CA35436B70B31B386D1C0ED2035B815DDD397CA7C40"
Assert-Container
Assert-TrackedSources
$PreText = Get-State
Assert-NoUnexpectedDrift -Text $PreText
if (Test-Converged -Text $PreText) {
    Write-Host "MERIDIAN_BOOTSTRAP_WRITE_PERFORMED=NO"
    Write-Host "MERIDIAN_BOOTSTRAP_RESULT=ALREADY_CONVERGED"
    Write-Host "MERIDIAN_BOOTSTRAP_STATUS=PASS"
    exit 0
}
if (-not $Apply) {
    Write-Host "MERIDIAN_BOOTSTRAP_WRITE_PERFORMED=NO"
    Write-Host "MERIDIAN_BOOTSTRAP_RESULT=RECONCILIATION_REQUIRED"
    Write-Host "MERIDIAN_BOOTSTRAP_APPLY_REQUIRED=YES"
    Write-Host "MERIDIAN_BOOTSTRAP_STATUS=PASS"
    exit 0
}
Provision-Missing -PreText $PreText
$PostText = Get-State
Assert-NoUnexpectedDrift -Text $PostText
if (-not (Test-Converged -Text $PostText)) {
    foreach ($Marker in $ExpectedConvergedMarkers) { if (-not (Test-ExactLine -Text $PostText -Line $Marker)) { Write-Host "MERIDIAN_BOOTSTRAP_POST_MISSING=$Marker" } }
    throw "B1B2 apply did not converge to the frozen manifest."
}
Write-Host "MERIDIAN_BOOTSTRAP_WRITE_PERFORMED=YES"
Write-Host "MERIDIAN_BOOTSTRAP_POST_CONVERGENCE=PASS"
Write-Host "MERIDIAN_BOOTSTRAP_RESULT=CONVERGED"
Write-Host "MERIDIAN_BOOTSTRAP_STATUS=PASS"
