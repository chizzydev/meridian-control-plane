Class Meridian.ControlPlane.History.REST Extends %CSP.REST [ ProcedureBlock ]
{

Parameter CONTENTTYPE = "application/json";
Parameter CHARSET = "utf-8";
Parameter UseSession = 0;

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
<Route Url="/receipts" Method="POST" Call="PersistReceipt"/>
<Route Url="/receipts/:receiptId" Method="GET" Call="GetReceipt"/>
<Route Url="/history/:username" Method="GET" Call="ListHistory"/>
<Route Url="/action-receipts" Method="POST" Call="PersistActionReceipt"/>
<Route Url="/action-receipts/:receiptId" Method="GET" Call="GetActionReceipt"/>
<Route Url="/action-history/:targetCanonicalId" Method="GET" Call="ListActionHistory"/>
<Route Url="/cases" Method="POST" Call="CreateCase"/>
<Route Url="/cases/:caseId/events" Method="GET" Call="ListCaseEvents"/>
<Route Url="/cases/:caseId/events" Method="POST" Call="AppendCaseEvent"/>
<Route Url="/cases/:caseId" Method="GET" Call="GetCase"/>
</Routes>
}

ClassMethod WriteError(status As %String, code As %String, message As %String) As %Status
{
    set %response.Status=status
    set %response.ContentType="application/json"
    set out={}
    set out.ok=0
    set out.code=code
    set out.message=message
    write out.%ToJSON()
    return $$$OK
}

ClassMethod RequiredString(record As %DynamicObject, name As %String, Output value As %String) As %Boolean
{
    set value=""

    try {
        set value=record.%Get(name)
    } catch ex {
        set value=""
    }

    if value="" {
        quit 0
    }

    quit 1
}

ClassMethod SummaryFromRecord(record As %DynamicObject) As %DynamicObject
{
    set summary={}

    set summary.schemaVersion=record.schemaVersion
    set summary.receiptId=record.receiptId
    set summary.username=record.username
    set summary.displayName=record.displayName
    set summary.operation=record.operation
    set summary.role=record.role
    set summary.lifecycleState=record.lifecycleState
    set summary.reviewedPreflightDigest=record.reviewedPreflightDigest
    set summary.freshApplyTimePreflightDigest=record.freshApplyTimePreflightDigest
    set summary.receiptSha256=record.receiptSha256
    set summary.applyUtc=record.applyUtc
    set summary.applyActor=record.applyActor
    set summary.applyPid=record.applyPid
    set summary.nativeAuditSystemId=record.nativeAuditSystemId
    set summary.nativeAuditIndex=record.nativeAuditIndex
    set summary.nativeAuditUtc=record.nativeAuditUtc
    set summary.nativeAuditEvent=record.nativeAuditEvent
    set summary.nativeAuditActor=record.nativeAuditActor

    quit summary
}

