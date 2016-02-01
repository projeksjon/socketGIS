var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var app = express();
var cors = require("cors");
var io = require('./io');
var jsts = require("jsts");

app.use(cors());

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('node-sass-middleware')({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public'),
    indentedSyntax: true,
    sourceMap: true
}));

//Serve the static folder and the index file
app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
    //Connect to dev db.
    mongoose.connect('mongodb://localhost:27017/gisdb');
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


var geoFeature = new Schema({
    loc: {
        type: {
            type: String,
            enum: ["Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon"]},
        coordinates:[]
    }
});
geoFeature.index({ loc: "2dsphere" });

var Point = mongoose.model('Point', geoFeature);
var Polygon = mongoose.model('Polygon', geoFeature);
var LineString = mongoose.model('LineString', geoFeature);

function sendData(){
    console.log('Sent data');
    Point.find({}, function(err, points){
        //Broadcast all points
        io.emit('all points', points);
    });

    LineString.find({}, function(err, lines){
        io.emit('all lines', lines);
    });
    Polygon.find({}, function(err, polys){
        io.emit('all polys', polys);
    });
}

//Socket connection found
io.on('connection', function(socket){
    console.log('User connected');
    setTimeout(sendData, 200);
    socket.on('add point', function(point){
        Point.create({loc: {type:'Point', coordinates: point.geometry.coordinates}}, function (err, point){
            //Catch the error.
            if (err) console.log(err);
            socket.broadcast.emit('new point', point);
            console.log('added');
        });
    });

    socket.on('add line', function(line){
        LineString.create({ loc:  {type:'LineString', coordinates: line.geometry.coordinates}}, function (err, line){
            //Catch the error.
            if (err) console.log(err);
            console.log('added line');
            socket.broadcast.emit('new line', line);
        });
    });
    socket.on('add poly', function(poly){
        Polygon.create({ loc:  {type:'Polygon', coordinates: poly.geometry.coordinates}}, function (err, poly){
            //Catch the error.
            if (err) console.log(err);
            console.log('added poly');
            socket.broadcast.emit('new poly', poly);
        });
    });

    socket.on('delete point', function(id){
        console.log('delete point');
        Point.remove({_id: id},function(err,p){
            if (err) console.log(err);
        });
    });
    socket.on('delete line', function(id){
        LineString.remove({_id: id},function(err,p){
            if (err) console.log(err);
        });
    });

    socket.on('delete poly', function(id){
        Polygon.remove({_id: id},function(err,p){
            if (err) console.log(err);
        });
    });

    //Use jtst so make a buffer around the features.
    socket.on('bufferFeature', function(buffer){
        makeBuffer(buffer.feature, buffer.distance);
    });

    socket.on('chat message', function(msg){
        io.emit('chat message', msg);
    })

});

//JSTS parser to read geojson ++
var reader = new jsts.io.GeoJSONReader();
var writer = new jsts.io.GeoJSONWriter();



function makeBuffer(feature, distance){
    var jstsGeom = reader.read(feature).geometry;
    var buffered = jstsGeom.buffer(distance);
    io.emit('done buffering', JSON.stringify(writer.write(buffered)));
}

module.exports = app;
