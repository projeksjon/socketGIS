var socketGis = angular.module("socketGis", ['ngRoute']);


socketGis.config(function($routeProvider) {
    $routeProvider
        .when('/file/', {
            controller: 'fileController',
            templateUrl: '/partials/file.html',
        })
        .when('/', {
            controller: 'mapController',
            templateUrl: '/partials/map.html',
        })
        .otherwise({ redirectTo: '/' });
});