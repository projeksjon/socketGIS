/**
 * Created by valdemarrolfsen on 09.02.2016.
 */
socketGis.controller('navController', ['$scope', '$location', function($scope, $location) {
    $scope.showNav = true;

    $scope.$on('$routeChangeStart', function (next, current) {
        $scope.showNav = !(current.$$route.originalPath == '/login' || current.$$route.originalPath == '/register');
    });

}]);