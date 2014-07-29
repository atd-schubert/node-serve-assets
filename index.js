"use strict";

var fs = require("fs");
var EventEmitter = require("events").EventEmitter;
var util = require("util");
var mime = require("mime");
var path = require("path");
var uglifyJS = require("uglify-js");
var cleanCSS = require('clean-css')();
var watch = require('watch');


var AssetsServer = function(opts){
  if(!opts || !opts.route || !opts.path) throw new Error("You have to setup a path and a route for the assets-packing-server");
  EventEmitter.call(this);
  
  opts.cacheFn = opts.cacheFn || function(path, content, cb){cb();}; // a cache is optional
  opts.uncacheFn = opts.uncacheFn || function(path, cb){cb();}; // a cache is optional
  var self = this;
  
  if(typeof opts.route !== "string") throw new Error("The route has to have a String");
  
  if(opts.route.substr(-1) !== "/") opts.route+= "/";
  
  var regexpRoute = new RegExp("^"+opts.route.split("/").join("\/"));
  
  watch.watchTree(opts.path, function (f, curr, prev) {
    if (typeof f == "object" && prev === null && curr === null) {
      // Finished walking the tree
    } else if (prev === null) {
      // f is a new file
    } else {//if (curr.nlink === 0) {
      // f was removed
      var cPath = opts.route+f.substr(opts.path.length+1)
      //opts.uncacheFn(cPath); // TODO: not delete all...
      self.emit("asset-changed", {cPath:cPath, realPath:f});
      self.emit("asset-changed-"+cPath, {cPath:cPath, realPath:f});
    /*} else {
      // f was changed
      var cPath = opts.route+f.substr(opts.path.length+1)
      opts.uncacheFn(cPath);*/
    }
  })
  
  this.middleware = function serveAssets(req, res, next){
    if(regexpRoute.test(req.path)) {
      var localPath = opts.path+"/"+req.path.substr(opts.route.length);
      fs.exists(localPath, function(exists){
        if(exists) {
          var stream = fs.createReadStream(localPath);
          
          opts.cacheFn(req.path, fs.createReadStream(localPath));
          self.once("asset-changed-"+req.path, function(event){
            opts.uncacheFn(event.cPath);
          }); 
          
          res.writeHead(200, {"content-type": mime.lookup(localPath)});
          stream.pipe(res);
        }
        else {
          var base = path.basename(localPath);
          if(base.split(".").indexOf("min") !== -1) {
            base = base.split(".");
            
            base.splice(base.indexOf("min"), 1);
            
            var srcPath = path.dirname(localPath)+"/"+base.join(".");
            fs.exists(srcPath, function(exists){
              if(exists) {
                var ct = mime.lookup(srcPath);
                res.writeHead(200, {"content-type": ct});
                
                switch (ct) {
                  case "application/javascript":
                    var min = uglifyJS.minify(srcPath, {outSourceMap: path.basename(req.path)+".map"});
                    self.once("asset-changed-"+srcPath, function(event){
                      opts.uncacheFn(event.cPath);
                      opts.uncacheFn(event.cPath+".map");
                    });
                    opts.cacheFn(req.path, min.code);
                    opts.cacheFn(req.path+".map", min.map);
                    res.end(min.code);
                    break;
                  case "text/css":
                    fs.readFile(srcPath, function(err, data){
                      if(err) return next(err);
                      var min = cleanCSS.minify(data);
                      self.once("asset-changed-"+srcPath, function(event){
                        opts.uncacheFn(event.cPath);
                      }); 
                      opts.cacheFn(req.path, min);
                      res.end(min);
                    });                    
                    break;
                  case "text/plain":
                  default:
                    var stream = fs.createReadStream(srcPath);
                    opts.cacheFn(req.path, fs.createReadStream(srcPath));
                    stream.pipe(res);
                    self.once("asset-changed-"+srcPath, function(event){
                      opts.uncacheFn(event.cPath);
                    });
                  
                }
              }
              else next();
            });
          }
          else next();
        }
      });
    }
    else next();
  };
};

util.inherits(AssetsServer, EventEmitter);

module.exports = AssetsServer;