ClassMethod PersistReceipt() As %Status
{
    set raw=%request.Content.Read()

    if raw="" {
        return ..WriteError(
            "400 Bad Request",
            "RECEIPT_HISTORY_BODY_REQUIRED",
            "A verified receipt-history record is required."
        )
    }

    try {
        set record={}.%FromJSON(raw)
    } catch ex {
        return ..WriteError(
            "400 Bad Request",
            "RECEIPT_HISTORY_JSON_INVALID",
            "The receipt-history request body is not valid JSON."
        )
    }

    if '$isobject(record) {
        return ..WriteError(
            "400 Bad Request",
            "RECEIPT_HISTORY_RECORD_REQUIRED",
            "The receipt-history payload must be an object."
        )
    }

    set required="schemaVersion,receiptId,username,displayName,operation,role,lifecycleState,reviewedPreflightDigest,freshApplyTimePreflightDigest,receiptSha256,receiptJson,applyUtc,applyActor,applyPid,nativeAuditSystemId,nativeAuditIndex,nativeAuditUtc,nativeAuditEvent,nativeAuditActor"

    for index=1:1:$length(required,",") {
        set name=$piece(required,",",index)
        if '..RequiredString(record,name,.value) {
            return ..WriteError(
                "400 Bad Request",
                "RECEIPT_HISTORY_FIELD_REQUIRED",
                "A required receipt-history field is missing: "_name
            )
        }
    }

    if record.schemaVersion'="meridian.receipt-history.v1" {
        return ..WriteError(
            "400 Bad Request",
            "RECEIPT_HISTORY_SCHEMA_INVALID",
            "Unsupported receipt-history schema."
        )
    }

    if record.lifecycleState'="VERIFIED" {
        return ..WriteError(
            "400 Bad Request",
            "RECEIPT_HISTORY_NOT_VERIFIED",
            "Only VERIFIED receipts may enter persistent history."
        )
    }

    set receiptId=record.receiptId
    set username=record.username

    if $data(^Meridian.ControlPlane.History("receipt",receiptId,"json")) {
        set existingJson=^Meridian.ControlPlane.History("receipt",receiptId,"json")
        set existingSha=^Meridian.ControlPlane.History("receipt",receiptId,"sha256")

        if (existingJson=record.receiptJson),(existingSha=record.receiptSha256) {
            set summaryJson=^Meridian.ControlPlane.History("receipt",receiptId,"summary")
            set summary={}.%FromJSON(summaryJson)
            set out={}
            set out.ok=1
            set out.status="IDEMPOTENT"
            set out.record=summary
            set %response.Status="200 OK"
            set %response.ContentType="application/json"
            write out.%ToJSON()
            return $$$OK
        }

        return ..WriteError(
            "409 Conflict",
            "RECEIPT_HISTORY_ID_CONFLICT",
            "The receipt id already exists with different immutable content."
        )
    }

    set summary=..SummaryFromRecord(record)
    set summaryJson=summary.%ToJSON()

    tstart

    try {
        set ^Meridian.ControlPlane.History("receipt",receiptId,"json")=record.receiptJson
        set ^Meridian.ControlPlane.History("receipt",receiptId,"sha256")=record.receiptSha256
        set ^Meridian.ControlPlane.History("receipt",receiptId,"summary")=summaryJson
        set ^Meridian.ControlPlane.History("by-user",username,receiptId)=1
        tcommit
    } catch ex {
        trollback
        return ..WriteError(
            "500 Internal Server Error",
            "RECEIPT_HISTORY_WRITE_FAILED",
            "IRIS could not persist the verified receipt."
        )
    }

    set out={}
    set out.ok=1
    set out.status="CREATED"
    set out.record=summary

    set %response.Status="201 Created"
    set %response.ContentType="application/json"
    write out.%ToJSON()

    return $$$OK
}

ClassMethod GetReceipt(receiptId As %String) As %Status
{
    if receiptId="" {
        return ..WriteError(
            "400 Bad Request",
            "RECEIPT_HISTORY_ID_REQUIRED",
            "Receipt id is required."
        )
    }

    if '$data(^Meridian.ControlPlane.History("receipt",receiptId,"json")) {
        return ..WriteError(
            "404 Not Found",
            "RECEIPT_HISTORY_NOT_FOUND",
            "The requested receipt was not found."
        )
    }

    set summaryJson=^Meridian.ControlPlane.History("receipt",receiptId,"summary")
    set record={}.%FromJSON(summaryJson)
    set record.receiptJson=^Meridian.ControlPlane.History("receipt",receiptId,"json")

    set out={}
    set out.ok=1
    set out.record=record

    set %response.Status="200 OK"
    set %response.ContentType="application/json"
    write out.%ToJSON()

    return $$$OK
}

ClassMethod ListHistory(username As %String) As %Status
{
    if username="" {
        return ..WriteError(
            "400 Bad Request",
            "RECEIPT_HISTORY_USERNAME_REQUIRED",
            "Username is required."
        )
    }

    set records=[]
    set receiptId=""

    for {
        set receiptId=$order(^Meridian.ControlPlane.History("by-user",username,receiptId))
        quit:receiptId=""

        if $data(^Meridian.ControlPlane.History("receipt",receiptId,"summary")) {
            set summaryJson=^Meridian.ControlPlane.History("receipt",receiptId,"summary")
            set summary={}.%FromJSON(summaryJson)
            do records.%Push(summary)
        }
    }

    set out={}
    set out.ok=1
    set out.records=records

    set %response.Status="200 OK"
    set %response.ContentType="application/json"
    write out.%ToJSON()

    return $$$OK
}

ClassMethod ActionSummaryFromRecord(record As %DynamicObject) As %DynamicObject
{
    set summary={}

    set summary.schemaVersion=record.schemaVersion
    set summary.receiptId=record.receiptId
    set summary.actionId=record.actionId
    set summary.actionType=record.actionType
    set summary.domain=record.domain
    set summary.targetKind=record.targetKind
    set summary.targetCanonicalId=record.targetCanonicalId
    set summary.targetDisplayName=record.targetDisplayName
    set summary.lifecycleState=record.lifecycleState
    set summary.receiptSha256=record.receiptSha256
    set summary.applyUtc=record.applyUtc
    set summary.applyActor=record.applyActor

    quit summary
}

