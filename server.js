var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var cors = require('cors');
var io = require('./io');
var jsts = require('jsts');
var passport = require('passport');
var jwt = require('jwt-simple');
var socketioJwt = require('socketio-jwt');
var turf = require('turf');

//Mongoose
mongoose.connect('mongodb://socketgis:socketgis@ds055885.mongolab.com:55885/socketgis');
var User = require('./models/user.js');
var Layer = require('./models/layer.js');
var Point = require('./models/point.js');
var Polygon = require('./models/polygon.js');
var LineString = require('./models/linestring.js');
var File = require('./models/file.js');

//Create instance of express
var app = express();

//Serve the static folder and the index file
app.use(require('node-sass-middleware')({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public'),
    indentedSyntax: true,
    sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// require routes
var routes = require('./routes/api.js');

app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser('keyboard cat'));
app.use(passport.initialize());

// configure passport
passport.use(User.createStrategy());

//Use JWT to authorize the socket connection too.
io.set('authorization', socketioJwt.authorize({
    secret: 'hemmelig',
    handshake: true
}));

// routes
app.use('/user/', routes);

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Ikke funnet');
    err.status = 404;
    next(err);
});

if (app.get('env') === 'development') {
    //Connect to dev db.
    //mongoose.connect('mongodb://localhost:27017/gisdb');
}

module.exports = app;

function sendData() {
    console.log('Sent data');
    Point.find({}, function (err, points) {
        //Broadcast all points
        io.emit('all points', points);
    });

    LineString.find({}, function (err, lines) {
        io.emit('all lines', lines);
    });
    Polygon.find({}, function (err, polys) {
        io.emit('all polys', polys);
    });
}

// Socket connection found
io.on('connection', function (socket) {
    console.log(socket.client.request.decoded_token.username, 'connected');
    socket.on('send files', function () {
        File.find({}, function (err, files) {
            if (err) {
                console.log(err);
            }
            io.emit('all files', files);
        })
    });
    socket.on('getFileLayers', function (fileId) {
        File.findById(fileId)
            .populate('layers')
            .exec(function (err, file) {
                if (err) {
                    console.log(err);
                }
                socket.emit('file layers', file.layers);
            });
    });

    socket.on('add feature', function (geoJson) {
        // Sendt polygon to all other listeners
        io.to(geoJson.id).emit('add feature', geoJson);
        console.log('Added geofeature');
    });

    socket.on('make buffer', function (features, distance, fileId) {
        makeBuffer(features, distance, fileId);
    });

    socket.on('make intersection', function (obj) {
        intersect(obj);
    });

    socket.on('make difference', function (obj) {
        difference(obj);
    });

    socket.on('make union', function (obj) {
        union(obj);
    });

    socket.on('make TIN', function (features, fileId) {
         TIN(features, fileId);

    });


    socket.on('add point', function (point) {
        Point.create({loc: {type: 'Point', coordinates: point.geometry.coordinates}}, function (err, point) {
            //Catch the error.
            if (err) console.log(err);
            //Send to all others than the sender
            socket.broadcast.emit('new point', point);
            console.log('added point');
        });
    });

    socket.on('add line', function (line) {
        LineString.create({loc: {type: 'LineString', coordinates: line.geometry.coordinates}}, function (err, line) {
            //Catch the error.
            if (err) console.log(err);
            console.log('added line');
            socket.broadcast.emit('new line', line);
        });
    });

    socket.on('add poly', function (poly) {
        Polygon.create({loc: {type: 'Polygon', coordinates: poly.geometry.coordinates}}, function (err, poly) {
            //Catch the error.
            if (err) console.log(err);
            console.log('added poly');
            socket.broadcast.emit('new poly', poly);
        });
    });

    socket.on('delete point', function (id) {
        console.log('delete point');
        Point.remove({_id: id}, function (err, p) {
            if (err) console.log(err);
        });
    });

    socket.on('delete line', function (id) {
        LineString.remove({_id: id}, function (err, p) {
            if (err) console.log(err);
        });
    });

    socket.on('delete poly', function (id) {
        Polygon.remove({_id: id}, function (err, p) {
            if (err) console.log(err);
        });
    });

    //Use jtst so make a buffer around the features.
    socket.on('bufferFeature', function (buffer) {
        makeBuffer(buffer.feature, buffer.distance);
    });

    socket.on('join room', function (id) {
        socket.join(id);
    });

    socket.on('chat message', function (msg) {
        chatMessage = {}
        chatMessage.message = msg.message;
        chatMessage.owner = socket.client.request.decoded_token.username;
        io.to(msg.id).emit('chat message', chatMessage);
    });

    socket.on('add layer', function (layerName, fileId, features) {
        var obj;
        if (features != null) {
            console.log("features");
            obj = {
                name: layerName,
                features: features
            }
        } else {
            obj = {
                name: layerName,
            }
        }
        Layer.create(obj, function (err, layer) {
            console.log("added layer");

            File.findByIdAndUpdate(
                fileId,
                {$push: {"layers": layer}},
                {safe: true, new: true},
                function (err, model) {
                    if (err) console.log(err);
                }
            );
            io.to(fileId).emit('added layer', layer)
        })
    });

    socket.on('create file', function (fileName) {
        File.create({name: fileName, owner: socket.client.request.decoded_token}, function (err, file) {
            if (err) {
                console.log(err);
            }
            console.log('created file');
            socket.emit('created file', file);
        });
    });

    socket.on('update layer', function (layer) {
        Layer.findByIdAndUpdate(
            layer._id,
            {features: layer.features},
            function (err, model) {
                if (err) console.log(err);
                socket.emit('layer update', 'A layer has been updated');
            }
        )
    })

    socket.on('delete layer', function (id, fileId) {
        Layer.remove({_id: id}, function (err, p) {
            if (err) console.log(err);
            console.log("deleted layer");
            io.to(fileId).emit('deleted layer', id)
        });
    });


    socket.on('add geojsonlayer', function (featureCollection, name, fileId) {

        var newLay = {
            name: name,
            features: featureCollection.features
        };
        Layer.create(newLay, function (err, layer) {
            console.log("added geojsonlayer");

            File.findByIdAndUpdate(
                fileId,
                {$push: {"layers": layer}},
                {safe: true, new: true},
                function (err, model) {
                    if (err) console.log(err);
                }
            );
            io.to(fileId).emit('new geojsonlayer', layer);
        });
    })
});

