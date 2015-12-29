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
  allowedToReq(ip, path, res, function () {
    request("https://api.mercadolibre.com" + path, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        res.json(body);
        persistReq(ip, path, req.ip, "GET", timestamp, new Date() - timestamp);
      } else answerForbidden(res);
    });
  });
});

function allowedToReq (ip, path, res, resCallback) {
  client.execute("SELECT id, ip, path, ipPath from proxy_stats.configs where id='configs'", function (err, result) {
    handleResult(err, result, function (stat) {
      checkIp(ip, path, stat, res, resCallback);
    });
  });
}

function answerForbidden(res) {
  res.send(400);
}

function checkIp(ip, path, configs, res, resCallback) {
  var allowed = configs.ip;
    if (allowed >= 0) {
    if (allowed == 0) answerForbidden(res);
    else {
      client.execute("SELECT originIp, times from proxy_stats.ip_stats where originIp='"+ip+"';", function (err, result) {
        handleResult(err, result, function (stat) {
          if (stat.times < allowed) checkPath(ip, path, configs, res, resCallback);
          else answerForbidden(res);
        });
      });
    }
  } else checkPath(ip, path, configs, res, resCallback);
}

function checkPath(ip, path, configs, res, resCallback) {
  var allowed = configs.path;
    if (allowed >= 0) {
    if (allowed == 0) answerForbidden(res);
    else {
      client.execute("SELECT path, times from proxy_stats.path_stats where path='"+path+"';", function (err, result) {
        handleResult(err, result, function (stat) {
          if (stat.times < allowed) checkIpPath(ip, path, configs, res, resCallback);
          else answerForbidden(res);
        });
      });
    }
  } else checkIpPath(ip, path, configs, res, resCallback);
}

function checkIpPath(ip, path, configs, res, resCallback) {
  var allowed = configs.ipPath;
    if (allowed >= 0) {
    if (allowed == 0) answerForbidden(res);
    else {
      client.execute("SELECT originIp, path, times from proxy_stats.ip_path_stats where originIp='"+ip+"' and path='"+path+"';", function (err, result) {
        handleResult(err, result, function (stat) {
          if (stat.times < allowed) resCallback();
          else answerForbidden(res);
        });
      });
    }
  } else resCallback();
}

function handleResult(err, result, callback) {
  if (!err && err != null) {
    if (result != undefined && result.rows.length > 0) {
      var stat= result.rows[0];
      callback(stat);
    }
  } else throw err;
}


function persistReq (orIp, path, serviceIp, method, timestamp, responseTime) {
  insertRequest(orIp, path, timestamp, serviceIp, method, responseTime);
  updateIpPath(orIp, path);
  updateIp(orIp);
  updatePath(path);
}

function updateIpPath(orIp, path) {
  client.execute("UPDATE ip_path_stats SET times = times + 1 where originIp='" + orIp + "' and path='" + path + "';", errorHandler);
}
function updateIp(orIp) {
  client.execute("UPDATE ip_stats SET times = times + 1 where originIp='" + orIp + "';" , errorHandler);
}
function updatePath(path) {
  client.execute("UPDATE path_stats SET times = times + 1 where path='" + path + "';" , errorHandler);
}

function insertRequest(orIp, path, timestamp, serviceIp, method, responseTime) {
  client.execute("INSERT INTO requests ( originIp , path , timestamp , targetIp , method , responseTime ) values (" +
    orIp + ", " + path + ", " + timestamp + ", " + serviceIp + ", " + method + ", " + responseTime + ") );", errorHandler);
}

function errorHandler(err) {}
