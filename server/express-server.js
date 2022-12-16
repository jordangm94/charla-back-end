const express = require('express');
const morgan = require('morgan'); //Outputs request data

//////////////////////////////////
//Configuration
/////////////////////////////////
const app = express();
const PORT = 7777;

//////////////////////////////////
//Middleware
/////////////////////////////////

app.use(express.urlencoded({extended: true})); //for form submission
app.use(morgan('dev'));

//////////////////////////////////
//Listener - For server to listen for/be open to requests
/////////////////////////////////

app.listen(PORT, () => {
  console.log('Express app is listening on port:', PORT)
})

//////////////////////////////////
//Routes
/////////////////////////////////

const chatAppRouter = require('./routes/chat-app-router');
app.use('/chat', chatAppRouter) //Each route will begin with /chat
