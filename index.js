const multer = require('multer');
require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const nocache = require("nocache");
const express = require("express");
const app = express();
const userController = require("./controllers/userController");
const adminController = require("./controllers/adminController");
const passport = require('./controllers/authController'); 



// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL);

// Set view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views/users')); // Adjust the path to your views folder

// Middleware
app.use(nocache());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public'))); // Serve files from the 'public' directory

// Routes
const userRoute = require('./routes/userRoute');
app.use('/', userRoute);

// For admin routes
const adminRoute = require('./routes/adminRoute');
app.use('/admin', adminRoute);

// Error handling middleware 
app.use((err, req, res, next) => {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        // Send JSON response for API requests
        return res.status(statusCode).json({
            status: 'error',
            statusCode,
            message
        });
    } else {
        
        return res.status(statusCode).render('error', {
            statusCode,
            message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : ''
        });
    }
});

app.get('/admin/*',adminController.notFoundPage)
app.get('/*',userController.notFoundPage)


app.listen(3000, function () {
    console.log("Server is running...");
});





