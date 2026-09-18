# Meridian Control Plane

**Security changes are not finished when configuration changes.**

Meridian is an InterSystems IRIS control-plane prototype that treats an access change as complete only when the intended authorization delta has propagated to live process access and native IRIS evidence can close a durable Receipt.

## 30-second notice

The thing to notice first: Meridian does **not** ask only whether an IRIS security write returned success. It separates **EXPECTED**, **CONFIGURED**, and **LIVE** authorization truth, refuses to mark a Change Case **Verified** while live authority is stale, and binds the finished change to native IRIS evidence.

The certified centerpiece is the Maya Patel supervisor-role removal flow:

**Preflight -> Apply -> Converging -> Verified -> Receipt**

A recorded certified Maya receipt is included in the product, while the reproducibility commands use a bounded demo fixture cycle so judges can exercise setup and readiness without arbitrary process killing or uncontrolled security resets.

## Prerequisites

The certified operator path currently assumes:

- **Docker** with Linux containers.
- **Node.js** and npm.
- **Python 3** available as `python.exe` or `py.exe`.
- **Windows PowerShell 5.1** through `powershell.exe`.
- Free host ports **1972** and **52773** for IRIS, plus **3000** for Meridian.
- The pinned InterSystems IRIS Community image:
  `intersystems/iris-community@sha256:d4331089a4d19aafa867c26b343eb2b8486cf112ef1522132761e6327691377e`

The certified runtime is **InterSystems IRIS 2026.2 Build 221U**.

## Quick start

### 1. Start the pinned IRIS container

```powershell
docker run `
  --name iris-cert `
  -d `
  -p 1972:1972 `
  -p 52773:52773 `
  intersystems/iris-community@sha256:d4331089a4d19aafa867c26b343eb2b8486cf112ef1522132761e6327691377e
```

Wait until Docker reports the container healthy:

```powershell
docker inspect --format "{{.State.Health.Status}}" iris-cert
```

### 2. Set up Meridian

```powershell
npm run demo:setup
```

`demo:setup` runs `npm ci`, creates the local `.venv-iris` environment when needed, installs the pinned `intersystems-irispython==5.4.0` dependency, applies the declarative IRIS bootstrap, and then re-checks convergence.

On a fresh IRIS instance the bootstrap prompts for the new local passwords it needs. Passwords are not committed to the repository, written to a password file, or passed on the command line.

### 3. Check readiness and normalize the bounded demo fixture

```powershell
npm run demo:readiness
npm run demo:cycle
```

`demo:cycle` is the safe fixture lifecycle command. It is not an arbitrary PID-kill/reset mechanism and it does not make Maya Patel a generic mutation target.

### 4. Start Meridian

```powershell
npm run demo:start
```

The production server starts at:

```text
http://localhost:3000
```

`demo:start` prompts for the Meridian runtime password, passes it only to the child server process environment, and clears the in-process BSTR afterward.

## Certified operator commands

| Command | Purpose |
| --- | --- |
| `npm run demo:bootstrap:check` | Read-only IRIS bootstrap convergence check. |
| `npm run demo:bootstrap` | Apply only missing frozen bootstrap state; existing privilege drift fails closed. |
| `npm run demo:setup:check` | Check container, DBAPI, helper app, and declarative bootstrap convergence. |
| `npm run demo:setup` | Install Node/Python dependencies, apply the bootstrap, and verify setup. |
| `npm run demo:readiness` | Read the bounded demo fixture readiness state. |
| `npm run demo:cycle` | Run the safe repeatable fixture lifecycle. |
| `npm run demo:start` | Start the Meridian production server with a masked runtime-password prompt. |

## Environment

`.env.example` documents the exact five server-side runtime names:

```text
MERIDIAN_IRIS_API_BASE_URL=http://localhost:52773/api/admin
MERIDIAN_IRIS_HELPER_BASE_URL=http://localhost:52773/meridian-control-plane-internal
MERIDIAN_IRISPYTHON_EXECUTABLE=.venv-iris/Scripts/python.exe
MERIDIAN_RUNTIME_USERNAME=meridian.runtime
MERIDIAN_RUNTIME_PASSWORD=
```

Keep `MERIDIAN_RUNTIME_PASSWORD` blank in committed files. Real credentials belong only in the local runtime process.

## Architecture

Meridian is intentionally narrow: it is not a clone of the IRIS Management Portal.

The product combines:

1. **Official InterSystems SysAdmin REST** for supported management metadata and actions.
2. **Tracked IRIS classes** for the Meridian API, private helper, and durable receipt-history boundary.
3. **A least-privilege runtime identity** (`meridian.runtime` / `MeridianControlPlaneRuntime`).
4. **Escalation-only metadata roles** for bounded security, task, and system reads.
5. **A Change Case lifecycle** that keeps reviewed intent, configured state, live-process state, convergence evidence, and the final Receipt separate.

IRIS is causally indispensable to the core proof: remove IRIS and Meridian can no longer establish the authorization-convergence evidence that closes the Change Case.

## Privilege architecture

The default runtime role is `MeridianControlPlaneRuntime`. Its frozen resource surface is limited to the control-plane resources required by the product.

Metadata capabilities are separated into escalation-only roles, including:

- `MeridianSecurityMetadataReader`
- `MeridianTaskMetadataReader`
- `MeridianSystemMetadataReader`

Receipt persistence uses the dedicated `MeridianReceiptHistoryWriter` capability through the history application's MatchRoles boundary rather than broadening the default runtime role.

For the certified fresh-instance bootstrap, `%SYS.ProcessQuery` receives a direct **SELECT-only** grant for `meridian.runtime`; `%Library.SysLogTable` receives a **SELECT-only** grant through `MeridianControlPlaneRuntime`.

The default runtime remains without `%Admin_Manage`, `%Admin_Task`, `%Admin_Operate`, `%Admin_Journal`, or `%DB_USER WRITE`.

## API map

| Surface | Purpose |
| --- | --- |
| `http://localhost:52773/api/admin` | Official InterSystems SysAdmin REST base used by Meridian. |
| `/meridian/api` | Tracked Meridian API specification/implementation; IRIS regenerates `Meridian.API.disp`. |
| `/meridian-control-plane-internal` | Private runtime helper protected by `Meridian_ControlPlane_Internal` and helper MatchRoles. |
| `/meridian-control-plane-history` | Durable receipt-history boundary with application-scoped writer capability. |

