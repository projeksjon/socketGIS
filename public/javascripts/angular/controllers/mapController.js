/**
 * Created by rubenschmidt on 08.02.2016.
 */

socketGis.controller("mapController", ['$scope','$http','$timeout','$routeParams','socket', 'FileService',function ($scope, $http, $timeout, $routeParams, socket, FileService) {
    $scope.map = init();
    socket.emit('getFileLayers', $routeParams.fileId);
    $scope.activeLayers = [];
    $scope.newLayerName ='';
    $scope.draw = null;
    //Add the layers here so it registers the event listeners
    $scope.map.addLayer(new ol.layer.Tile({
        source: new ol.source.OSM()
    }));
    $scope.map.addLayer($scope.vector);
    $scope.map.addLayer($scope.savedLayer);
    var geoJSONFormat = new ol.format.GeoJSON();

    $scope.interactionTypes = ['None', 'Point', 'LineString', 'Polygon', 'Circle', 'Square', 'Box'];
    $scope.interactionType = 'None';
    $scope.chatMessages = ['Heisann', 'Heihei']
    $scope.show = {
        slider: false,
        interactionTypes: false,
        addLayer: false,
        chatWindow: false
    };

    // Functions
    $scope.toggleSlider = function () {
        $scope.show.slider = (!$scope.show.slider);
        $timeout(function () {
            $scope.map.updateSize();
        }, 300);
    };

    // Chat
    $scope.pushMessage = function() {
        $scope.chatMessages.push($scope.newMessage);
        $scope.newMessage = '';
    }

    $scope.toggle = function(type) {
        $scope.show[type] = $scope.show[type] ? false : true;
    };

    $scope.addInteraction = function addInteraction(type) {
        $scope.interactionType = type;
        $scope.show.interactionTypes = false;

        var value = $scope.interactionType;

        if (value !== 'None') {
            var geometryFunction, maxPoints;
            if (value === 'Square') {
                value = 'Circle';
                geometryFunction = ol.interaction.Draw.createRegularPolygon(4);
            } else if (value === 'Box') {
                value = 'LineString';
                maxPoints = 2;
                geometryFunction = function (coordinates, geometry) {
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
            //If already a draw is defined remove it first.
            if($scope.draw){
                $scope.map.removeInteraction($scope.draw);
            }

            $scope.draw = new ol.interaction.Draw({
                source: $scope.drawSource,
                type: /** @type {ol.geom.GeometryType} */ (value),
                geometryFunction: geometryFunction,
                maxPoints: maxPoints
            });
            $scope.map.addInteraction($scope.draw);
            //When finished drawing
            $scope.draw.on('drawend', saveDrawing);
        } else {
            //None is selected, we remove the current selected drawing type
            if($scope.draw){
                $scope.map.removeInteraction($scope.draw);
            }

        }
    };

    $scope.deleteSelected = function deleteSelected() {
        $scope.selectedFeatures.forEach(function (feature) {
            var id = feature.getId();
            console.log(id);
            var type = geoJSONFormat.writeFeatureObject(feature).geometry.type;
            switch (type) {
                case 'Point':
                    socket.emit('delete point', id);
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
            if (vectorSource.getFeatureById(id)) {
                $scope.vectorSource.removeFeature(feature);
            }
            if (drawSource.getFeatureById(id)) {
                $scope.drawSource.removeFeature(feature);
            }
            $scope.selectedFeatures.clear();
        });
    };

    // a normal select interaction to handle click on features
    var select = new ol.interaction.Select();
    $scope.map.addInteraction(select);
    $scope.selectedFeatures = select.getFeatures();
    // a DragBox interaction used to select features by drawing boxes while holding, cmd og ctrl
    $scope.dragBox = new ol.interaction.DragBox({
        condition: ol.events.condition.platformModifierKeyOnly
    });

    $scope.map.addInteraction($scope.dragBox);

    $scope.dragBox.on('boxend', function (e) {
        // features that intersect the box are added to the collection of
        // selected features
        var extent = $scope.dragBox.getGeometry().getExtent();
        $scope.vectorSource.forEachFeatureIntersectingExtent(extent, function (feature) {
            if(feature){
                $scope.selectedFeatures.push(feature);
            }
        });
        $scope.drawSource.forEachFeatureIntersectingExtent(extent, function(feature){
            if (feature){
                $scope.selectedFeatures.push(feature);
            }
        });
        $scope.fileSource.forEachFeatureIntersectingExtent(extent, function(feature){
            if(feature){
                $scope.selectedFeatures.push(feature);
            }
        })
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
    $scope.geolocation.on('change:position', function () {
        var coordinates = $scope.geolocation.getPosition();
        $scope.positionFeature.setGeometry(coordinates ?
            new ol.geom.Point(coordinates) : null);
    });

    $scope.deleteSelected = function deleteSelected() {
        //Get the selected features
        $scope.selectedFeatures = select.getFeatures();
        //Iterate through all the features and delete them.
        $scope.selectedFeatures.forEach(function (feature) {
            var id = feature.getId();
            if (id) {
                var type = geoJSONFormat.writeFeatureObject(feature).geometry.type;
                switch (type) {
                    case 'Point':
                        socket.emit('delete point', id);
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
                if ($scope.vectorSource.getFeatureById(id)) {
                    $scope.vectorSource.removeFeature(feature);
                }
                if ($scope.drawSource.getFeatureById(id)) {
                    $scope.drawSource.removeFeature(feature);
                }
            }else{
                //Not from database
                $scope.fileSource.removeFeature(feature);
            }
        });
        //Clear the list of selected features
        $scope.selectedFeatures.clear();
    };


    $scope.addLayer = function(){
        socket.emit('add layer', $scope.newLayerName, $routeParams.fileId);
        //Reset name
        $scope.newLayerName = '';
        $scope.toggle('addLayer');
    };

    //File upload functions, used with ng-file-upload
    $scope.$watch('file', function () {
        if ($scope.file != null) {
            FileService.handleFile($scope.file).then(function(data){
                //Success
                var crs = 'EPSG:4326';
                if(data.crs){
                    crs = data.crs.properties.name;
                }
                var layers = [];
                if (data.length > 1){
                    //Multiple layers in dataset
                    for (var i = 0; i < data.length; i++) {
                        var obj = data[i];
                        layers.push(obj);
                    }
                }else {
                    //Single layer in dataset
                    layers.push(data);
                }
                layers.forEach(function(feat){
                    var lay = new ol.layer.Vector({
                        source: $scope.fileSource
                    });
                    // Add the layer to the map.
                    $scope.map.addLayer(lay);

                    var features = geoJSONFormat.readFeatures(feat,{dataProjection: crs, featureProjection: 'EPSG:3857'});
                    features.forEach(function(f){
                        var style = new ol.style.Style({
                            fill: new ol.style.Fill({
                                color: getRandomRgba(0.5)
                            }),

                        });
                        f.setStyle(style)
                    });
                    // Add the features to the filesource, that is already added to the map.
                    $scope.fileSource.addFeatures(features);

                })
            });
        }
    });

    //WEBSOCKET ONS BELOW

    $scope.$on('socket:file layers', function(ev, data){
        $scope.activeLayers = data;
    });

    //On start of connection, the server sends the stored points. TODO change this.
    $scope.$on('socket:all points', function (ev, data) {
        data.forEach(function (point) {
            //Create valid geojson
            var p = turf.point(point.loc.coordinates);
            //read the geojson and make a feature of it
            var feature = geoJSONFormat.readFeature(p, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
            //Set id for easy retrieval
            feature.setId(point._id);
            //Add feature to vectorlayer drawSource
            $scope.vectorSource.addFeature(feature);
        })
    });
    $scope.$on('socket:all layers', function(ev, data){
        data.forEach(function(layer){
            $scope.activeLayers.push(layer);
        });
    });

    $scope.$on('socket:all lines', function (ev, data) {
        data.forEach(function (line) {
            var l = turf.linestring(line.loc.coordinates);
            var feature = geoJSONFormat.readFeature(l, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
            feature.setId(line._id);
            //Add feature to vectorlayer drawSource
            $scope.vectorSource.addFeature(feature);
        })
    });

    $scope.$on('socket:all polys', function (ev, data) {
        data.forEach(function (poly) {
            var p = turf.polygon(poly.loc.coordinates);
            var feature = geoJSONFormat.readFeature(p, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
            feature.setId(poly._id);
            $scope.vectorSource.addFeature(feature);
        })
    });


    $scope.$on('socket:new point', function (ev, data) {
        var p = turf.point(data.loc.coordinates);
        var feature = geoJSONFormat.readFeature(p, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
        feature.setId(data._id);
        //Add feature to vectorlayer drawSource
        $scope.vectorSource.addFeature(feature);
    });


    $scope.$on('socket:done buffering', function (ev, data) {
        var geometry = geoJSONFormat.readGeometry(data);
        var feature = new ol.Feature({'geometry': geometry});
        $scope.vectorSource.addFeature(feature);
        //Write the buffer in right format for database and send it.
        var geoObject = geoJSONFormat.writeFeatureObject(feature, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        });
        socket.emit('add poly', geoObject);
    });
    $scope.$on('socket:added layer', function(ev, data){
        $scope.activeLayers.push(data);
    });

    function init() {
        $scope.drawSource = new ol.source.Vector({wrapX: false});
        $scope.vectorSource = new ol.source.Vector({wrapX: false});
        $scope.fileSource = new ol.source.Vector({wrapX: false});

        //Layer for dbFeatures
        $scope.savedLayer = new ol.layer.Vector({
            source: $scope.vectorSource
        });

        //Layer for drawing
        $scope.vector = new ol.layer.Vector({
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
            layers: [],
            view: view
        });

        $scope.geolocation = new ol.Geolocation({
            // take the projection to use from the map's view
            projection: view.getProjection()
        });

        $scope.geolocation.setTracking(true);

        return map;
    }

    function saveDrawing(event) {
        var feature = event.feature;
        //Write the feature to a geojsonobject.
        var geoObject = geoJSONFormat.writeFeatureObject(feature, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        });
        switch (geoObject.geometry.type) {
            case 'Point':
                socket.emit('add point', geoObject);
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

    //Generate a random rgb color string with given opacity.
    function getRandomRgba(opacity){
        var red = Math.floor(Math.random() * 255);
        var green = Math.floor(Math.random() * 255);
        var blue = Math.floor(Math.random() * 255);
        return "rgba("+red + "," + green + "," +blue + "," + opacity + ")"
    }

}]);
