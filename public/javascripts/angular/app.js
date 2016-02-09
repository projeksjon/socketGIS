var socketGis = angular.module("socketGis", ['ngRoute', 'ngCookies']);


socketGis.config(function($routeProvider) {
    $routeProvider
        .when('/file/', {
            controller: 'fileController',
            templateUrl: '/partials/file.html',
            access: {restricted: true}
        })
        .when('/', {
            controller: 'mapController',
            templateUrl: '/partials/map.html',
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
        //Handle success, user is authenticated
        $location.path('/');
        $route.reload();
    });
    $rootScope.$on('$routeChangeStart', function (event, next, current) {
        if (next.access.restricted && AuthService.isLoggedIn() === false) {
            $location.path('/login');
            $route.reload();
        }
    });
});