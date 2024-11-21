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
const addressController= require('../controllers/addressController')
const passport = require('passport');
const cartController = require('../controllers/cartController')
const orderController = require('../controllers/orderController')
const categoryController= require('../controllers/categoryController')
const wishlistController= require('../controllers/wishlistController');
const couponModel = require("../models/couponModel");
const couponController = require("../controllers/couponController")

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


user_route.get('/userProfile',auth.isLogin,userController.loadUserProfile)
user_route.get('/edit-userProfile',auth.isLogin,userController.loadeditUserProfile)
user_route.post('/edit-userProfile',auth.isLogin,userController.createEditUserProfile)
user_route.get("/add-address",auth.isLogin,addressController.loadAddress)
user_route.post('/add-address',auth.isLogin,addressController.createAdress)

user_route.get('/edit-userProfileAddress',auth.isLogin,userController.loadAddressUserProfile)
user_route.post('/edit-userProfileAddress',auth.isLogin,userController.editUserProfileAddress)
user_route.delete('/user-profile/delete-address',auth.isLogin,addressController.userProfileAddressDelete)
user_route.get('/edit-userProfilePassword',auth.isLogin,userController.loadeditPassword)
user_route.post('/edit-userProfilePassword', auth.isLogin, userController.editUserPassword)


user_route.get("/add-to-cart",auth.isLogin,cartController.loadCart)
user_route.post("/add-to-cart",auth.isLogin,cartController.AddProductToCart)
user_route.put("/add-to-cart-icon",auth.isLogin,cartController.AddOneItemToCart)
user_route.delete("/products/cart-delete",auth.isLogin,cartController.deleteCart)
user_route.post("/cart/qtyInc",cartController.incrememtingCount)
user_route.post("/cart/qtyDec",cartController.decrementingCount)

user_route.get("/check-out",auth.isLogin,orderController.loadCheckOut)
user_route.post("/checkout/cash-on-delivery",auth.isLogin,orderController.CashOnDelivery)
user_route.post("/checkout/razor-pay",auth.isLogin,orderController.razorPayPayment)
user_route.post("/checkout/razor-pay/razorpayCompleteOrder", auth.isLogin, orderController.razorpayCompleteOrder);
// user_route.post("/complete-order",auth.isLogin,orderController.razorpayCompleteOrder)

user_route.post("/checkout/wallet",auth.isLogin,orderController.WalletPlaceOrder)
user_route.post("/addcouponcode",auth.isLogin,couponController.CheckCoupon)
user_route.post("/coupon/remove-coupon",auth.isLogin, couponController.removeCoupon)

user_route.get("/edit-Address",auth.isLogin,addressController.loadEditAddress)
user_route.post("/edit-Address",auth.isLogin,addressController.createEditAddress)
user_route.get("/orderCompleted",auth.isLogin,orderController.orderSuccessfull)
user_route.get("/view-order/:orderId/:productId",auth.isLogin,userController.ShowOrderDetails)
user_route.put("/order-cancel/:orderId",auth.isLogin,orderController.orderCancel)
user_route.put("/order-return/:orderId",auth.isLogin,orderController.returnOrderRequest)

user_route.get("/wishlist",auth.isLogin, wishlistController.loadWishlist)
user_route.put("/add-to-wishlist-icon",auth.isLogin,wishlistController.addOneItemtoWishlist)
user_route.delete("/products/wishlist-delete",auth.isLogin,wishlistController.deleteWishlist)

user_route.get("/referral",auth.isLogin, userController.loadReferral)


user_route.get("/logout",auth.isLogin, addressController.userProfileAddressDelete)
user_route.get("/contact",auth.isLogin, userController.renderContactPage)
user_route.get("/about",auth.isLogin, userController.renderAboutPage)

user_route.get("/invoice",auth.isLogin,orderController.getInvoice)
user_route.get("/saveinvoice",auth.isLogin,userController.downloadInvoice)



module.exports = user_route;