ClassMethod PersistActionReceipt() As %Status
{
    set raw=%request.Content.Read()

    if raw="" {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_BODY_REQUIRED",
            "A verified generic Action Receipt history record is required."
        )
    }

    try {
        set record={}.%FromJSON(raw)
    } catch ex {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_JSON_INVALID",
            "The generic Action Receipt history body is not valid JSON."
        )
    }

    if '$isobject(record) {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_RECORD_REQUIRED",
            "The generic Action Receipt history payload must be an object."
        )
    }

    set required="schemaVersion,receiptId,actionId,actionType,domain,targetKind,targetCanonicalId,targetDisplayName,lifecycleState,receiptSha256,receiptJson,applyUtc,applyActor"

    for index=1:1:$length(required,",") {
        set name=$piece(required,",",index)
        if '..RequiredString(record,name,.value) {
            return ..WriteError(
                "400 Bad Request",
                "ACTION_RECEIPT_HISTORY_FIELD_REQUIRED",
                "A required generic Action Receipt history field is missing: "_name
            )
        }
    }

    if record.schemaVersion'="meridian.action-receipt-history.v1" {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_SCHEMA_INVALID",
            "Unsupported generic Action Receipt history schema."
        )
    }

    if record.lifecycleState'="VERIFIED" {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_NOT_VERIFIED",
            "Only VERIFIED Action Receipts may enter generic persistent history."
        )
    }

    try {
        set receipt={}.%FromJSON(record.receiptJson)
    } catch ex {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_RECEIPT_JSON_INVALID",
            "The embedded Action Receipt V2 JSON is invalid."
        )
    }

    if '$isobject(receipt) {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_RECEIPT_REQUIRED",
            "The embedded Action Receipt V2 must be an object."
        )
    }

    if receipt.schemaVersion'="meridian.action-receipt.v2" {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_RECEIPT_SCHEMA_INVALID",
            "The embedded receipt is not Action Receipt V2."
        )
    }

    if (receipt.receiptId'=record.receiptId)!(receipt.actionId'=record.actionId)!(receipt.actionType'=record.actionType)!(receipt.domain'=record.domain) {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_IDENTITY_MISMATCH",
            "The embedded Action Receipt V2 identity differs from the history summary."
        )
    }

    if '$isobject(receipt.target) {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_TARGET_INVALID",
            "The embedded Action Receipt V2 target is missing."
        )
    }

    if (receipt.target.kind'=record.targetKind)!(receipt.target.canonicalId'=record.targetCanonicalId)!(receipt.target.displayName'=record.targetDisplayName) {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_TARGET_MISMATCH",
            "The embedded Action Receipt V2 target differs from the history summary."
        )
    }

    if receipt.receiptSha256'=record.receiptSha256 {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_DIGEST_MISMATCH",
            "The embedded Action Receipt V2 digest differs from the history summary."
        )
    }

    set receiptId=record.receiptId
    set targetCanonicalId=record.targetCanonicalId

    lock +^Meridian.ControlPlane.History("action-receipt",receiptId):5
    if '$test {
        return ..WriteError(
            "409 Conflict",
            "ACTION_RECEIPT_HISTORY_LOCK_TIMEOUT",
            "The generic Action Receipt history record is busy."
        )
    }

    if $data(^Meridian.ControlPlane.History("action-receipt",receiptId,"json")) {
        set existingJson=^Meridian.ControlPlane.History("action-receipt",receiptId,"json")
        set existingSha=^Meridian.ControlPlane.History("action-receipt",receiptId,"sha256")

        if (existingJson=record.receiptJson),(existingSha=record.receiptSha256) {
            set summaryJson=^Meridian.ControlPlane.History("action-receipt",receiptId,"summary")
            set summary={}.%FromJSON(summaryJson)
            set out={}
            set out.ok=1
            set out.status="IDEMPOTENT"
            set out.record=summary
            lock -^Meridian.ControlPlane.History("action-receipt",receiptId)
            set %response.Status="200 OK"
            set %response.ContentType="application/json"
            write out.%ToJSON()
            return $$$OK
        }

        lock -^Meridian.ControlPlane.History("action-receipt",receiptId)

        return ..WriteError(
            "409 Conflict",
            "ACTION_RECEIPT_HISTORY_ID_CONFLICT",
            "The generic Action Receipt id already exists with different immutable content."
        )
    }

    set summary=..ActionSummaryFromRecord(record)
    set summaryJson=summary.%ToJSON()

    tstart

    try {
        set ^Meridian.ControlPlane.History("action-receipt",receiptId,"json")=record.receiptJson
        set ^Meridian.ControlPlane.History("action-receipt",receiptId,"sha256")=record.receiptSha256
        set ^Meridian.ControlPlane.History("action-receipt",receiptId,"summary")=summaryJson
        set ^Meridian.ControlPlane.History("action-by-target",targetCanonicalId,receiptId)=1
        tcommit
    } catch ex {
        trollback
        lock -^Meridian.ControlPlane.History("action-receipt",receiptId)

        return ..WriteError(
            "500 Internal Server Error",
            "ACTION_RECEIPT_HISTORY_WRITE_FAILED",
            "IRIS could not persist the generic Action Receipt."
        )
    }

    lock -^Meridian.ControlPlane.History("action-receipt",receiptId)

    set out={}
    set out.ok=1
    set out.status="CREATED"
    set out.record=summary

    set %response.Status="201 Created"
    set %response.ContentType="application/json"
    write out.%ToJSON()

    return $$$OK
}

