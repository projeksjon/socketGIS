/**
 * Created by rubenschmidt on 08.02.2016.
 */

socketGis.controller("newMapCtrl", ['$scope', '$http', '$timeout', '$routeParams', '$cookies', 'socket', 'FileService', 'leafletData', 'jwtHelper', function ($scope, $http, $timeout, $routeParams, $cookies, socket, FileService, leafletData, jwtHelper) {
    var fileId = $routeParams.fileId;

    $scope.username = jwtHelper.decodeToken($cookies.get('token')).username;
    $scope.chatMessages = [];

    $scope.defaults = {
        scrollWheelZoom: true
    };

    $scope.center = {
        lat: 63.430,
        lng: 10.395,
        zoom: 12
    };
    var drawnItems = new L.FeatureGroup();
    $scope.controls = {
        draw: {
            position: 'topright',
            draw: {},
            edit: {featureGroup: drawnItems}
        }
    };
    $scope.selectedFeature;
    $scope.selectedLayer;

    $scope.map;
    leafletData.getMap().then(function (map) {
        $scope.map = map;
        var drawnItems = $scope.controls.draw.edit.featureGroup;
        drawnItems.addTo(map);
        map.on('draw:created', function (e) {
            var layer = e.layer;
            drawnItems.addLayer(layer);

            var geoJSON = layer.toGeoJSON();
            geoJSON.id = $routeParams.fileId;

            socket.emit('add feature', geoJSON);
        });
        map.on('draw:edited', function (e) {
            var layers = e.layers;
            layers.eachLayer(function (layer) {
            });
        });
        map.on('draw:deleted', function (e) {
            var layers = e.layers;
            layers.eachLayer(function (layer) {
            });
        });
    });

    $scope.layers = {
        baselayers: {
            osm: {
                name: 'OpenStreetMap',
                url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                type: 'xyz'
            }
        }
    };

    $scope.show = {
        slider: false,
        interactionTypes: false,
        addLayer: false,
        chatWindow: false
    };

    // Chat
    $scope.pushMessage = function () {
        msg = {}
        msg.message = $scope.newMessage;
        msg.id = $routeParams.fileId;

        socket.emit('chat message', msg);
        $scope.newMessage = '';
    }

    $scope.activeLayers;
    var geoList;
    socket.emit('getFileLayers', fileId);
    $scope.$on('socket:file layers', function (ev, data) {
        $scope.activeLayers = data;
        $scope.activeLayers.forEach(function (layer) {
            var features = layer.features;
            var geolay = L.geoJson(features, {
                style: {
                    "opacity": 1
                },
                onEachFeature: function (feature, lay) {
                    var popupInfo = "";
                    var prop = feature.properties;
                    feature.properties.parentLayer = layer._id;
                    Object.keys(prop).forEach(function (key, index) {
                        popupInfo += "<p>" + key + ": " + prop[key] + "</p>"
                    });
                    //lay.bindPopup(popupInfo);
                }
            });
            geolay.on('click', highlightFeature);
            geolay.addTo($scope.map);
            layer.geoLayers = geolay;
        });
        $scope.selectedLayer = $scope.activeLayers[0];
        $scope.activeLayers[0].isActive = true;
    });

    $scope.$on('socket:add feature', function (ev, data) {
        console.log(data);
        L.geoJson(data).addTo($scope.map);
    });

    socket.emit('join room', $routeParams.fileId);

    $scope.$on('socket:chat message', function (ev, msg) {
        msg.is_owner = msg.owner == $scope.username;
        $scope.chatMessages.push(msg);
        $timeout(function () {
            var scroller = document.getElementById("autoscroll");
            scroller.scrollTop = scroller.scrollHeight;
        }, 0, false);
    });

    // Functions
    $scope.toggleSlider = function () {
        $scope.show.slider = (!$scope.show.slider);
    };

    $scope.toggle = function (type) {
        $scope.show[type] = $scope.show[type] ? false : true;
    };
    $scope.addLayer = function () {
        socket.emit('add layer', $scope.newLayerName, $routeParams.fileId);
        //Reset name
        $scope.newLayerName = '';
        $scope.toggle('addLayer');
    };
    var fileData;
    //File upload functions, used with ng-file-upload
    $scope.$watch('file', function () {
        if ($scope.file != null) {
            FileService.handleFile($scope.file).then(function (data) {
                fileData = data;
                fileData.forEach(function (collection) {

                    var name = collection.fileName;
                    if (name === undefined || name === null) {
                        name = "1234"
                    }

                    // Add a layer for each
                    socket.emit('add layer', name, fileId, collection);

                    var myStyle = {
                        "color": '#' + Math.floor(Math.random() * 16777215).toString(16),
                        "opacity": 1
                    };
                    L.geoJson(collection, {
                        style: myStyle,
                        onEachFeature: function (feature, layer) {
                            console.log(layer);
                            if (feature.properties) {
                                console.log(feature.properties);
                                layer.bindPopup("Hei på deg!!");
                            }
                        }
                    }).addTo($scope.map);
                });
            });
        }
    });

    $scope.deleteSelectedFeature = function () {
        if($scope.featureList.length<1){
            alert("Ingen element er valgt!")
        }
        $scope.featureList.forEach(function (f) {
            $scope.map.removeLayer(f)
        });
    };

    $scope.deleteSelectedLayer = function () {
        $scope.activeLayers.forEach(function (layer) {
            if (layer.isActive) {
                $scope.map.removeLayer(layer.geoLayers)
                socket.emit('delete layer', layer._id)
            }
        });
    }

    $scope.updateSelected = function () {
        $scope.activeLayers.forEach(function (layer) {
            if (layer.isActive) {
                console.log("update");
                console.log(layer);
                //socket.emit('update layer', layer)
            }
        });
    };


    $scope.bufferSelected = function () {
        socket.emit('make buffer', $scope.featureList[0].toGeoJSON());
    };

    $scope.$on('socket:done buffering', function (ev, obj) {
        console.log(obj);
        $scope.activeLayers.forEach(function (layer) {
            if (layer._id === obj.parentLayer) {
                console.log(layer);
                layer.geoLayers.addData(obj.geoJson);
            }
        });
        //oJson(geoJson).addTo($scope.map);
    });


    $scope.intersectSelected = function () {
        if ($scope.featureList.length > 2) {
            alert("Du kan kun ha to aktive lag for å velge intersection.")
            return
        } else if ($scope.featureList.length < 2) {
            alert("Du må velge to lag som skal brukes for intersect.")
            return
        }
        var obj = {
            id: fileId,
            first: $scope.featureList[0].toGeoJSON(),
            second: $scope.featureList[0].toGeoJSON()
        };
        socket.emit('make intersection', obj)
    }

    $scope.$on('socket:done intersection', function (ev, obj) {
        console.log(obj);
        L.geoJson(obj).addTo($scope.map);

    });

    $scope.selectLayer = function (newLayer) {

        $scope.activeLayers.forEach(function (layer) {
            layer.isActive = false;
        });
        newLayer.isActive = true;
    };
    $scope.featureList = [];
    function highlightFeature(e) {
        var layer = e.layer;
        console.log(layer);
        if (layer.feature.properties.isSelected) {
            $scope.selectedFeature = null;
            layer.feature.properties.isSelected = false;
        }
        var index = $scope.featureList.indexOf(layer);
        if (index >= 0) {
            $scope.featureList.splice(index, 1);
            layer.setStyle({
                "opacity": 1
            });
            return;
        } else {
            $scope.featureList.push(layer);
            layer.setStyle({
                "opacity": 0.5
            });
            return;
        }

        if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
        }
        $scope.selectedFeature = layer;
        layer.feature.properties.isSelected = true;
        layer.setStyle({
            "opacity": 0.5
        });
    }
}]);