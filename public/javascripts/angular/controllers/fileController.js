/**
 * Created by valdemarrolfsen on 18.02.2016.
 */
socketGis.controller('fileController', ['$scope', '$cookies', 'socket', function($scope, $cookies, socket) {

    socket.emit('send files');

    $scope.createFile = function(filename) {
        socket.emit('create file', 'Test');
    };

    //Retrieves all stored files
    socket.forward('all files', $scope);
    $scope.$on('socket:all files', function(ev, data) {
        $scope.files = data;
    })
}]);