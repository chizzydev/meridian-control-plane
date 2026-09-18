param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(
        "setup-check",
        "setup",
        "readiness",
        "cycle",
        "start"
    )]
    [string]$Command,

    [string]$ContainerName =
        "iris-cert"
)

$ErrorActionPreference =
    "Stop"

Set-StrictMode `
    -Version Latest

$Repo =
    Split-Path `
        -Parent `
        $PSScriptRoot

$Requirements =
    Join-Path `
        $Repo `
        "requirements-iris.txt"

$FixtureCli =
    Join-Path `
        $Repo `
        "scripts\iris-demo-fixture-control.mts"

$HelperInstaller =
    Join-Path `
        $Repo `
        "scripts\install-iris-helper-web-app.ps1"

$TsxCli =
    Join-Path `
        $Repo `
        "node_modules\tsx\dist\cli.mjs"

$VenvRoot =
    Join-Path `
        $Repo `
        ".venv-iris"

$VenvPython =
    if (
        $env:OS -eq
        "Windows_NT"
    ) {
        Join-Path `
            $VenvRoot `
            "Scripts\python.exe"
    }
    else {
        Join-Path `
            $VenvRoot `
            "bin\python"
    }

$ApiBase =
    "http://localhost:52773/api/admin"

$HelperBase =
    "http://localhost:52773/meridian-control-plane-internal"

$RuntimeUser =
    "meridian.runtime"

$PinnedImage =
    "intersystems/iris-community@sha256:d4331089a4d19aafa867c26b343eb2b8486cf112ef1522132761e6327691377e"

function Assert-Exit {
    param(
        [Parameter(Mandatory = $true)]
        [int]$ExitCode,

        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    if ($ExitCode -ne 0) {
        throw "$Label failed with exit code $ExitCode."
    }

    Write-Host "$Label=PASS"
}

function Get-PythonLauncher {
    $Python =
        Get-Command `
            python.exe `
            -ErrorAction SilentlyContinue

    if ($null -ne $Python) {
        return [pscustomobject]@{
            File =
                $Python.Source

            Prefix =
                @()
        }
    }

    $Py =
        Get-Command `
            py.exe `
            -ErrorAction SilentlyContinue

    if ($null -ne $Py) {
        return [pscustomobject]@{
            File =
                $Py.Source

            Prefix =
                @("-3")
        }
    }

    throw "Python 3 was not found. Install Python 3 and rerun setup."
}

function Assert-Container {
    $Docker =
        Get-Command `
            docker.exe `
            -ErrorAction SilentlyContinue

    if ($null -eq $Docker) {
        $Docker =
            Get-Command `
                docker `
                -ErrorAction SilentlyContinue
    }

    if ($null -eq $Docker) {
        throw "Docker is not available."
    }

    $Inspect =
        @(
            & $Docker.Source `
                inspect `
                --format "{{.State.Running}}|{{.State.Health.Status}}|{{.Config.Image}}" `
                $ContainerName `
                2>&1
        )

    Assert-Exit `
        -ExitCode $LASTEXITCODE `
        -Label "MERIDIAN_REPRO_CONTAINER_INSPECT"

    if ($Inspect.Count -ne 1) {
        throw "Unexpected container inspection result."
    }

    $State =
        ([string]$Inspect[0]).Trim()

    Write-Host "MERIDIAN_REPRO_CONTAINER_STATE=$State"

    if (
        -not $State.StartsWith(
            "true|healthy|",
            [System.StringComparison]::Ordinal
        )
    ) {
        throw "IRIS container is not running and healthy."
    }

    if (
        -not $State.EndsWith(
            $PinnedImage,
            [System.StringComparison]::Ordinal
        )
    ) {
        throw "IRIS container image does not match the pinned 2026.2 Community image."
    }

    Write-Host "MERIDIAN_REPRO_PINNED_IRIS_CONTAINER=PASS"
}

function Assert-DbApi {
    if (
        -not (
            Test-Path `
                -LiteralPath $VenvPython `
                -PathType Leaf
        )
    ) {
        throw "Repo-local IRIS Python environment is missing. Run demo:setup first."
    }

    $Version =
        @(
            & $VenvPython `
                -c `
                "import importlib.metadata; print(importlib.metadata.version('intersystems-irispython'))" `
                2>&1
        )

    Assert-Exit `
        -ExitCode $LASTEXITCODE `
        -Label "MERIDIAN_REPRO_IRISPYTHON_PROBE"

    if (
        $Version.Count -ne 1 -or
        ([string]$Version[0]).Trim() -ne
        "5.4.0"
    ) {
        throw "Repo-local intersystems-irispython is not pinned at 5.4.0."
    }

    Write-Host "MERIDIAN_REPRO_IRISPYTHON_VERSION=5.4.0"
}

