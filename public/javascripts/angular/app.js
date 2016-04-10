var socketGis = angular.module("socketGis", ['ngRoute', 'ngCookies', 'btford.socket-io', 'ngFileUpload', 'leaflet-directive', 'angular-jwt']);

socketGis.config(function($routeProvider) {
    $routeProvider
        .when('/', {
            controller: 'fileController',
            templateUrl: '/partials/file.html',
            access: {restricted: true}
        })
        .when('/file/:fileId', {
            controller: 'newMapCtrl',
            templateUrl: '/partials/new_map.html',
            access: {restricted: true}
        })
        .when('/login',{
            controller: 'loginController',
            templateUrl: '/partials/login.html',
            access: {restricted: false}
        })
        .when('/register', {
            templateUrl: 'partials/register.html',
            controller: 'registerController',
            access: {restricted: false}
        })
        .otherwise({ redirectTo: '/login' });
});

socketGis.run(function ($rootScope, $location, $route, AuthService) {
    AuthService.getAuthStatus().then(function(){
        //Success
    }, function(){
        //Error, user is not authenticated
        $location.path('/login');
        $route.reload();
    });
});