ClassMethod GetActionReceipt(receiptId As %String) As %Status
{
    if receiptId="" {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_ID_REQUIRED",
            "Generic Action Receipt id is required."
        )
    }

    if '$data(^Meridian.ControlPlane.History("action-receipt",receiptId,"json")) {
        return ..WriteError(
            "404 Not Found",
            "ACTION_RECEIPT_HISTORY_NOT_FOUND",
            "The requested generic Action Receipt was not found."
        )
    }

    set summaryJson=^Meridian.ControlPlane.History("action-receipt",receiptId,"summary")
    set record={}.%FromJSON(summaryJson)
    set record.receiptJson=^Meridian.ControlPlane.History("action-receipt",receiptId,"json")

    set out={}
    set out.ok=1
    set out.record=record

    set %response.Status="200 OK"
    set %response.ContentType="application/json"
    write out.%ToJSON()

    return $$$OK
}

ClassMethod ListActionHistory(targetCanonicalId As %String) As %Status
{
    if targetCanonicalId="" {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_TARGET_REQUIRED",
            "Generic Action Receipt target id is required."
        )
    }

    set targetCanonicalId=##class(%CSP.Page).UnescapeURL(targetCanonicalId,"UTF8")

    if targetCanonicalId="" {
        return ..WriteError(
            "400 Bad Request",
            "ACTION_RECEIPT_HISTORY_TARGET_REQUIRED",
            "Generic Action Receipt target id is required after canonical URL decoding."
        )
    }

    set records=[]
    set receiptId=""

    for {
        set receiptId=$order(^Meridian.ControlPlane.History("action-by-target",targetCanonicalId,receiptId))
        quit:receiptId=""

        if $data(^Meridian.ControlPlane.History("action-receipt",receiptId,"summary")) {
            set summaryJson=^Meridian.ControlPlane.History("action-receipt",receiptId,"summary")
            set summary={}.%FromJSON(summaryJson)
            do records.%Push(summary)
        }
    }

    set out={}
    set out.ok=1
    set out.records=records

    set %response.Status="200 OK"
    set %response.ContentType="application/json"
    write out.%ToJSON()

    return $$$OK
}ClassMethod IsAllowedCaseState(state As %String) As %Boolean
{
    set allowed=",PROPOSED,PREFLIGHTED,READY,APPLIED,CONVERGING,AUDIT_PENDING,VERIFIED,STALE,APPLY_FAILED,"
    return $find(allowed,","_state_",")>0
}

ClassMethod IsAllowedEventType(eventType As %String) As %Boolean
{
    set allowed=",CASE_CREATED,PREFLIGHT_COMPLETED,REVIEW_ACCEPTED,APPLY_REVALIDATION_MATCHED,APPLY_REVALIDATION_STALE,APPLY_ATTEMPT_STARTED,APPLY_SUCCEEDED,APPLY_FAILED,CONFIGURED_STATE_VERIFIED,LIVE_STALE_OBSERVED,OLD_WITNESS_CLOSED,OLD_PID_GONE,FRESH_WITNESS_BOUND,LIVE_CONVERGED,AUDIT_PENDING,AUDIT_BOUND,RECEIPT_WRITE_STARTED,RECEIPT_PERSISTED,RECEIPT_READBACK_VERIFIED,CASE_VERIFIED,"
    return $find(allowed,","_eventType_",")>0
}

