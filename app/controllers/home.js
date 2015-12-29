var express = require('express'),
  router = express.Router(),
  IpPathStatsModel= require('../models/IpPathStatsModel'),
  IpStatsModel= require('../models/IpStatsModel'),
  PathStatsModel= require('../models/PathStatsModel'),
  RequestModel= require('../models/RequestModel');

var request = require('request');
var cassandra = require('cassandra-driver');
var async = require('async');
var client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'proxy_stats'});

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
  client.execute("SELECT id, ip, path, ipPath from proxy_stats.configs where id='configs'", function (err, result) {
  if ((!err || err != null) && result.rows.length > 0) {
    var configs= result.rows[0];
    if (configs.ip >= 0) {
      client.execute("SELECT originIp, times from proxy_stats.ip_stats where originIp='"+ip+"';", function (err, result) {
        if (!err && result.rows.length > 0 && result.rows[0].times >= configs.ip) return false;
      });
    }
    if (configs.path >= 0) {
      client.execute("SELECT path, times from proxy_stats.path_stats where path='"+path+"';", function (err, result) {
        if ((!err || err != null) && result != undefined){
          console.log('result:       ' +result);
          var rows = result.rows;
          if(rows.length > 0 && rows[0].times >= configs.path) {
          return false;
        }
        }
      });
    }
    if (configs.ipPath >= 0) {
      client.execute("SELECT originIp, path, times from proxy_stats.ip_path_stats where originIp='"+ip+"' and path='"+path+"';", function (err, result) {
        if (!err && result.rows.length > 0 && result.rows[0].times >= configs.ipPath) return false;
      });
    }
  }
  else console.log('error    '+result.rows.length)
});
  return true;
}

function persistReq (orIp, path, serviceIp, method, timestamp, responseTime) {
  client.execute("INSERT INTO requests ( originIp , path , timestamp , targetIp , method , responseTime ) values ("+orIp+", "+path+", "+timestamp+", "+serviceIp+", "+method+", "+responseTime+") );"
    , function (err) {

    });
  client.execute("UPDATE ip_path_stats SET times = times + 1 where originIp='"+orIp+"' and path='"+path+"';"
    , function (err) {

    });
  client.execute("UPDATE ip_stats SET times = times + 1 where originIp='"+orIp+"';"
    , function (err) {

    });
  client.execute("UPDATE path_stats SET times = times + 1 where path='"+path+"';"
    , function (err) {

    });
  //console.log("responseTime  :  "+responseTime);
  //console.log("originIp  :  "+orIp);
  //console.log("path  :  "+path);
  //console.log("serviceIp  :  "+serviceIp);
  //console.log("method  :  "+method);
  //console.log("timestamp  :  "+timestamp);
}
