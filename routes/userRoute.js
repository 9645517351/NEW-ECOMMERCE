const express = require("express");
const session = require("express-session");
const user = express();
const user_route = express.Router();
const config = require("../config/config");
const userController = require("../controllers/userController");
const productController = require("../controllers/productController");
const auth = require("../middleware/auth");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const nocache = require("nocache");
const authController = require("../controllers/authController")
const passport = require('passport');
// Session middleware
user_route.use(nocache());

user_route.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Body-parser middleware
user_route.use(bodyParser.json());
user_route.use(bodyParser.urlencoded({ extended: true }));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/userImages"));
  },
  filename: function (req, file, cb) {
    const name = Date.now() + "-" + file.originalname;
    cb(null, name);
  },
});
const upload = multer({ storage: storage });

// View engine setup
user.set("view engine", "ejs");
user.set("views", "./views/users");

// User routes
user_route.get("/register", auth.isLogout, userController.loadRegister);
user_route.post("/register", auth.isLogout, userController.insertUser);

user_route.get("/google/login", )

user_route.get(
  "/OTP-verification",
  auth.isLogout,
  userController.otpVerification
);
user_route.post("/OTP-verification", auth.isLogout, userController.checkOTP);

user_route.get("/", auth.isLogout, userController.loginLoad);
user_route.post("/", userController.verifyLogin);

user_route.get("/home", auth.isLogin, userController.loadHome);

user_route
  .route("/verifyForgetPass")
  .get(auth.isLogout, userController.verifyMail)
  .post(auth.isLogout, userController.verifyforgetPassword);

user_route
  .route("/checkOTPpass")
  .get(auth.isLogout, userController.loadForgetPassword)
  .post(auth.isLogout, userController.verifycheckOTPpass);
user_route
  .route("/resetpassword")
  .get(auth.isLogout, userController.loadResetPassword)
  .post(auth.isLogout, userController.verifyResetPassword);

user_route.get("/resend-otp", auth.isLogout, userController.resendOTP);

user_route.get("/shop", auth.isLogin, productController.loadShop);

user_route.get(
  "/products/product-details",
  auth.isLogin,
  productController.loadProductDetail
);

user_route.get("/logout", auth.isLogin, userController.logout);



user_route.get("/google",authController.GetGooglelogin)
user_route.get("/auth/google",authController.googleAuth)

user_route.use(session({ secret: 'cats', resave: false, saveUninitialized: true }));
user_route.use(passport.initialize());
user_route.use(passport.session());

// Use auth routes
//user_route.use(authRoutes);

user_route.get('/auth/google/callback', passport.authenticate('google', {
  successRedirect: '/CreateUser',
  failureRedirect: '/auth/google/failure',
  
}));


user_route.get('/CreateUser', authController.isLoggedIn, userController.googleSignup);


user_route.get('/auth/google/failure', (req, res) => {
  res.send('Failed to authenticate..');
});



module.exports = user_route;
