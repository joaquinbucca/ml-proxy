var express = require('express'),
  router = express.Router();//,
  //Article = require('../models/article');

var request = require('request');

module.exports = function (app) {
  app.use('/', router);
};

router.get('/*', function (req, res, next) {
  var timestamp = new Date();
  var url = req.url;
  var path = url.substring(url.indexOf('/'));
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (allowedToReq(ip, path)) {
    request("https://api.mercadolibre.com" + path, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        res.json(body);
        persistReq(ip, path, req.ip, "GET", timestamp, new Date() - timestamp);
      }
    });
  }
});

function allowedToReq (ip, path) {
  return true;
}

function persistReq (originIp, path, serviceIp, method, timestamp, responseTime) {
  console.log("responseTime  :  "+responseTime);
  console.log("originIp  :  "+originIp);
  console.log("path  :  "+path);
  console.log("serviceIp  :  "+serviceIp);
  console.log("method  :  "+method);
  console.log("timestamp  :  "+timestamp);
}
