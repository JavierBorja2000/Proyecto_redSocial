'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema

const MessageSchema = Schema({
    emmiter: { type: Schema.ObjectId, ref: 'User' },
    receiver: { type: Schema.ObjectId, ref: 'User' },
    text: String,
    create_at: String
})

module.exports = mongoose.model('Message', MessageSchema)