Class Meridian.API.spec Extends %REST.Spec [ ProcedureBlock ]
{

/// If Strict=0 (false), then only the swagger properties which are needed for code generation are checked during compile.
/// If Strict=1 (true), then all swagger properties are checked during compile.
Parameter Strict = 1;

XData OpenAPI [ MimeType = application/json ]
{
{
  "swagger":"2.0",
  "info":{
    "title":"Meridian Operations API",
    "version":"1.0.0",
    "description":"Controlled REST surface for Meridian authorization-convergence certification",
    "x-ISC_RequiredResource":[
      "Meridian_Portal:use"
    ]
  },
  "basePath":"/meridian/api",
  "consumes":[
    "application/json"
  ],
  "produces":[
    "application/json"
  ],
  "paths":{
    "/orders":{
      "get":{
        "operationId":"listOrders",
        "summary":"List Meridian orders",
        "x-ISC_RequiredResource":[
          "Meridian_Orders:read"
        ],
        "responses":{
          "200":{
            "description":"Orders returned"
          }
        }
      }
    },
    "/orders/{id}":{
      "patch":{
        "operationId":"updateOrder",
        "summary":"Update a Meridian order",
        "x-ISC_RequiredResource":[
          "Meridian_Orders:write"
        ],
        "parameters":[
          {
            "name":"id",
            "in":"path",
            "required":true,
            "type":"string"
          }
        ],
        "responses":{
          "200":{
            "description":"Order updated"
          }
        }
      }
    },
    "/jobs/{id}/run":{
      "post":{
        "operationId":"runJob",
        "summary":"Run a Meridian job",
        "x-ISC_RequiredResource":[
          "Meridian_Jobs:use"
        ],
        "parameters":[
          {
            "name":"id",
            "in":"path",
            "required":true,
            "type":"string"
          }
        ],
        "responses":{
          "200":{
            "description":"Job started"
          }
        }
      }
    },
    "/admin/cache/reload":{
      "post":{
        "operationId":"reloadAdminCache",
        "summary":"Reload Meridian administrative cache",
        "x-ISC_RequiredResource":[
          "Meridian_Admin:use"
        ],
        "responses":{
          "200":{
            "description":"Cache reloaded"
          }
        }
      }
    },
    "/tasks/{id}/run":{
      "post":{
        "operationId":"runTask",
        "summary":"Run an IRIS task through Meridian",
        "x-ISC_RequiredResource":[
          "%Admin_Task:use"
        ],
        "parameters":[
          {
            "name":"id",
            "in":"path",
            "required":true,
            "type":"string"
          }
        ],
        "responses":{
          "200":{
            "description":"Task started"
          }
        }
      }
    }
  }
}
}

}
