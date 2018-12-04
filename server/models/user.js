 const mongoose = require('mongoose');
 const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

var UserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        minLength: 1
    },
    lastName: {
        type: String,
        
    },
    email: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        unique: true,
        validate: {
            validator: validator.isEmail,
            message: '{VALUE} is not a valid email'
        }
    },
    password: {
        type: String,
        require: true,
        minLength: 6
    },
    tokens: [{
        access: {
            type: String,
            required: true
        },
        token: {
            type: String,
            required: true
        }
    }]
});

//the below is a override method which will be automatically called when we respond to the express request with res.send. 
//That converts our object to a string by calling JSON.stringify. JSON.stringify is what calls toJSON. 
//In this method we are picking only the properties that we wanted to return from express while hiding others
UserSchema.methods.toJSON = function() {
    var user = this;
    var userObject = user.toObject();

    return _.pick(userObject,['_id','firstName', 'lastName', 'email','password']);
}

UserSchema.methods.generateAuthToken = function () {
    var user = this;
    var access = 'auth';
    var token = jwt.sign({_id: user._id.toHexString(),access: access }, 'abc123').toString();

    //user.tokens.push({access, token}); //this may give some errors due to inconsistencies in mongoose library so use an alterntive below
    user.tokens = user.tokens.concat([{access, token}]);

    return user.save().then(()=>{
        return token;
    });
}

//create a model method called findByToken
UserSchema.statics.findByToken = function (token) {
    
    var User = this;
    var decoded ;
    try {
        decoded = jwt.verify(token, 'abc123');
    }catch (e) {
        return new Promise((resolve, reject)=>{
            reject('Authentication failed');
        });
    }
    
   return User.findOne({
        '_id': decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    });
}

UserSchema.pre('save', function(next){
    var user = this;
    if (user.isModified('password')) {
        bcrypt.genSalt(10, (err, salt)=>{
            bcrypt.hash(user.password, salt, (err, hash)=>{
                user.password = hash;
                next();
            });
        });
        
    }
    else{
        next();
    }
});

var User = mongoose.model('User', UserSchema);


module.exports =  {User};