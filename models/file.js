/**
 * Created by valdemarrolfsen on 09.02.2016.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// Model
var File = Schema({
    name: String,
    owner: {type: Schema.Types.ObjectId, ref: 'user'},
    sharedWith: [
        {type: Schema.Types.ObjectId, ref: 'user'}
    ],
});

module.exports = mongoose.model('file', File);