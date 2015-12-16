var express = require('express');
var router = express.Router();
var turf = require('turf');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Websocket GIS' });
});

module.exports = router;
