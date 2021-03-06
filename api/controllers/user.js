'use strict'

const User = require('../models/user')
const Follow = require('../models/follow')
const Publication = require('../models/publication')

const bcrypt = require('bcrypt-nodejs')
const jwt = require('../services/jwt')
const mongoosePaginate = require('mongoose-pagination')
const fs = require('fs')
const path = require('path')

// metodos de prueba
const home = (req, res) => {
    res.status(200).send({
        message: 'Hola mundo desde el servidor Nodejs'
    })
}

const prueba = (req, res) => {
    res.status(200).send({
        message: 'Hola mundo desde el servidor Nodejs'
    })
}

//registro
const saveUser = (req, res) => {
    let params = req.body
    let user = new User();

    if(params.name && params.surname && params.nick && params.email && params.password){

        user.name = params.name
        user.surname = params.surname
        user.nick = params.nick
        user.email = params.email
        user.role = 'ROLE_USER'
        user.image = null

        //Controlar usuarios duplicados
        User.find({ $or: [
            {email: user.email.toLowerCase()},
            {nick: user.nick.toLowerCase()}
        ]}).exec((err, users) => {
            if(err) return res.status(500).send({message: 'Error al guardar el usuario'})

            if(users && users.length >= 1){
                return res.status(200).send({message: 'El usuario que intenta registrar ya existe'})
            }else{

              //Cifrar password y guardar los datos
              bcrypt.hash(params.password, null, null, (e, hash) => {
                user.password = hash;

                user.save((e, userStored) => {
                  if (e)
                    return res
                      .status(500)
                      .send({ message: "Error al guardar el usuario" });

                  if (userStored) {
                    res.status(200).send({ user: userStored });
                  } else {
                    res
                      .status(404)
                      .send({ message: "no se ha registrado un usuario" });
                  }
                });
              });
            }
        })

        

    }else{
        res.status(200).send({
            message: 'Envia todos los campos necesarios!'
        })
    }
}

//login
const loginUser = (req, res) => {
    let params = req.body

    let email = params.email
    let password = params.password

    User.findOne({email: email}, (err, user) => {
        if(err) return res.status(500).send({message: 'Error en la peticion'})

        if(user){
            bcrypt.compare(password, user.password, (err, check)=>{
                if(check){

                    if(params.gettoken){
                        //generar y devolver token
                        return res.status(200).send({
                            token: jwt.createToken(user)
                        })
                    }else{
                        //devolver datos usuario
                        user.password = undefined
                        return res.status(200).send({user})
                    }

                }else{
                    return res.status(404).send({message: 'El usuario no se ha podido identificar'})
                }
            })
        }else{
            return res.status(404).send({message: 'El usuario no se ha podido identificar!!'})
        }
    })
}


// metodo para obtener datos de un usuario(cualquiera)
const getUser = (req, res) => {
    let userId = req.params.id

    User.findById(userId, (err, user) => {
        if(!user) return res.status(404).send({message: 'El usuario no existe'})
        if(err) return res.status(500).send({message: 'Error en la peticion'})
        
        followThisUsers(req.user.sub, userId).then((value) => {   //mostrar usuarios que estoy siguiendo y me siguen
            user.password = undefined
            
            return res.status(200).send({
                user,
                following: value.following,
                followed: value.followed
            })
        })
        
    })
}

async function followThisUsers(identity_user_id, user_id) {
    var following = await Follow.findOne({ "user":identity_user_id, "followed":user_id }).exec().then((follow) => {
        return follow;
    }).catch((err) => {
        return handleError(err);
    });
 
    var followed = await Follow.findOne({ "user":user_id, "followed":identity_user_id }).exec().then((follow) => {
        // console.log(follow);
        return follow;
    }).catch((err) => {
        return handleError(err);
    });
 
 
    return {
        following: following,
        followed: followed
    }
}



// Devolver un listado de usuarios paginados
const getUsers = (req, res) => {
    let identity_user_id = req.user.sub
    let page = 1

    if(req.params.page){
        page = req.params.page
    }

    let itemsPerPage = 5

    User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {
        if(err) return res.status(500).send({message: 'Error en la peticion'})

        if(!users) return res.status(404).send({ message: 'NO hay usuarios disponibles'})

        followUsersIds(identity_user_id).then(value => {
            
            return res.status(200).send({
                users,
                users_following: value.following,
                users_follow_me: value.followed,
                total,
                pages: Math.ceil(total/itemsPerPage)
            })
        })
    })
}

