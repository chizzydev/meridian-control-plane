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

}