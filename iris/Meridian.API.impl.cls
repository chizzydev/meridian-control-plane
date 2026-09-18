/// Controlled REST surface for Meridian authorization-convergence certification<br/>
/// Business logic class defined by OpenAPI in Meridian.API.spec<br/>
/// Created Sep 15, 2026 04:38:46
Class Meridian.API.impl Extends %REST.Impl [ ProcedureBlock ]
{

/// If ExposeServerExceptions is true, then details of internal errors will be exposed.
Parameter ExposeServerExceptions = 0;

/// List Meridian orders
ClassMethod listOrders() As %DynamicObject
{
    //(Place business logic here)
    //Do ..%SetStatusCode(<HTTP_status_code>)
    //Do ..%SetHeader(<name>,<value>)
    //Quit (Place response here) ; response may be a string, stream or dynamic object
}

/// Update a Meridian order<br/>
/// The method arguments hold values for:<br/>
///     id<br/>
ClassMethod updateOrder(id As %String) As %DynamicObject
{
    //(Place business logic here)
    //Do ..%SetStatusCode(<HTTP_status_code>)
    //Do ..%SetHeader(<name>,<value>)
    //Quit (Place response here) ; response may be a string, stream or dynamic object
}

/// Run a Meridian job<br/>
/// The method arguments hold values for:<br/>
///     id<br/>
ClassMethod runJob(id As %String) As %DynamicObject
{
    //(Place business logic here)
    //Do ..%SetStatusCode(<HTTP_status_code>)
    //Do ..%SetHeader(<name>,<value>)
    //Quit (Place response here) ; response may be a string, stream or dynamic object
}

/// Reload Meridian administrative cache
ClassMethod reloadAdminCache() As %DynamicObject
{
    //(Place business logic here)
    //Do ..%SetStatusCode(<HTTP_status_code>)
    //Do ..%SetHeader(<name>,<value>)
    //Quit (Place response here) ; response may be a string, stream or dynamic object
}

/// Run an IRIS task through Meridian<br/>
/// The method arguments hold values for:<br/>
///     id<br/>
ClassMethod runTask(id As %String) As %DynamicObject
{
    //(Place business logic here)
    //Do ..%SetStatusCode(<HTTP_status_code>)
    //Do ..%SetHeader(<name>,<value>)
    //Quit (Place response here) ; response may be a string, stream or dynamic object
}

}
