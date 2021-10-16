var createError = require('http-errors');
var express = require('express');
var cors = require('cors')
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var handleErrors = require('./modules/middleware/handleErrors');
var { BadRequest } = require('./modules/util/errors');
const swaggerJSDoc = require('swagger-jsdoc');  
const swaggerUI = require('swagger-ui-express');  
const admin = require("firebase-admin");

const serviceAccount = require("./config/firebase/misiontic-93870-firebase-adminsdk-5dgjt-0bbd6d0062.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var app = express();

var MongoDBUtil = require('./modules/mongodb/mongodb.module').MongoDBUtil;
var CustomerController = require('./modules/customer/customer.module')().CustomerController;

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

//Swagger Configuration  
const swaggerOptions = {  
  swaggerDefinition: {  
      info: {  
          title:'Customers API',  
          version:'1.0.0'  
      },
      basePath: '/',
      securityDefinitions: {
        bearerAuth: {
          type: 'apiKey',
          name: 'Authorization',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header'
        } 
      },
      "security": [{ "bearerAuth": [] }]  
  },  
  apis:['./modules/customer/customer.controller.js'],  
}  
const swaggerDocs = swaggerJSDoc(swaggerOptions);  
app.use('/api-docs',swaggerUI.serve,swaggerUI.setup(swaggerDocs)); 

MongoDBUtil.init();
app.use(cors());

function checkAuth(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const idToken = req.headers.authorization.split('Bearer ')[1];
    admin.auth().verifyIdToken(idToken)
      .then(() => {
        next()
      }).catch((error) => {
        res.status(403).send('Unauthorized')
      });
  } else {
    res.status(401).send('Unauthorized')
  }
}

app.use('*', checkAuth)

app.get('/auth', (req, res) => {
  res.json({
    message: 'Hello World!'
  })
})
app.use('/customers', CustomerController);

app.get('/', function (req, res) {
  var pkg = require(path.join(__dirname, 'package.json'));
  res.json({
      name: pkg.name,
      version: pkg.version,
      status: 'up'
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
/*app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({
    message: res.locals.message,
    error: res.locals.error
  });
});*/

app.use(handleErrors);

module.exports = app;
