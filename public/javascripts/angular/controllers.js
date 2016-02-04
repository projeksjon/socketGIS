/**
 * Created by rubenschmidt on 01.02.2016.
*/

var geoJSONFormat = new ol.format.GeoJSON();

socketGis.controller("mapController", function ($scope, $http) {
    $scope.map = init($scope);

    $scope.interactionTypes = ['None', 'Point', 'LineString', 'Polygon', 'Circle', 'Square', 'Box'];
    $scope.interactionType = 'None';

    $scope.show = {
        slider: false
    }

    // Functions
    $scope.toggleSlider = function() {
        $scope.show.slider = ($scope.show.slider) ? false : true;
    }

    $scope.addInteraction = function addInteraction() {
        var value = $scope.interactionType;
        if (value !== 'None') {
            var geometryFunction, maxPoints;
            if (value === 'Square') {
                value = 'Circle';
                geometryFunction = ol.interaction.Draw.createRegularPolygon(4);
            } else if (value === 'Box') {
                value = 'LineString';
                maxPoints = 2;
                geometryFunction = function(coordinates, geometry) {
                    if (!geometry) {
                        geometry = new ol.geom.Polygon(null);
                    }
                    var start = coordinates[0];
                    var end = coordinates[1];
                    geometry.setCoordinates([
                        [start, [start[0], end[1]], end, [end[0], start[1]], start]
                    ]);
                    return geometry;
                };
            }
            draw = new ol.interaction.Draw({
                source: $scope.drawSource,
                type: /** @type {ol.geom.GeometryType} */ (value),
                geometryFunction: geometryFunction,
                maxPoints: maxPoints
            });
            $scope.map.addInteraction(draw);
            //When finished drawing
            draw.on('drawend', saveDrawing);
        }
    }

});

function init($scope) {
    $scope.drawSource = new ol.source.Vector({wrapX: false});
    $scope.vectorSource = new ol.source.Vector({wrapX: false});

    //Layer for dbFeatures
    var saved = new ol.layer.Vector({
        source: $scope.vectorSource
    });

    //Layer for drawing
    var vector = new ol.layer.Vector({
        source: $scope.drawSource,
        style: new ol.style.Style({
            fill: new ol.style.Fill({
                color: 'rgba(255, 255, 255, 0.2)'
            }),
            stroke: new ol.style.Stroke({
                color: '#ffcc33',
                width: 2
            }),
            image: new ol.style.Circle({
                radius: 7,
                fill: new ol.style.Fill({
                    color: '#ffcc33'
                })
            })
        })
    });

    var view = new ol.View({
        center: ol.proj.transform([10.3933, 63.4297], 'EPSG:4326', 'EPSG:3857'),
        zoom: 13
    });

    var map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            vector, saved],
        view: view
    });

    //WEBSOCKET ONS BELOW
    //On start of connection, the server sends the stored points. TODO change this.
    socket.on('all points', function(points){
        points.forEach(function(point){
            //Create valid geojson
            var p =  turf.point(point.loc.coordinates);
            //read the geojson and make a feature of it
            var feature = geoJSONFormat.readFeature(p, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
            feature.setId(point._id);
            //Add feature to vectorlayer drawSource
            $scope.vectorSource.addFeature(feature);
        })
    });

    socket.on('all lines', function(lines){
        lines.forEach(function(line){
            var l =  turf.linestring(line.loc.coordinates);
            var feature = geoJSONFormat.readFeature(l, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
            feature.setId(line._id);
            //Add feature to vectorlayer drawSource
            $scope.vectorSource.addFeature(feature);
        })
    });

    socket.on('all polys', function(polys){
        polys.forEach(function(poly){
            var p =  turf.polygon(poly.loc.coordinates);
            var feature = geoJSONFormat.readFeature(p, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
            feature.setId(poly._id);
            $scope.vectorSource.addFeature(feature);
        })
    });


    socket.on('new point', function(point){

    });

    socket.on('done buffering', function(geom){
        var geometry = geoJSONFormat.readGeometry(geom);
        console.log(geometry);
        var feature = new ol.Feature({'geometry': geometry});
        $scope.vectorSource.addFeature(feature);
        //Write the buffer in right format for database and send it.
        var geoObject = geoJSONFormat.writeFeatureObject(feature, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
        socket.emit('add poly', geoObject);
    });

    return map;
}

function saveDrawing(event){
    var feature = event.feature;
    //Write the feature to a geojsonobject.
    var geoObject = geoJSONFormat.writeFeatureObject(feature, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
    switch (geoObject.geometry.type){
        case 'Point':
            socket.emit('add point',geoObject);
            break;
        case 'LineString':
            socket.emit('add line', geoObject);
            break;
        case 'Polygon':
            socket.emit('add poly', geoObject);
            break;
        case 'GeometryCollection':
            console.log('geometry collection not ready');
            break;
        default:
            console.log('Not defined feature');
    }
}