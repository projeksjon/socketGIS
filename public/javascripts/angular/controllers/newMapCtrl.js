/**
 * Created by rubenschmidt on 08.02.2016.
 */

socketGis.controller("newMapCtrl", ['$scope', '$http', '$timeout', '$routeParams', '$cookies', 'socket', 'FileService', 'leafletData', 'jwtHelper','$location', function ($scope, $http, $timeout, $routeParams, $cookies, socket, FileService, leafletData, jwtHelper, $location) {
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
    $scope.drawLayer = L.geoJson();
    $scope.drawFeatures = [];
    $scope.map;
    var drawnItems;
    leafletData.getMap().then(function (map) {
        $scope.map = map;
        drawnItems = $scope.controls.draw.edit.featureGroup;
        drawnItems.addTo(map);
        map.on('draw:created', function (e) {
            var layer = e.layer;
            drawnItems.addLayer(layer);
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
        map.on('click', function (e) {
            $scope.unselectAll();
        })
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
        extra: false,
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
    socket.emit('getFileLayers', fileId);
    $scope.$on('socket:file layers', function (ev, data) {
        $scope.activeLayers = data;
        $scope.activeLayers.forEach(function (layer) {
            var features = layer.features;
            var geolay = L.geoJson(features, {
                style: {
                    "opacity": 1,
                    "color": '#' + Math.floor(Math.random() * 16777215).toString(16)
                },
                onEachFeature: function (feature, lay) {
                    if(feature.properties == null) {
                        feature.properties = {};
                    }
                    feature.properties.parentLayer = layer._id;
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
        console.log(msg);
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
        $scope.show.extra = false;
    };

    $scope.toggleExtra = function () {
        $scope.show.slider = false;
        $scope.show.extra = (!$scope.show.extra);
    }

    $scope.toggle = function (type) {
        $scope.show[type] = $scope.show[type] ? false : true;
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
                socket.emit('delete layer', layer._id, fileId)
            }
        });
    };

    $scope.$on('socket:deleted layer', function (ev, layerId) {
        $scope.activeLayers.forEach(function (layer) {
            if (layer._id === layerId) {
                if(layer.geoLayers != null){
                    $scope.map.removeLayer(layer.geoLayers);
                    var i = $scope.activeLayers.indexOf(layer);
                    $scope.activeLayers.splice(i, 1)
                }
            }
        });
    });

    $scope.bufferSelected = function () {
        socket.emit('make buffer', $scope.featureList[0].toGeoJSON(), $scope.bufferDistance, fileId, $scope.bufferName);
        $scope.unselectAll();
    };

    $scope.$on('socket:done buffering', function (ev, layer) {
        addLayerToMap(layer)
    });


    $scope.intersectSelected = function () {
        if ($scope.featureList.length > 2) {
            alert("Du kan kun ha to aktive lag for å velge intersection.")
            return
        } else if ($scope.featureList.length < 2) {
            alert("Du må velge to lag som skal brukes for intersect.")
            return
        }
        var name = prompt("Oppgi lagnavn", "Intersectlayer");
        var obj = {
            id: fileId,
            first: $scope.featureList[0].toGeoJSON(),
            second: $scope.featureList[1].toGeoJSON()
        };
        socket.emit('make intersection', obj, name)
    };

    $scope.differenceSelected = function () {
        if ($scope.featureList.length > 2) {
            alert("Du kan kun ha to aktive lag for å velge difference.")
            return
        } else if ($scope.featureList.length < 2) {
            alert("Du må velge to lag som skal brukes for difference.")
            return
        }
        var obj = {
            id: fileId,
            first: $scope.featureList[0].toGeoJSON(),
            second: $scope.featureList[1].toGeoJSON()
        };
        socket.emit('make difference', obj)
    }
    $scope.unionSelected = function () {
        if ($scope.featureList.length > 2) {
            alert("Du kan kun ha to aktive lag for å velge union.")
            return
        } else if ($scope.featureList.length < 2) {
            alert("Du må velge to lag som skal brukes for union.")
            return
        }
        var obj = {
            id: fileId,
            first: $scope.featureList[0].toGeoJSON(),
            second: $scope.featureList[1].toGeoJSON()
        };
        socket.emit('make union', obj)
    }

    $scope.$on('socket:done difference', function (ev, layer) {
        addLayerToMap(layer)
    });
    $scope.$on('socket:done union', function (ev, layer) {
        addLayerToMap(layer);
    });


    function addLayerToMap(layer) {
        console.log(layer);
        // Add the new layer to the list
        $scope.activeLayers.push(layer);
        var features = layer.features;
        var geolay = L.geoJson(features, {
            style: {
                "opacity": 1,
                "color": '#' + Math.floor(Math.random() * 16777215).toString(16)
            },
            onEachFeature: function (feature, lay) {
                if(feature.properties == null) {
                    feature.properties = {};
                }
                feature.properties.parentLayer = layer._id;
            }
        });
        geolay.on('click', highlightFeature);
        geolay.addTo($scope.map);
        layer.geoLayers = geolay;
    }

    $scope.$on('socket:done intersection', function (ev, layer) {
        addLayerToMap(layer);
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

    $scope.unselectAll = function () {
        $scope.featureList.forEach(function (l) {
            l.setStyle({
                "opacity": 1
            });
        })
        $scope.featureList = [];
        $scope.selectedFeature = null;
    }

    $scope.addGeoJsonLayer = function () {
        var json = JSON.parse($scope.newGeoJsonLayer);
        if(json.type === "FeatureCollection"){
            socket.emit('add geojsonlayer', json, $scope.newGeoJsonLayerName, fileId);
        }else {
            alert("Laget må være en featurecollection")
        }
    }
    $scope.$on('socket:new geojsonlayer', function (ev, layer) {
        addLayerToMap(layer);
    });

    $scope.tinSelected = function () {
        $scope.activeLayers.forEach(function (layer) {
            if (layer.isActive) {
                socket.emit('make TIN', layer.features, fileId)
            }
        });
    }
    $scope.$on('socket:done TIN', function (ev, layer) {
        addLayerToMap(layer);
    });

    $scope.$on('socket:added layer', function (ev, layer) {
        addLayerToMap(layer);
    });

    $scope.explodeSelected = function () {
        socket.emit('make explosion', $scope.featureList[0].toGeoJSON(), fileId);
        $scope.unselectAll();
    }

    $scope.$on('socket:done exploding', function (ev, layer) {
        addLayerToMap(layer);
    });

    $scope.putOnTopSelected = function () {
        $scope.activeLayers.forEach(function (layer) {
            if (layer.isActive) {
                layer.geoLayers.bringToFront()
            }else{
                layer.geoLayers.bringToBack()
            }
        });
    }


    $scope.shareFile = function () {
        var name = $scope.shareUsername;
        if(name == null || name.length <1){
            alert("Skriv et brukernavn");
            return
        }
        console.log(name);
        socket.emit('share file', name, fileId)
    }

    $scope.$on('socket:share success', function (ev, username) {
        alert("Filen har blitt delt med "+username);
    });

    $scope.deleteFile = function (){
        var answer = confirm("Vil du virkelig slette filen? All data vil gå tapt");
        if (answer){
            socket.emit('delete file', fileId);
            $location.path('/');
        }
        else{
            // Do nothing.
        }
    };

    $scope.saveDrawingAsLayer = function () {
        drawnItems.eachLayer(function (layer) {
            console.log(layer);
            var geoJSON = layer.toGeoJSON();
            var features = [];
            features.push(geoJSON);
            socket.emit('save drawingAsLayer', features, $scope.drawName ,fileId)
        })

    };

    $scope.$on('socket:draw saving success', function (ev, layer) {
        addLayerToMap(layer)
    });


}]);