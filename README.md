# Serve Assets
## Description
This module is for serving assets and minifying automatically if you want to.

## Installation
Just run in your console:
```
npm install --save serve-assets

```

## How to use
You can require this module after installing it with npm the following way:

```

"use strict";

var serveAssets = require("serve-assets");
var assetServer = new serveAssets({route:"/assets", path:__dirname+"/assets"});

assetServer.on("asset-changed", function(obj){
  console.log("The following file has been changed on the filesystem: "+obj.realPath);
  console.log("This is on the assets path: "+obj.cPath);
};

```

For example on express use the module this way:

```

"use strict";

var serveAssets = require("serve-assets");
var assetServer = new serveAssets({route:"/assets", path:__dirname+"/assets"});

assetServer.on("asset-changed", function(obj){
  console.log("The following file has been changed on the filesystem: "+obj.realPath);
  console.log("This is on the assets path: "+obj.cPath);
};

var express = require("express");
var app = express();

app.use(assetServer.middleware);

app.listen(3000);


```

## Caching
There is an additional possibility to cache the assets data and the processed data (minified resources). Use for example the static-cache module:

```
"use strict";

var serveAssets = require("serve-assets");
var Cache = require("static-cache");
var cache = new Cache({path: __dirname+"/_cache"});

var assetServer = new serveAssets({route:"/assets", path:__dirname+"/assets", cacheFn: cache.cache, uncacheFn: cache.clean});

```

Now your assets and processed assets get cached. If you change one of your assets, the cached versions from the original and processed assets get uncached automatically. The resource get cached again when the resource is requested the first time.

## Roadmap
The following functionality will be implemented soon:
* Image minifying
* Image resize
* Retina support for images
* Folder packaging with packaging.json (package folder content to one merged file)