var express = require('express'),
  router = express.Router();//,
  //Article = require('../models/article');

var request = require('request');

module.exports = function (app) {
  app.use('/', router);
};

router.get('/*', function (req, res, next) {
  //var url = req.param("path");
  var path = req.url.substring(req.url.indexOf('/'));
  console.log('path   :   '+path);
  request("https://api.mercadolibre.com"+path, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.json(body);
    }
  });
});