//===================GIS Methods===================

function makeBuffer(feature, distance, fileId) {
    var bufferd = turf.buffer(feature, distance, 'meters');
    console.log(bufferd);

    var newLay = {
        name: "Bufferlayer",
        features: bufferd.features
    };

    Layer.create(newLay, function (err, layer) {
        console.log("added bufferlayer");

        File.findByIdAndUpdate(
            fileId,
            {$push: {"layers": layer}},
            {safe: true, new: true},
            function (err, model) {
                if (err) console.log(err);
            }
        );
        io.to(fileId).emit('done buffering', layer);
    });
}

function intersect(obj) {
    var id = obj.id;
    var intersection = turf.intersect(obj.first, obj.second);
    var newLay = {
        name: "IntersectLayer",
        features: [intersection]
    };

    Layer.create(newLay, function (err, layer) {
        if (err) console.log(err);
        console.log("added intersectionlayer");

        File.findByIdAndUpdate(
            id,
            {$push: {"layers": layer}},
            {safe: true, new: true},
            function (err, model) {
                if (err) console.log(err);
            }
        );
        io.to(id).emit('done intersection', layer);
    });
}

function difference(obj) {
    var id = obj.id;
    var difference = turf.difference(obj.first, obj.second)
    var newLay = {
        name: "Differencelayer",
        features: difference.features
    };

    Layer.create(newLay, function (err, layer) {
        if (err) console.log(err);
        console.log("added intersectionlayer");

        File.findByIdAndUpdate(
            id,
            {$push: {"layers": layer}},
            {safe: true, new: true},
            function (err, model) {
                if (err) console.log(err);
            }
        );
        io.to(id).emit('done difference', layer);
    });
}

function union(obj) {
    var id = obj.id;
    // returns a single polygon
    var union = turf.union(obj.first, obj.second);
    console.log(union);
    var newLay = {
        name: "Unionlayer",
        features: [union]
    };

    Layer.create(newLay, function (err, layer) {
        if (err) console.log(err);
        console.log("added unionlayer");

        File.findByIdAndUpdate(
            id,
            {$push: {"layers": layer}},
            {safe: true, new: true},
            function (err, model) {
                if (err) console.log(err);
            }
        );
        io.to(id).emit('done union', layer);
    });
}

function TIN(features, fileId){
    var obj = {
        type: 'FeatureCollection',
        features: features
    };
    var tin = turf.tin(obj);
    var newLay = {
        name: "TINlayer",
        features: tin.features
    };

    Layer.create(newLay, function (err, layer) {
        if (err) console.log(err);
        console.log("added unionlayer");

        File.findByIdAndUpdate(
            fileId,
            {$push: {"layers": layer}},
            {safe: true, new: true},
            function (err, model) {
                if (err) console.log(err);
            }
        );
        io.to(fileId).emit('done TIN', layer);
    });
}
