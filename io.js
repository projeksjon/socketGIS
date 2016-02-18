/**
 * Created by rubenschmidt on 07.12.2015.
 */
var io = require('socket.io')();

var socketioJwt = require('socketio-jwt');

io.set('authorization', socketioJwt.authorize({
    secret: 'hemmelig',
    handshake: true
}));

module.exports = io;