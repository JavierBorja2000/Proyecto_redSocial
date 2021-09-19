'use strict'

var bodyParser = require('body-parser');
var mongoose =  require('mongoose');
var app = require('./app')
var port = 3800

//conexion DB
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/redSocial_U')
    .then(()=>{
        console.log('+Conexion realizada exitosamente');
        
        //crear servidor
        app.listen(port, () => {
            console.log("servidor corriendo en http://localhost:3800")
        })
    })
    .catch(e => console.log(e))

