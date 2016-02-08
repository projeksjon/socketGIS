/**
 * Created by rubenschmidt on 08.02.2016.
 */
socketGis.controller('registerController',
    ['$scope', '$location', 'AuthService',
        function ($scope, $location, AuthService) {

            console.log(AuthService.getUserStatus());

            $scope.register = function () {

                // initial values
                $scope.error = false;
                $scope.disabled = true;

                // call register from service
                AuthService.register($scope.registerForm.username, $scope.registerForm.password)
                    // handle success
                    .then(function () {
                        $location.path('/login');
                        $scope.disabled = false;
                        $scope.registerForm = {};
                    })
                    // handle error
                    .catch(function () {
                        $scope.error = true;
                        $scope.errorMessage = "Uh oh! Noe gikk galt!";
                        $scope.disabled = false;
                        $scope.registerForm = {};
                    });

            };
}]);