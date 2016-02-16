/**
 * Created by rubenschmidt on 16.02.2016.
 */
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// Model
var Layer = Schema({
    name: String,
    features: []
});

module.exports = mongoose.model('layer', Layer);