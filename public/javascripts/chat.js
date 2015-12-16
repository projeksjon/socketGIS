/**
 * Created by rubenschmidt on 16.12.2015.
 */

$('form').submit(function(){
    var msg = $('#m').val();
    //If empty message just return
    if (!msg)return false;
    //Send message to all users
    socket.emit('chat message', msg);
    //Clean form input field
    $('#m').val('');
    return false;
});

socket.on('chat message', function(msg){
    $('#messages').append($('<li>').text(msg));
});