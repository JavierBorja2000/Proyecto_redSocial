'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema

const PublicationSchema = Schema({
    text: String,
    file: String,
    create_at: String,
    user: { type: Schema.ObjectId, ref: 'User' }

})

module.exports = mongoose.model('Publication', PublicationSchema)