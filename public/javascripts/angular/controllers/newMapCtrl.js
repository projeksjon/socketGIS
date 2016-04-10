/**
 * Created by rubenschmidt on 08.02.2016.
 */

socketGis.controller("newMapCtrl", ['$scope','$http','$timeout','$routeParams','socket', 'FileService','leafletData',function ($scope, $http, $timeout, $routeParams, socket, FileService, leafletData) {
    var fileId = $routeParams.fileId;

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
        addLayer: false
    };

    socket.emit('getFileLayers', fileId);
    $scope.$on('socket:file layers', function(ev, data){
        leafletData.getMap(function (map) {
            data.forEach(function (layer) {
                var features = layer.features;
                L.geoJson(features).addTo(map);
            })
        })
    });

    // Functions
    $scope.toggleSlider = function () {
        $scope.show.slider = (!$scope.show.slider);
    };

    $scope.toggle = function(type) {
        $scope.show[type] = $scope.show[type] ? false : true;
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