async function followUsersIds(user_id) {
    var following = await Follow.find({ 'user': user_id }).select({ _id: 0, __v: 0, user: 0 })
        .exec()
        .then((follows) => {
            var follows_clean = [];
            follows.forEach((follow) => {
                follows_clean.push(follow.followed);
            });
            return follows_clean;
        })
        .catch((err) => {
            return handleError(err);
        });

    var followed = await Follow.find({ 'followed': user_id }).select({ _id: 0, __v: 0, 'followed': 0 })
        .exec()
        .then((follows) => {
            var follows_clean = [];
            follows.forEach((follow) => {
                follows_clean.push(follow.user);
            });
            return follows_clean;
        })
        .catch((err) => {
            return handleError(err);
        });

    return {
        following: following,
        followed: followed
    };
}

//contador de usuarios que seguimos y que nos siguen
const getCounters = (req, res) => {
    let userId = req.user.sub;
    if(req.params.id){
        userId = req.params.id;      
    }
    getCountFollow(userId).then((value) => {
        return res.status(200).send(value);
    })
}
 
async function getCountFollow(user_id) {
    var following = await Follow.countDocuments({ user: user_id })
        .exec()
        .then((count) => {
            console.log(count);
            return count;
        })
        .catch((err) => { return handleError(err); });
 
    var followed = await Follow.countDocuments({ followed: user_id })
        .exec()
        .then((count) => {
            return count;
        })
        .catch((err) => { return handleError(err); });
 
    var publications = await Publication.countDocuments({ user: user_id})
        .exec()
        .then((count) => {
          return count;
        })
        .catch((err) => { return handleError(err); });
 
    return { following: following, followed: followed, publication: publications } 
}


// Actualizacion de datos del usuario
const updateUser = (req, res) => {
    const userId = req.params.id
    const update = req.body

    // borrar propiedad password
    delete update.password

    //El objeto user pasado en la url tiene que ser el mismo que el objeto que tiene el token(el que esta registrado)
    if(userId != req.user.sub){
        return res.status(500).send({message: 'No tienes permiso para actualizar los datos del usuario'})
    }

    User.findByIdAndUpdate(userId, update, {new:true}, (err, userUpdated) => {
        if(err) return res.status(500).send({message: 'Error en la peticion'})

        if(!userUpdated) return res.status(404).send({message: 'No se ha podido actualizar el usuario'})

        return res.status(200).send({user: userUpdated})
    })
}

//Subir avatar de imagen del usuario
const uploadImage = (req, res) => {
    const userId = req.params.id

    if(req.files){
        let file_path = req.files.image.path

        //separo el path para solo extraer el nombre de la imagen: imagen3.jpg
        let file_split = file_path.split("\\")
        
        //Guardo solo el nombre de la imagen 
        let file_name = file_split[2]

        //extraer la extension del archivo
        let ext_split = file_name.split('\.')

        let file_ext = ext_split[1] //jpg
        
        if(userId != req.user.sub){
            return removeFilesOfUploads(res, file_path, 'No tienes permiso para actualizar los datos del usuario')
        }

        if(file_ext === 'png' || file_ext === 'jpg' || file_ext === 'jpeg' || file_ext === 'gif'){
            // Actualizar documento de usuario logueado
            User.findByIdAndUpdate(userId, {image: file_name}, {new:true}, (err, userUpdated)=>{
                if(err) return res.status(500).send({message: 'Error en la peticion'})

                if(!userUpdated) return res.status(404).send({message: 'No se ha podido actualizar el usuario'})

                return res.status(200).send({user: userUpdated})
            })
        }else{
            return removeFilesOfUploads(res, file_path, 'La extension no es valida')
        }


    }else{
        return res.status(200).send({message: 'No se han subido archivos de imagen'})
    }
} 

const getImageFile = (req, res) => {
    let image_file = req.params.imageFile
    let path_file = './uploads/users/' + image_file

    fs.exists(path_file, (exists) => {
        if(exists){
            res.sendFile(path.resolve(path_file))
        }else{
            res.status(200).send({message: 'No existe la imagen'})
        }
    })
}

const removeFilesOfUploads = (res, file_path, message) =>{
    fs.unlink(file_path, (err)=>{
        return res.status(200).send({message: message})
    })
}


module.exports = {
    home,
    prueba,
    saveUser,
    loginUser,
    getUser,
    getUsers,
    getCounters,
    updateUser,
    uploadImage,
    getImageFile,
}