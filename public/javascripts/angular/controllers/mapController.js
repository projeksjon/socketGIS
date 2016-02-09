/**
 * Created by rubenschmidt on 08.02.2016.
 */

socketGis.controller("mapController", function ($scope, $http, $timeout, socket) {
    $scope.map = init($scope);
    var geoJSONFormat = new ol.format.GeoJSON();

    $scope.interactionTypes = ['None', 'Point', 'LineString', 'Polygon', 'Circle', 'Square', 'Box'];
    $scope.interactionType = 'None';

    $scope.show = {
        slider: false
    };

    // Functions
    $scope.toggleSlider = function() {
        $scope.show.slider = (!$scope.show.slider);
        $timeout(function() {
            $scope.map.updateSize();
        }, 300);
    };

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
        }else {
            //None is selected, we remove the current selected drawing type
            $scope.map.removeInteraction(draw);
        }
    };

    $scope.deleteSelected = function deleteSelected(){
        $scope.selectedFeatures.forEach(function(feature){
            var id = feature.getId();
            console.log(id);
            var type =  geoJSONFormat.writeFeatureObject(feature).geometry.type;
            switch (type){
                case 'Point':
                    socket.emit('delete point',id);
                    break;
                case 'LineString':
                    socket.emit('delete line', id);
                    break;
                case 'Polygon':
                    socket.emit('delete poly', id);
                    break;
                case 'GeometryCollection':
                    console.log('geometry collection not ready');
                    break;
                default:
                    console.log('Not defined feature');
            }
            if(vectorSource.getFeatureById(id)) {
                $scope.vectorSource.removeFeature(feature);
            }
            if(drawSource.getFeatureById(id)){
                $scope.drawSource.removeFeature(feature);
            }
            $scope.selectedFeatures.clear();
        });
    };


    $scope.addShape = function addShape(){
        console.log("kom inn");
        //for the shapefiles in the folder called 'files' with the name pandr.shp
        shp("shapefiles/TM_WORLD_BORDERS_SIMPL-0.3.zip").then(function(geojson){
            //do something with your geojson
            var features= geoJSONFormat.readFeatures(geojson);
            console.log(features);
            $scope.vectorSource.addFeatures(features);

        });
    };


    // a normal select interaction to handle click on features
    var select = new ol.interaction.Select();
    $scope.map.addInteraction(select);

    //Get the selected features
    $scope.selectedFeatures = select.getFeatures();

    $scope.map.on('click', function() {
        console.log("click");
        $scope.selectedFeatures.clear();
    });

    // a DragBox interaction used to select features by drawing boxes while holding, cmd og ctrl
    $scope.dragBox = new ol.interaction.DragBox({
        condition: ol.events.condition.platformModifierKeyOnly
    });

    $scope.map.addInteraction($scope.dragBox);

    $scope.dragBox.on('boxend', function(e) {
        // features that intersect the box are added to the collection of
        // selected features
        var extent = $scope.dragBox.getGeometry().getExtent();
        $scope.vectorSource.forEachFeatureIntersectingExtent(extent, function(feature) {
            $scope.selectedFeatures.push(feature);
        });

    });

    //Marker for geolocation
    $scope.positionFeature = new ol.Feature();
    $scope.positionFeature.setStyle(new ol.style.Style({
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
                color: '#3399CC'
            }),
            stroke: new ol.style.Stroke({
                color: '#fff',
                width: 2
            })
        })
    }));
    //Add the feature to the map
    $scope.vectorSource.addFeature($scope.positionFeature);

    //On change create the marker
    $scope.geolocation.on('change:position', function() {
        var coordinates = $scope.geolocation.getPosition();
        $scope.positionFeature.setGeometry(coordinates ?
            new ol.geom.Point(coordinates) : null);
    });
    //WEBSOCKET ONS BELOW
    //On start of connection, the server sends the stored points. TODO change this.
    socket.forward('all points', $scope);
    $scope.$on('socket:all points', function (ev, data) {
        data.forEach(function(point){
            //Create valid geojson
            var p =  turf.point(point.loc.coordinates);
            //read the geojson and make a feature of it
            var feature = geoJSONFormat.readFeature(p, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
            //Set id for easy retrieval
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

    $scope.geolocation = new ol.Geolocation({
        // take the projection to use from the map's view
        projection: view.getProjection()
    });

    $scope.geolocation.setTracking(true);

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