function Invoke-HelperDryRun {
    & powershell.exe `
        -NoProfile `
        -ExecutionPolicy Bypass `
        -File $HelperInstaller `
        -ContainerName $ContainerName

    Assert-Exit `
        -ExitCode $LASTEXITCODE `
        -Label "MERIDIAN_REPRO_HELPER_INSTALLER_DRY_RUN"
}

function Invoke-LiveFixtureCommand {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet(
            "readiness",
            "cycle"
        )]
        [string]$Action
    )

    Assert-Container
    Assert-DbApi

    if (
        -not (
            Test-Path `
                -LiteralPath $TsxCli `
                -PathType Leaf
        )
    ) {
        throw "Local tsx CLI is missing. Run demo:setup first."
    }

    $SecurePassword =
        Read-Host `
            "Password for meridian.runtime" `
            -AsSecureString

    $Bstr =
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
            $SecurePassword
        )

    $PlainPassword =
        $null

    $Payload =
        $null

    $PriorPython =
        [Environment]::GetEnvironmentVariable(
            "MERIDIAN_IRISPYTHON_EXECUTABLE",
            "Process"
        )

    try {
        $PlainPassword =
            [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
                $Bstr
            )

        if (
            [string]::IsNullOrWhiteSpace(
                $PlainPassword
            )
        ) {
            throw "Runtime password is blank."
        }

        $Payload =
            @{
                password =
                    $PlainPassword
            } |
            ConvertTo-Json `
                -Compress

        [Environment]::SetEnvironmentVariable(
            "MERIDIAN_IRISPYTHON_EXECUTABLE",
            $VenvPython,
            "Process"
        )

        Write-Host "MERIDIAN_REPRO_PASSWORD_PROMPT_MASKED=YES"
        Write-Host "MERIDIAN_REPRO_PASSWORD_FILE_CREATED=NO"
        Write-Host "MERIDIAN_REPRO_PASSWORD_COMMANDLINE_USED=NO"
        Write-Host "MERIDIAN_REPRO_FIXTURE_ACTION=$Action"

        $Node =
            (
                Get-Command `
                    node.exe `
                    -ErrorAction Stop
            ).Source

        $Payload |
            & $Node `
                $TsxCli `
                $FixtureCli `
                $Action

        Assert-Exit `
            -ExitCode $LASTEXITCODE `
            -Label "MERIDIAN_REPRO_FIXTURE_$($Action.ToUpperInvariant())"
    }
    finally {
        [Environment]::SetEnvironmentVariable(
            "MERIDIAN_IRISPYTHON_EXECUTABLE",
            $PriorPython,
            "Process"
        )

        $Payload =
            $null

        $PlainPassword =
            $null

        if (
            $Bstr -ne
            [IntPtr]::Zero
        ) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR(
                $Bstr
            )
        }

        Write-Host "MERIDIAN_REPRO_PASSWORD_BSTR_ZERO_FREED=YES"
        Write-Host "MERIDIAN_REPRO_RUNTIME_PASSWORD_STORED=NO"
    }
}