### Browser route map

| Route | Judge-facing purpose |
| --- | --- |
| `/` | Meridian overview and centerpiece proof entry point. |
| `/change-cases` | Change Case / recorded receipt surface. |
| `/change-cases/new` | Reviewed change proposal surface. |
| `/change-cases/verified/maya-patel-supervisor-removal` | Certified Maya Patel Verified Receipt. |
| `/security-secrets` | Security/secrets management family. |
| `/tasks` | Task-management family. |
| `/system` | System-management family. |
| `/web-rest` | Web/REST management family. |
| `/logs` | Logs management family. |

No new core navigation family is introduced in A9C; this is the already-certified final route set.

## Demo walkthrough

Use the product in this order:

1. **Preflight** - inspect the target, direct/effective roles, expected permission delta, and reviewed material before mutation.
2. **Apply** - perform the bounded role change through the certified mutation path.
3. **Converging** - do not call the case Verified merely because configuration changed; compare live process authority with the intended post-change state.
4. **Verified** - require configured and live authorization truth to agree.
5. **Receipt** - bind the reviewed intent, configured result, live-process result, convergence witness, native IRIS audit evidence, stable receipt identity, and durable history.

For the certified centerpiece, open:

```text
http://localhost:3000/change-cases/verified/maya-patel-supervisor-removal
```

That page presents the recorded certified Maya Patel supervisor-removal receipt and its native IRIS evidence.

## Troubleshooting

### `demo:setup:check` says IRIS is not converged

Inspect first:

```powershell
npm run demo:bootstrap:check
```

If the instance contains only missing frozen objects, apply the bootstrap:

```powershell
npm run demo:bootstrap
```

Existing privilege drift is intentionally a hard failure. Do not "fix" it by broadening roles.

### Docker or IRIS is not ready

Confirm the container exists, is healthy, uses the pinned image, and publishes port 52773:

```powershell
docker ps --filter "name=^/iris-cert$"
docker inspect --format "{{.State.Running}}|{{.State.Health.Status}}|{{.Config.Image}}" iris-cert
```

The API path expects `http://localhost:52773/api/admin`.

### Fixture readiness is blocked

Run:

```powershell
npm run demo:readiness
```

Then use the bounded lifecycle only:

```powershell
npm run demo:cycle
```

Do not substitute `Stop-Process`, `taskkill`, arbitrary PID termination, or an unbounded security reset.

### The app cannot authenticate to IRIS

Start through:

```powershell
npm run demo:start
```

and enter the local `meridian.runtime` password at the masked prompt. Do not put the password in README, `.env.example`, Git, or a command-line argument.

## Claim boundaries

Meridian's core claim is deliberately specific:

> A security change is not finished when configuration changes; it is finished only when the intended authorization delta has propagated to live access and native IRIS evidence can close the Receipt.

Meridian **does not** claim:

- that IRIS security is broken;
- that every IRIS role change produces stale live authority;
- that restarting is always required;
- that Meridian fixes every authorization problem;
- that an API success response alone proves authorization convergence;
- that the browser receives broad administrative credentials;
- that the default runtime has `%All` or `%Admin_Manage`;
- that a generated Swagger document on Build 221U proves every runtime resource behavior.

When the official process endpoint is insufficient for the certified Build 221U evidence path, Meridian uses the bounded `%SYS.ProcessQuery` SELECT fallback rather than broadening runtime administration authority.

## Known limitations

- The certified operator surface is currently Windows/PowerShell-oriented.
- The runtime is pinned to **IRIS 2026.2 Build 221U** for this submission proof.
- A repository-owned Docker Compose/Dockerfile path is not claimed; the supported path is the pinned `docker run` command plus the certified `demo:*` commands.
- `demo:cycle` is intentionally bounded and is not a general-purpose environment reset.
- The Maya Patel route is a recorded certified centerpiece Receipt; it should not be read as a claim that every browser visit re-executes the Maya mutation.
- The final submission video is intentionally deferred until after fresh-reproduction certification and design/submission closure.
- A9C does not add another navigation family or reopen product feature scope.

## Verification

The repository's normal quality gates are:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Fresh-reproduction certification is a separate A9D gate and is not claimed complete by this README alone.
