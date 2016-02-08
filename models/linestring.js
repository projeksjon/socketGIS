/**
 * Created by rubenschmidt on 08.02.2016.
 */
var mongoose = require('mongoose');
var geoFeatureSchema = require('./geoFeatureSchema.js');
module.exports = mongoose.model('LineString', geoFeatureSchema);
