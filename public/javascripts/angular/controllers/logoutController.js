/**
 * Created by rubenschmidt on 08.02.2016.
 */
socketGis.controller('logoutController',
    ['$scope', '$location', 'AuthService',
        function ($scope, $location, AuthService) {

            $scope.logout = function () {

                console.log(AuthService.getUserStatus());

                // call logout from service
                AuthService.logout()
                    .then(function () {
                        $location.path('/login');
                    });

            };

}]);
