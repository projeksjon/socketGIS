/**
 * Created by valdemarrolfsen on 18.02.2016.
 */
socketGis.controller('fileController', ['$scope', '$cookies', 'socket', function($scope, $cookies, socket) {

    socket.emit('send files');

    $scope.show = {
        myFiles: true,
        shared: false
    };



    $scope.createFile = function() {
        var name = $scope.newFileName;
        if(name == null || name.length<1){
            alert("Vennligst oppgi et filnavn");
            return
        }
        socket.emit('create file', name);
    };

    //Retrieves all stored files
    socket.forward('all files', $scope);
    $scope.$on('socket:all files', function(ev, data) {
        $scope.files = data;
    })

    $scope.getSharedWithMe = function () {
        socket.emit('getFilesSharedWithMe');

        $scope.show.shared = true;
        $scope.show.myFiles = false;
    }

    $scope.getMyFiles = function () {
        socket.emit('send files');
        $scope.show.shared = false;
        $scope.show.myFiles = true;
    }
}]);