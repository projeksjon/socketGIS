/**
 * Created by rubenschmidt on 08.02.2016.
 */

socketGis.controller("newMapCtrl", ['$scope','$http','$timeout','$routeParams', '$cookies','socket', 'FileService','leafletData', 'jwtHelper',function ($scope, $http, $timeout, $routeParams, $cookies, socket, FileService, leafletData, jwtHelper) {
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
    $scope.controls ={
        draw: {
            position: 'topright',
            draw: {},
            edit: { featureGroup: drawnItems}
        }
    };
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
    $scope.pushMessage = function() {
        msg = {}
        msg.message = $scope.newMessage;
        msg.id = $routeParams.fileId;

        socket.emit('chat message', msg);
        $scope.newMessage = '';
    }

    $scope.activeLayers;

    socket.emit('getFileLayers', fileId);
    $scope.$on('socket:file layers', function(ev, data){
        $scope.activeLayers = data;
        leafletData.getMap(function (map) {
            data.forEach(function (layer) {
                var features = layer.features;
                L.geoJson(features).addTo(map);
            })
        })
    });

    $scope.$on('socket:add feature', function(ev, data) {
        console.log("Halla");
        leafletData.getMap(function (map) {
            var features = data.features;
            console.log(features);
            L.geoJson(features).addTo(map);
        });
    });

    socket.emit('join room', $routeParams.fileId);

    $scope.$on('socket:chat message', function(ev, msg) {
        msg.is_owner = msg.owner == $scope.username;
        $scope.chatMessages.push(msg);
        $timeout(function() {
            var scroller = document.getElementById("autoscroll");
            scroller.scrollTop = scroller.scrollHeight;
        }, 0, false);
    })

    // Functions
    $scope.toggleSlider = function () {
        $scope.show.slider = (!$scope.show.slider);
    };

    $scope.toggle = function(type) {
        $scope.show[type] = $scope.show[type] ? false : true;
    };
    $scope.addLayer = function(){
        socket.emit('add layer', $scope.newLayerName, $routeParams.fileId);
        //Reset name
        $scope.newLayerName = '';
        $scope.toggle('addLayer');
    };
    var fileData;
    //File upload functions, used with ng-file-upload
    $scope.$watch('file', function () {
        if ($scope.file != null) {
            FileService.handleFile($scope.file).then(function(data){
                fileData = data;
                fileData.forEach(function (collection) {

                    // Add a layer for each


                    var myStyle = {
                        "color": '#'+Math.floor(Math.random()*16777215).toString(16),
                        "opacity": 1
                    };
                    L.geoJson(collection, myStyle).addTo($scope.map);
                    console.log(collection);
                });
            });
        }
    });
}]);