ClassMethod IsAllowedCaseTransition(fromState As %String, toState As %String) As %Boolean
{
    if (fromState="PROPOSED"),(toState="PREFLIGHTED") return 1
    if (fromState="PREFLIGHTED"),(toState="READY") return 1
    if (fromState="READY"),(toState="APPLIED") return 1
    if (fromState="READY"),(toState="STALE") return 1
    if (fromState="READY"),(toState="APPLY_FAILED") return 1
    if (fromState="APPLIED"),(toState="CONVERGING") return 1
    if (fromState="APPLIED"),(toState="AUDIT_PENDING") return 1
    if (fromState="CONVERGING"),(toState="VERIFIED") return 1
    if (fromState="CONVERGING"),(toState="AUDIT_PENDING") return 1
    if (fromState="AUDIT_PENDING"),(toState="VERIFIED") return 1
    if (fromState="STALE"),(toState="PREFLIGHTED") return 1
    if (fromState="APPLY_FAILED"),(toState="PREFLIGHTED") return 1
    return 0
}

ClassMethod EventOwnsCaseTransition(eventType As %String, fromState As %String, toState As %String) As %Boolean
{
    if eventType="CASE_CREATED" return 0

    if eventType="PREFLIGHT_COMPLETED",fromState="PROPOSED",toState="PREFLIGHTED" return 1
    if eventType="PREFLIGHT_COMPLETED",fromState="STALE",toState="PREFLIGHTED" return 1
    if eventType="PREFLIGHT_COMPLETED",fromState="APPLY_FAILED",toState="PREFLIGHTED" return 1
    if eventType="REVIEW_ACCEPTED",fromState="PREFLIGHTED",toState="READY" return 1
    if eventType="APPLY_REVALIDATION_STALE",fromState="READY",toState="STALE" return 1
    if eventType="APPLY_FAILED",fromState="READY",toState="APPLY_FAILED" return 1
    if eventType="CONFIGURED_STATE_VERIFIED",fromState="READY",toState="APPLIED" return 1
    if eventType="LIVE_STALE_OBSERVED",fromState="APPLIED",toState="CONVERGING" return 1
    if eventType="AUDIT_PENDING",fromState="APPLIED",toState="AUDIT_PENDING" return 1
    if eventType="AUDIT_PENDING",fromState="CONVERGING",toState="AUDIT_PENDING" return 1
    if eventType="CASE_VERIFIED",fromState="CONVERGING",toState="VERIFIED" return 1
    if eventType="CASE_VERIFIED",fromState="AUDIT_PENDING",toState="VERIFIED" return 1

    if eventType="APPLY_REVALIDATION_MATCHED",fromState="READY",toState="READY" return 1
    if eventType="APPLY_ATTEMPT_STARTED",fromState="READY",toState="READY" return 1
    if eventType="APPLY_SUCCEEDED",fromState="READY",toState="READY" return 1

    if eventType="OLD_WITNESS_CLOSED",fromState="CONVERGING",toState="CONVERGING" return 1
    if eventType="OLD_PID_GONE",fromState="CONVERGING",toState="CONVERGING" return 1
    if eventType="FRESH_WITNESS_BOUND",fromState="CONVERGING",toState="CONVERGING" return 1
    if eventType="LIVE_CONVERGED",fromState="CONVERGING",toState="CONVERGING" return 1

    if eventType="AUDIT_BOUND",fromState="CONVERGING",toState="CONVERGING" return 1
    if eventType="AUDIT_BOUND",fromState="AUDIT_PENDING",toState="AUDIT_PENDING" return 1
    if eventType="RECEIPT_WRITE_STARTED",fromState="CONVERGING",toState="CONVERGING" return 1
    if eventType="RECEIPT_WRITE_STARTED",fromState="AUDIT_PENDING",toState="AUDIT_PENDING" return 1
    if eventType="RECEIPT_PERSISTED",fromState="CONVERGING",toState="CONVERGING" return 1
    if eventType="RECEIPT_PERSISTED",fromState="AUDIT_PENDING",toState="AUDIT_PENDING" return 1
    if eventType="RECEIPT_READBACK_VERIFIED",fromState="CONVERGING",toState="CONVERGING" return 1
    if eventType="RECEIPT_READBACK_VERIFIED",fromState="AUDIT_PENDING",toState="AUDIT_PENDING" return 1

    return 0
}

