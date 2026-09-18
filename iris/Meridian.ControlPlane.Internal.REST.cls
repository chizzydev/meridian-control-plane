Class Meridian.ControlPlane.Internal.REST Extends %CSP.REST [ ProcedureBlock ]
{

Parameter CONTENTTYPE = "application/json";

Parameter CHARSET = "utf-8";

Parameter UseSession = 0;

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
<Route Url="/health" Method="GET" Call="Health"/>
<Route Url="/recurse" Method="GET" Call="Recurse"/>
<Route Url="/permission" Method="GET" Call="Permission"/>


<Route Url="/rest-spec" Method="GET" Call="RestSpec"/>
</Routes>
}

ClassMethod Health() As %Status
{
    set auditMode=$get(%request.Data("audit",1))
    set auditProcessId=$get(%request.Data("auditPid",1))

    if auditMode="userchange" {
        new $namespace
        zn "%SYS"

        set out={}
        set out.ok=0
        set out.executeOK=0
        set out.actor=$USERNAME
        set out.pid=$JOB
        set out.auditTransportVersion="health-v1"
        set out.requestedAuditPid=auditProcessId
        set out.eventSource="%System"
        set out.eventType="%Security"
        set out.event="UserChange"
        set out.usernameFilter="meridian.runtime"

        if auditProcessId="" {
            set queryName="%SYS.Audit:ListByUser"
        } else {
            set queryName="%SYS.Audit:ListByPid"
        }

        set resultSet=##class(%ResultSet).%New(queryName)

        set sc=resultSet.Execute("","","%System","%Security","UserChange","meridian.runtime","",auditProcessId,"","",-1)

        set out.executeOK=$SYSTEM.Status.IsOK(sc)

        if '$SYSTEM.Status.IsOK(sc) {

            set %response.Status="500 Internal Server Error"

            set out.error=$SYSTEM.Status.GetErrorText(sc)

            set %response.ContentType="application/json"

            write out.%ToJSON()

            quit 1
        }

        set rows=[]
        set rowCount=0
        set maxAuditIndex=0

        while resultSet.Next() {

            set item={}

            set item.systemID=resultSet.Get("SystemID")
            set item.auditIndex=resultSet.Get("AuditIndex")
            set item.utcTimeStamp=resultSet.Get("UTCTimeStamp")
            set item.eventSource=resultSet.Get("EventSource")
            set item.eventType=resultSet.Get("EventType")
            set item.event=resultSet.Get("Event")
            set item.pid=resultSet.Get("Pid")
            set item.username=resultSet.Get("Username")
            set item.description=resultSet.Get("Description")
            set item.eventData=resultSet.Get("EventData")
            set item.namespace=resultSet.Get("Namespace")
            set item.roles=resultSet.Get("Roles")
            set item.authentication=resultSet.Get("Authentication")
            set item.status=resultSet.Get("Status")

            do rows.%Push(item)

            set rowCount=rowCount+1

            if +resultSet.Get("AuditIndex")>maxAuditIndex {
                set maxAuditIndex=+resultSet.Get("AuditIndex")
            }
        }

        set out.rows=rows
        set out.rowCount=rowCount
        set out.maxAuditIndex=maxAuditIndex
        set out.ok=1

        set %response.ContentType="application/json"

        write out.%ToJSON()

        quit 1
    }

    set out={}
    set out.ok=1
    set out.user=$USERNAME
    set out.pid=$JOB
    set out.roles=$ROLES
    set out.auditTransportVersion="health-v1"
    set out.resourceUse=$SYSTEM.Security.Check("Meridian_ControlPlane_Internal","USE")
    set out.dbUserRead=$SYSTEM.Security.CheckRolesPermission($ROLES,"%DB_USER","READ")
    set out.dbUserWrite=$SYSTEM.Security.CheckRolesPermission($ROLES,"%DB_USER","WRITE")

    set %response.ContentType="application/json"

    write out.%ToJSON()

    quit 1
}

ClassMethod Recurse() As %Status
{
    set roles=$get(%request.Data("roles",1))
    set out={}
    set out.inputRoles=roles
    set out.user=$USERNAME
    set out.pid=$JOB

    if roles="" {
        set %response.Status="400 Bad Request"
        set out.ok=0
        set out.error="roles query parameter is required"
        set %response.ContentType="application/json"
        write out.%ToJSON()
        quit 1
    }

    set recursed=""
    set sc=$SYSTEM.Security.GetRecursedRoleSet(roles,.recursed)
    set out.ok=$SYSTEM.Status.IsOK(sc)
    set out.recursedRoles=recursed

    if '$SYSTEM.Status.IsOK(sc) {
        set out.error=$SYSTEM.Status.GetErrorText(sc)
    }

    set %response.ContentType="application/json"
    write out.%ToJSON()
    quit 1
}

ClassMethod Permission() As %Status
{
    set roles=$get(%request.Data("roles",1))
    set resource=$get(%request.Data("resource",1))
    set permission=$get(%request.Data("permission",1))
    set out={}
    set out.roles=roles
    set out.resource=resource
    set out.permission=permission
    set out.user=$USERNAME
    set out.pid=$JOB

    if (roles="")!(resource="")!(permission="") {
        set %response.Status="400 Bad Request"
        set out.ok=0
        set out.error="roles, resource and permission are required"
        set %response.ContentType="application/json"
        write out.%ToJSON()
        quit 1
    }

    set allowed=$SYSTEM.Security.CheckRolesPermission(roles,resource,permission)
    set out.ok=1
    set out.allowed=allowed
    set %response.ContentType="application/json"
    write out.%ToJSON()
    quit 1
}

ClassMethod RestSpec() As %Status
{
    set namespace=$get(%request.Data("namespace",1))
    set application=$get(%request.Data("application",1))

    if (namespace="")!(application="") {
        set %response.Status="400 Bad Request"
        set out={}
        set out.ok=0
        set out.error="namespace and application are required"
        set %response.ContentType="application/json"
        write out.%ToJSON()
        quit 1
    }

    if (namespace'="USER")!(application'="/meridian/api") {
        set %response.Status="403 Forbidden"
        set out={}
        set out.ok=0
        set out.error="REST discovery target is outside the certified Meridian scope"
        set %response.ContentType="application/json"
        write out.%ToJSON()
        quit 1
    }

    kill swagger

    set restSc=##class(%REST.API).GetWebRESTApplication(namespace,application,.swagger)

    if '$SYSTEM.Status.IsOK(restSc) {
        set %response.Status="500 Internal Server Error"
        set out={}
        set out.ok=0
        set out.error=$SYSTEM.Status.GetErrorText(restSc)
        set %response.ContentType="application/json"
        write out.%ToJSON()
        quit 1
    }

    if '$isobject(swagger) {
        set %response.Status="500 Internal Server Error"
        set out={}
        set out.ok=0
        set out.error="native REST discovery returned no swagger object"
        set %response.ContentType="application/json"
        write out.%ToJSON()
        quit 1
    }

    set %response.ContentType="application/json"
    write swagger.%ToJSON()

    quit 1
}

}
