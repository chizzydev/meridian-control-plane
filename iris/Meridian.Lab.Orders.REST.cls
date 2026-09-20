Class Meridian.Lab.Orders.REST Extends %CSP.REST [ ProcedureBlock ]
{

Parameter CONTENTTYPE = "application/json";

Parameter CHARSET = "utf-8";

Parameter UseSession = 0;

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
<Route Url="/health" Method="GET" Call="Health"/>
</Routes>
}

ClassMethod Health() As %Status
{
    set out={}
    set out.ok=1
    set out.fixtureId="meridian-lab-orders"
    set out.generation="r3b-web-app-v1"
    set out.service="orders"
    set out.state="READY"
    set %response.ContentType="application/json"
    write out.%ToJSON()
    quit 1
}

}