ClassMethod ValidateFixedCaseAuthority(record As %DynamicObject) As %Boolean
{
    try {
        if '$isobject(record) return 0
        if record.schemaVersion'="meridian.live-change-case.v1" return 0
        if record.mode'="LIVE_ISOLATED_DEMO" return 0
        if record.caseId="" return 0
        if '..IsAllowedCaseState(record.state) return 0
        if +record.version<1 return 0
        if record.createdAtUtc="" return 0
        if record.updatedAtUtc="" return 0

        set fixture=record.fixture
        if '$isobject(fixture) return 0
        if fixture.fixtureId'="meridian-live-demo-v1" return 0
        if fixture.username'="meridian.demo.witness" return 0
        if fixture.targetRole'="MeridianSupervisor" return 0
        if fixture.expectedGeneration="" return 0

        set intent=record.intent
        if '$isobject(intent) return 0
        if intent.operation'="REMOVE" return 0
        if intent.targetRole'="MeridianSupervisor" return 0
    } catch ex {
        return 0
    }

    return 1
}

ClassMethod CaseEvents(caseId As %String) As %DynamicArray
{
    set events=[]
    set count=+$get(^Meridian.ControlPlane.History("case",caseId,"event-count"),0)

    for sequence=1:1:count {
        if $data(^Meridian.ControlPlane.History("case",caseId,"event",sequence)) {
            set eventJson=^Meridian.ControlPlane.History("case",caseId,"event",sequence)
            set event={}.%FromJSON(eventJson)
            do events.%Push(event)
        }
    }

    return events
}

ClassMethod CaseSnapshot(caseId As %String) As %DynamicObject
{
    set snapshot={}
    set recordJson=^Meridian.ControlPlane.History("case",caseId,"record")
    set snapshot.record={}.%FromJSON(recordJson)
    set snapshot.events=..CaseEvents(caseId)
    return snapshot
}

ClassMethod CreateCase() As %Status
{
    set raw=%request.Content.Read()

    if raw="" {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_BODY_REQUIRED",
            "A durable Change Case record is required."
        )
    }

    try {
        set record={}.%FromJSON(raw)
    } catch ex {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_JSON_INVALID",
            "The durable Change Case request body is not valid JSON."
        )
    }

    if '..ValidateFixedCaseAuthority(record) {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_AUTHORITY_INVALID",
            "The durable Change Case record is outside the fixed A3 isolated authority."
        )
    }

    if record.state'="PROPOSED" {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_CREATE_STATE_INVALID",
            "New durable Change Cases must begin at PROPOSED version 1."
        )
    }

    if +record.version'=1 {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_CREATE_STATE_INVALID",
            "New durable Change Cases must begin at PROPOSED version 1."
        )
    }

    if record.createdAtUtc'=record.updatedAtUtc {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_CREATE_STATE_INVALID",
            "New durable Change Cases must begin at PROPOSED version 1."
        )
    }

    set caseId=record.caseId

    lock +^Meridian.ControlPlane.History("case",caseId):5
    if '$test {
        return ..WriteError(
            "409 Conflict",
            "CHANGE_CASE_LOCK_TIMEOUT",
            "The durable Change Case is busy."
        )
    }

    if $data(^Meridian.ControlPlane.History("case",caseId,"record")) {
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "409 Conflict",
            "CHANGE_CASE_ID_CONFLICT",
            "The durable Change Case id already exists."
        )
    }

    set event={}
    set event.schemaVersion="meridian.live-change-case-event.v1"
    set event.caseId=caseId
    set event.sequence=1
    set event.eventType="CASE_CREATED"
    set event.fromState="NONE"
    set event.toState="PROPOSED"
    set event.versionBefore=0
    set event.versionAfter=1
    set event.occurredAtUtc=record.createdAtUtc
    set event.detailJson="{}"

    set recordJson=record.%ToJSON()
    set eventJson=event.%ToJSON()

    tstart

    try {
        set ^Meridian.ControlPlane.History("case",caseId,"record")=recordJson
        set ^Meridian.ControlPlane.History("case",caseId,"event-count")=1
        set ^Meridian.ControlPlane.History("case",caseId,"event",1)=eventJson
        tcommit
    } catch ex {
        trollback
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "500 Internal Server Error",
            "CHANGE_CASE_CREATE_FAILED",
            "IRIS could not persist the durable Change Case."
        )
    }

    lock -^Meridian.ControlPlane.History("case",caseId)

    set out={}
    set out.ok=1
    set out.status="CREATED"
    set out.snapshot=..CaseSnapshot(caseId)

    set %response.Status="201 Created"
    set %response.ContentType="application/json"
    write out.%ToJSON()

    return $$$OK
}

