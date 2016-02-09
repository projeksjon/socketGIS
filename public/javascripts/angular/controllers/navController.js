/**
 * Created by valdemarrolfsen on 09.02.2016.
 */
socketGis.controller('navController', ['$scope', '$location', function($scope, $location) {
    $scope.showNav = true;

    $scope.$on('$routeChangeStart', function(next, current) {
        console.log(current);
        $scope.showNav = true;
        if (current.$$route.originalPath === '/login') {
            $scope.showNav = false;
        }
    });

}]);