function Invoke-SafeStart {
    Assert-Container
    Assert-DbApi

    $SecurePassword =
        Read-Host `
            "Password for meridian.runtime" `
            -AsSecureString

    $Bstr =
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
            $SecurePassword
        )

    $PlainPassword =
        $null

    try {
        $PlainPassword =
            [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
                $Bstr
            )

        if (
            [string]::IsNullOrWhiteSpace(
                $PlainPassword
            )
        ) {
            throw "Runtime password is blank."
        }

        $Npm =
            (
                Get-Command `
                    npm.cmd `
                    -ErrorAction Stop
            ).Source

        $StartInfo =
            New-Object `
                System.Diagnostics.ProcessStartInfo

        $StartInfo.FileName =
            $Npm

        $StartInfo.Arguments =
            "run start"

        $StartInfo.WorkingDirectory =
            $Repo

        $StartInfo.UseShellExecute =
            $false

        $StartInfo.EnvironmentVariables[
            "MERIDIAN_IRIS_API_BASE_URL"
        ] =
            $ApiBase

        $StartInfo.EnvironmentVariables[
            "MERIDIAN_IRIS_HELPER_BASE_URL"
        ] =
            $HelperBase

        $StartInfo.EnvironmentVariables[
            "MERIDIAN_IRISPYTHON_EXECUTABLE"
        ] =
            $VenvPython

        $StartInfo.EnvironmentVariables[
            "MERIDIAN_RUNTIME_USERNAME"
        ] =
            $RuntimeUser

        $StartInfo.EnvironmentVariables[
            "MERIDIAN_RUNTIME_PASSWORD"
        ] =
            $PlainPassword

        Write-Host "MERIDIAN_REPRO_START_PASSWORD_PROMPT_MASKED=YES"
        Write-Host "MERIDIAN_REPRO_START_PASSWORD_FILE_CREATED=NO"
        Write-Host "MERIDIAN_REPRO_START_PASSWORD_COMMANDLINE_USED=NO"
        Write-Host "MERIDIAN_REPRO_START_PASSWORD_CHILD_ENV_ONLY=YES"
        Write-Host "MERIDIAN_REPRO_START=http://localhost:3000"

        $Process =
            New-Object `
                System.Diagnostics.Process

        $Process.StartInfo =
            $StartInfo

        if (-not $Process.Start()) {
            throw "Unable to start the Meridian production server."
        }

        $Process.WaitForExit()

        $ExitCode =
            $Process.ExitCode

        $Process.Dispose()

        Assert-Exit `
            -ExitCode $ExitCode `
            -Label "MERIDIAN_REPRO_START_PROCESS"
    }
    finally {
        $PlainPassword =
            $null

        if (
            $Bstr -ne
            [IntPtr]::Zero
        ) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR(
                $Bstr
            )
        }

        Write-Host "MERIDIAN_REPRO_START_PASSWORD_BSTR_ZERO_FREED=YES"
        Write-Host "MERIDIAN_REPRO_RUNTIME_PASSWORD_STORED=NO"
    }
}

function Invoke-SetupCheck {
    Write-Host "MERIDIAN_REPRO_COMMAND=setup-check"

    Assert-Container

    foreach ($Path in @(
        $Requirements,
        $FixtureCli,
        $HelperInstaller,
        $TsxCli
    )) {
        if (
            -not (
                Test-Path `
                    -LiteralPath $Path `
                    -PathType Leaf
            )
        ) {
            throw "Required setup path is missing: $Path"
        }
    }

    Assert-DbApi
    Invoke-HelperDryRun

    Write-Host "MERIDIAN_REPRO_HOST_SETUP=PASS"
    Write-Host "MERIDIAN_REPRO_IRIS_DECLARATIVE_BOOTSTRAP=PENDING_B1B2"
    Write-Host "MERIDIAN_REPRO_SETUP_CHECK=PASS"
}

function Invoke-Setup {
    Write-Host "MERIDIAN_REPRO_COMMAND=setup"

    $Npm =
        (
            Get-Command `
                npm.cmd `
                -ErrorAction Stop
        ).Source

    & $Npm ci

    Assert-Exit `
        -ExitCode $LASTEXITCODE `
        -Label "MERIDIAN_REPRO_NPM_CI"

    if (
        -not (
            Test-Path `
                -LiteralPath $VenvPython `
                -PathType Leaf
        )
    ) {
        $Launcher =
            Get-PythonLauncher

        $Args =
            @(
                $Launcher.Prefix
            ) +
            @(
                "-m",
                "venv",
                $VenvRoot
            )

        & $Launcher.File @Args

        Assert-Exit `
            -ExitCode $LASTEXITCODE `
            -Label "MERIDIAN_REPRO_VENV_CREATE"
    }
    else {
        Write-Host "MERIDIAN_REPRO_VENV_CREATE=ALREADY_PRESENT"
    }

    & $VenvPython `
        -m pip install `
        --disable-pip-version-check `
        -r $Requirements

    Assert-Exit `
        -ExitCode $LASTEXITCODE `
        -Label "MERIDIAN_REPRO_IRISPYTHON_INSTALL"

    Invoke-SetupCheck

    Write-Host "MERIDIAN_REPRO_SETUP=PASS"
    Write-Host "MERIDIAN_REPRO_IRIS_DECLARATIVE_BOOTSTRAP=PENDING_B1B2"
}

Set-Location `
    -LiteralPath $Repo

switch ($Command) {
    "setup-check" {
        Invoke-SetupCheck
    }

    "setup" {
        Invoke-Setup
    }

    "readiness" {
        Write-Host "MERIDIAN_REPRO_COMMAND=readiness"
        Invoke-LiveFixtureCommand `
            -Action "readiness"
    }

    "cycle" {
        Write-Host "MERIDIAN_REPRO_COMMAND=cycle"
        Invoke-LiveFixtureCommand `
            -Action "cycle"
    }

    "start" {
        Write-Host "MERIDIAN_REPRO_COMMAND=start"
        Invoke-SafeStart
    }
}

Write-Host "MERIDIAN_REPRO_COMMAND_COMPLETE=YES"