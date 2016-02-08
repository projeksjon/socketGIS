/**
 * Created by rubenschmidt on 08.02.2016.
 */
// user schema/model
var mongoose = require('mongoose');
var geoFeatureSchema = require('./geoFeatureSchema.js');

//Define models
module.exports = mongoose.model('Point', geoFeatureSchema);