/**
 * Created by rubenschmidt on 08.02.2016.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var geoFeature = new Schema({
    loc: {
        type: {
            type: String,
            enum: ["Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon"]},
        coordinates:[]
    }
});
// Set the index so we can use spatial queries.
geoFeature.index({ loc: "2dsphere" });

module.exports = geoFeature;