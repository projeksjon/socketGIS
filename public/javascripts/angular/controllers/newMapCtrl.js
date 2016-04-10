/**
 * Created by rubenschmidt on 08.02.2016.
 */

socketGis.controller("newMapCtrl", ['$scope','$http','$timeout','$routeParams', '$cookies','socket', 'FileService','leafletData', 'jwtHelper',function ($scope, $http, $timeout, $routeParams, $cookies, socket, FileService, leafletData, jwtHelper) {
    var fileId = $routeParams.fileId;

    $scope.username = jwtHelper.decodeToken($cookies.get('token')).username;
    $scope.chatMessages = []

    $scope.defaults = {
        scrollWheelZoom: true
    };

    $scope.center = {
        lat: 63.430,
        lng: 10.395,
        zoom: 12
    },

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

    socket.emit('join room', $routeParams.fileId);

    $scope.$on('socket:chat message', function(ev, msg) {
        msg.is_owner = msg.owner == $scope.username;
        $scope.chatMessages.push(msg);
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

    //File upload functions, used with ng-file-upload
    $scope.$watch('file', function () {
        if ($scope.file != null) {
            FileService.handleFile($scope.file).then(function(data){
                console.log(data);
                leafletData.getMap().then(function (map) {
                    data.forEach(function (collection) {
                        var myStyle = {
                            "color": '#'+Math.floor(Math.random()*16777215).toString(16),
                            "opacity": 1
                        };
                        L.geoJson(collection, {
                            style: myStyle,
                            onEachFeature: function (feature, layer) {
                                console.log(layer);
                                if(feature.properties.OBJTYPE){
                                    console.log(feature.properties.OBJTYPE);
                                    layer.bindPopup(feature.properties.OBJTYPE);
                                }
                            }
                        }).addTo(map);

                    })

                });
            });
        }
    });
}]);
/**
 * Created by rubenschmidt on 10.04.2016.
 */
