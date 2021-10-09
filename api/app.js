'use strict'

const express =  require('express');
const bodyParser = require('body-parser');

const app =  express();

// cargar rutas
const user_routes = require('./routes/user')
const follow_routes = require('./routes/follow')

// middlewares
app.use(express.urlencoded({extended:false}))
app.use(express.json());

//cors

//rutas
app.use('/api', user_routes);
app.use('/api', follow_routes)

//exportacion
module.exports = app