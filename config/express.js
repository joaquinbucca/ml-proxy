var express = require('express');
var glob = require('glob');

var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var compress = require('compression');
var methodOverride = require('method-override');
var cassandra = require('cassandra-driver');
var async = require('async');



module.exports = function(app, config) {
  var env = process.env.NODE_ENV || 'development';
  app.locals.ENV = env;
  app.locals.ENV_DEVELOPMENT = env == 'development';

  app.set('views', config.root + '/app/views');
  app.set('view engine', 'jade');

  // app.use(favicon(config.root + '/public/img/favicon.ico'));
  app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(cookieParser());
  app.use(compress());
  app.use(express.static(config.root + '/public'));
  app.use(methodOverride());

  var controllers = glob.sync(config.root + '/app/controllers/*.js');
  controllers.forEach(function (controller) {
    require(controller)(app);
  });

  var client = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'proxy_stats'});
  //client.execute("CREATE KEYSPACE proxy_stats WITH REPLICATION = { 'class' : 'NetworkTopologyStrategy', 'datacenter1' : 1 };"
  //  , function (err) {
  //
  //});
  client.execute("CREATE TABLE requests ( originIp varchar, path varchar, timestamp varchar, targetIp varchar, method varchar, responseTime int, PRIMARY KEY (originIp, path, timestamp) );"
    , function (err) {

  });
  client.execute("CREATE TABLE configs ( id varchar, ip int, path int, ipPath int, PRIMARY KEY (id) );"
    , function (err) {
      if (err) console.log('aqui  '+err)
  });
  client.execute("INSERT INTO configs ( id, ip, path, ipPath ) values ('configs', -1, 4, -1);"
    , function (err) {
      if (err) console.log('aquaaaa')

  });
  client.execute("CREATE TABLE ip_stats ( originIp varchar, times counter, PRIMARY KEY (originIp) );"
    , function (err) {

  });
  client.execute("CREATE TABLE path_stats ( path varchar, times counter, PRIMARY KEY (path) );"
    , function (err) {

  });
  client.execute("CREATE TABLE ip_path_stats ( originIp varchar, path varchar, times counter, PRIMARY KEY (originIp, path) );"
    , function (err) {

  });
  client.execute("SELECT id, ip, path, ipPath from proxy_stats.configs where id='configs'", function (err, result) {
    if (!err) console.log('id:      '+result.rows[0].id);
    else console.log('error    '+err)
  });
  //var configs= new models.instance.Configs({configs: "configs", ip: -1, path: 4, ipPath: -1});
  //configs.save(function (err) {
  //  if (err) console.log(err);
  //});

  app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  if(app.get('env') === 'development'){
    app.use(function (err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: err,
        title: 'error'
      });
    });
  }

  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: {},
        title: 'error'
      });
  });

};
