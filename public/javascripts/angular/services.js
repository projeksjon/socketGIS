/**
 * Created by rubenschmidt on 08.02.2016.
 */
socketGis.factory('socket', function (socketFactory) {
    var socket = socketFactory();
    socket.forward('error');
    return socket;
});


socketGis.factory('AuthService',
    ['$q', '$timeout', '$http','$cookies',
        function ($q, $timeout, $http, $cookies) {

            // create user variable
            var user = null;

            // return available functions for use in controllers
            return ({
                isLoggedIn: isLoggedIn,
                getUserStatus: getUserStatus,
                login: login,
                logout: logout,
                register: register,
                getAuthStatus: getAuthStatus
            });

            function isLoggedIn() {
                //If user is defined return true
                return !!user;
            }

            function getUserStatus() {
                return user;
            }

            function getAuthStatus(){
                var deferred = $q.defer();

                if ($cookies.get('token')){
                    $http.defaults.headers.common.Authorization = 'Token ' + $cookies.get('token');
                }else {
                    deferred.reject();
                }
                $http.post('/user/userInfo').then(function(response){
                    //Handle success
                    //Usertoken went through and the user is authenticated
                    user = true;
                    deferred.resolve();
                }, function(response){
                    //Handle error
                    deferred.reject();
                });
                return deferred.promise;
            }

            function login(username, password) {

                // create a new instance of deferred
                var deferred = $q.defer();

                // send a post request to the server
                $http.post('/user/login', {username: username, password: password})

                    .then(function (response) {
                        // handle success
                        if(response.status === 200 && response.data.token){
                            user = true;
                            $http.defaults.headers.common.Authorization = 'Token ' + response.data.token;
                            $cookies.put('token', response.data.token);
                            deferred.resolve();

                        } else {
                            user = false;
                            deferred.reject();
                        }
                    }, function(response){
                        // handle error
                    });

                // return promise object
                return deferred.promise;

            }

            function logout() {

                // create a new instance of deferred
                var deferred = $q.defer();

                // send a get request to the server
                $http.get('/user/logout')

                    .then(function (response) {
                        // handle success
                        user = false;
                        delete $http.defaults.headers.common.Authorization;
                        $cookies.remove('token');
                        deferred.resolve();
                    }, function(response){
                        // handle error
                        user = false;
                        deferred.reject();
                    });

                // return promise object
                return deferred.promise;

            }

            function register(username, password) {

                // create a new instance of deferred
                var deferred = $q.defer();

                // send a post request to the server
                $http.post('/user/register', {username: username, password: password})
                    .then(function (response) {
                        // handle success
                        if(response.status === 200 && response.data.status){
                            deferred.resolve();
                        } else {
                            deferred.reject();
                        }
                    }, function(response){
                        // handle error
                        deferred.reject();
                    });

                // return promise object
                return deferred.promise;
            }
}]);