ClassMethod GetCase(caseId As %String) As %Status
{
    if caseId="" {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_ID_REQUIRED",
            "Case id is required."
        )
    }

    if '$data(^Meridian.ControlPlane.History("case",caseId,"record")) {
        return ..WriteError(
            "404 Not Found",
            "CHANGE_CASE_NOT_FOUND",
            "The requested durable Change Case was not found."
        )
    }

    set out={}
    set out.ok=1
    set out.snapshot=..CaseSnapshot(caseId)

    set %response.Status="200 OK"
    set %response.ContentType="application/json"
    write out.%ToJSON()

    return $$$OK
}

ClassMethod ListCaseEvents(caseId As %String) As %Status
{
    if caseId="" {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_ID_REQUIRED",
            "Case id is required."
        )
    }

    if '$data(^Meridian.ControlPlane.History("case",caseId,"record")) {
        return ..WriteError(
            "404 Not Found",
            "CHANGE_CASE_NOT_FOUND",
            "The requested durable Change Case was not found."
        )
    }

    set out={}
    set out.ok=1
    set out.events=..CaseEvents(caseId)

    set %response.Status="200 OK"
    set %response.ContentType="application/json"
    write out.%ToJSON()

    return $$$OK
}

ClassMethod AppendCaseEvent(caseId As %String) As %Status
{
    if caseId="" {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_ID_REQUIRED",
            "Case id is required."
        )
    }

    set raw=%request.Content.Read()

    if raw="" {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_EVENT_BODY_REQUIRED",
            "A durable Change Case event command is required."
        )
    }

    try {
        set command={}.%FromJSON(raw)
    } catch ex {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_EVENT_JSON_INVALID",
            "The durable Change Case event command is not valid JSON."
        )
    }

    if '$isobject(command) {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_EVENT_COMMAND_REQUIRED",
            "The durable Change Case event command must be an object."
        )
    }

    if command.schemaVersion'="meridian.live-change-case-event-command.v1" {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_EVENT_SCHEMA_INVALID",
            "Unsupported durable Change Case event-command schema."
        )
    }

    if '..RequiredString(command,"eventType",.eventType) {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_EVENT_TYPE_REQUIRED",
            "Event type is required."
        )
    }

    if '..RequiredString(command,"occurredAtUtc",.occurredAtUtc) {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_EVENT_TIME_REQUIRED",
            "Event timestamp is required."
        )
    }

    if '..RequiredString(command,"detailJson",.detailJson) {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_EVENT_DETAIL_REQUIRED",
            "Event detail JSON is required."
        )
    }

    if '..IsAllowedEventType(eventType) {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_EVENT_TYPE_INVALID",
            "Event type is not part of the frozen Change Case journal."
        )
    }

    try {
        set expectedVersion=+command.expectedVersion
        set nextRecord=command.record
    } catch ex {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_EVENT_RECORD_REQUIRED",
            "Expected version and next durable record are required."
        )
    }

    if expectedVersion<1 {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_EXPECTED_VERSION_INVALID",
            "Expected version must be a positive integer."
        )
    }

    if '..ValidateFixedCaseAuthority(nextRecord) {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_AUTHORITY_INVALID",
            "The next durable Change Case record is outside the fixed A3 isolated authority."
        )
    }

    if nextRecord.caseId'=caseId {
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_ID_MISMATCH",
            "The route case id and next durable record case id differ."
        )
    }

    lock +^Meridian.ControlPlane.History("case",caseId):5
    if '$test {
        return ..WriteError(
            "409 Conflict",
            "CHANGE_CASE_LOCK_TIMEOUT",
            "The durable Change Case is busy."
        )
    }

    if '$data(^Meridian.ControlPlane.History("case",caseId,"record")) {
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "404 Not Found",
            "CHANGE_CASE_NOT_FOUND",
            "The requested durable Change Case was not found."
        )
    }

    try {
        set currentJson=^Meridian.ControlPlane.History("case",caseId,"record")
        set current={}.%FromJSON(currentJson)
        set eventCount=+$get(^Meridian.ControlPlane.History("case",caseId,"event-count"),0)
    } catch ex {
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "500 Internal Server Error",
            "CHANGE_CASE_STORED_STATE_INVALID",
            "The durable Change Case stored state could not be read."
        )
    }

    if '..ValidateFixedCaseAuthority(current) {
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "500 Internal Server Error",
            "CHANGE_CASE_STORED_STATE_INVALID",
            "The durable Change Case stored state is outside the fixed authority."
        )
    }

    set currentVersion=+current.version
    set nextVersion=+nextRecord.version

    if eventCount'=currentVersion {
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "500 Internal Server Error",
            "CHANGE_CASE_JOURNAL_INCONSISTENT",
            "The durable Change Case version is not explained by its journal."
        )
    }

    if eventCount<1 {
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "500 Internal Server Error",
            "CHANGE_CASE_JOURNAL_INCONSISTENT",
            "The durable Change Case version is not explained by its journal."
        )
    }

    if expectedVersion'=currentVersion {
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "409 Conflict",
            "CHANGE_CASE_VERSION_CONFLICT",
            "The durable Change Case version is stale."
        )
    }

    if nextVersion'=(currentVersion+1) {
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_NEXT_VERSION_INVALID",
            "The next durable Change Case version must increment exactly once."
        )
    }

    if nextRecord.createdAtUtc'=current.createdAtUtc {
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_CREATED_AT_IMMUTABLE",
            "The durable Change Case creation timestamp is immutable."
        )
    }

    if nextRecord.updatedAtUtc'=occurredAtUtc {
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_EVENT_TIME_MISMATCH",
            "The durable Change Case update timestamp must equal the journal event timestamp."
        )
    }

    set currentFixture=current.fixture
    set nextFixture=nextRecord.fixture

    if nextFixture.expectedGeneration'=currentFixture.expectedGeneration {
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_FIXTURE_GENERATION_IMMUTABLE",
            "The expected fixture generation is immutable."
        )
    }

    set fromState=current.state
    set toState=nextRecord.state

    if (fromState'=toState),'..IsAllowedCaseTransition(fromState,toState) {
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_TRANSITION_INVALID",
            "The requested durable Change Case lifecycle transition is invalid."
        )
    }

    if '..EventOwnsCaseTransition(eventType,fromState,toState) {
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "400 Bad Request",
            "CHANGE_CASE_EVENT_STATE_INVALID",
            "The journal event does not own the requested lifecycle transition."
        )
    }

    set sequence=eventCount+1

    if $data(^Meridian.ControlPlane.History("case",caseId,"event",sequence)) {
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "409 Conflict",
            "CHANGE_CASE_EVENT_SEQUENCE_CONFLICT",
            "The next durable Change Case event sequence already exists."
        )
    }

    set event={}
    set event.schemaVersion="meridian.live-change-case-event.v1"
    set event.caseId=caseId
    set event.sequence=sequence
    set event.eventType=eventType
    set event.fromState=fromState
    set event.toState=toState
    set event.versionBefore=currentVersion
    set event.versionAfter=nextVersion
    set event.occurredAtUtc=occurredAtUtc
    set event.detailJson=detailJson

    set nextJson=nextRecord.%ToJSON()
    set eventJson=event.%ToJSON()

    tstart

    try {
        set ^Meridian.ControlPlane.History("case",caseId,"record")=nextJson
        set ^Meridian.ControlPlane.History("case",caseId,"event-count")=sequence
        set ^Meridian.ControlPlane.History("case",caseId,"event",sequence)=eventJson
        tcommit
    } catch ex {
        trollback
        lock -^Meridian.ControlPlane.History("case",caseId)
        return ..WriteError(
            "500 Internal Server Error",
            "CHANGE_CASE_EVENT_APPEND_FAILED",
            "IRIS could not append the durable Change Case event."
        )
    }

    lock -^Meridian.ControlPlane.History("case",caseId)

    set out={}
    set out.ok=1
    set out.status="APPENDED"
    set out.snapshot=..CaseSnapshot(caseId)

    set %response.Status="200 OK"
    set %response.ContentType="application/json"
    write out.%ToJSON()

    return $$$OK
}

}
