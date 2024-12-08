const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const { name } = require("ejs");
const nodemailer = require("nodemailer");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const passport = require("../controllers/authController");
const Address = require("../models/AddressModel");
const Order = require("../models/orderModel");
require("dotenv").config();
const Wallet = require("../models/walletModel");
const Wishlist = require("../models/wishlistModel");
const Cart = require("../models/cartModel")
const easyinvoice = require("easyinvoice");
const { Readable } = require("stream")
const moment = require("moment");
const config = require("../config/config");

const randomstring = require("randomstring");


const securePassword = async (password) => {
  try {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw error;
  }
};

//for send mail
function generateOTP(length) {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
}

const sendVerifyMail = async (email, req) => {
  try {
    const otp = generateOTP(4);
    req.session.otp = otp;
    console.log(req.session.otp);

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS,
      },
    });
    const mailOptions = {
      from: "shijil369@gmail.com",
      to: email,
      subject: "for verification mail",
      html: `<p>Your OTP for email verification is <b>${otp}</b>. Please enter this OTP to verify your email address.</p>`,
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email has been sent:-", info.response);
      }
    });
  } catch (error) {
    console.log(error.message);
  }
};

const loadRegister = async (req, res) => {
  try {
    const referral_code = req.query.referral_code;

    if (referral_code) {
      req.session.referral_code = referral_code;
    }
    res.render("registration", { message: "" });
  } catch (error) {
    console.log(error.message);
  }
};

const insertUser = async (req, res) => {
  try {
    const { name, email, mobile, password, confirm_password } = req.body;

    if (
      !name ||
      !email ||
      !mobile ||
      !password ||
      name.trim() === "" ||
      email.trim() === "" ||
      mobile.trim() === "" ||
      password.trim() === ""
    ) {
      return res.render("registration", {
        message: "All fields are required and must not be empty.",
      });
    }

    if (password !== confirm_password) {
      return res.render("registration", {
        message: "The password and confirm password must be equal",
      });
    }

    const user_id = req.session.user_id;
    const loggedIn = req.session.isAuth ? true : false;
    req.session.tempUserData = { name, email, mobile, password };

    const emailExisting = await User.findOne({ email: email });

    if (emailExisting) {
      return res.render("registration", {
        message:
          "This email is already existing, please provide another email.",
      });
    }

    await sendVerifyMail(email, req);
    res.redirect("/OTP-verification");
  } catch (error) {
    res.render("registration", { message: "Sign up Failed...!" });
  }
};

const otpVerification = async (req, res) => {
  try {
    res.render("OTP-verification", {
      message: "",
    });
  } catch (error) {
    console.log(error.message);
  }
};

const checkOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp || otp.trim() === "") {
      return res.render("OTP-Verification", {
        message: "Invalid OTP. Please try again.",
      });
    }

    // Check if the OTP from the session matches the OTP provided by the user
    if (req.session.otp === otp) {
      console.log(otp, req.session.otp);
      // OTP is correct, clear the OTP from the session
      delete req.session.otp;

      // Retrieve user details from the session
      const { name, email, mobile, password } = req.session.tempUserData;
      if (password == "") {
        return res.render("OTP-Verification", {
          message: "Password should be entered. Please try again.",
        });
      }

      // Hash the password before saving to the database
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create a new user instance
      const newUser = new User({
        name: name,
        email: email,
        mobile: mobile,
        password: hashedPassword,
      });

      // Save the user to the database
      const savedUser = await newUser.save();

      // Create a new wallet for the user
      const newWallet = new Wallet({
        userId: savedUser._id,
        balance: 0,
        transactions: []
      });

      // Check if there's a referral code in the session
      if (req.session.referral_code) {
        const referrerUser = await User.findOne({ _id: req.session.referral_code });
        if (referrerUser) {
          // Add bonus to new user's wallet
          newWallet.balance += 500;
          newWallet.transactions.push({
            amount: 500,
            transactionType: "credit",
            date: new Date(),
          });

          // Add bonus to referrer's wallet
          const referrerWallet = await Wallet.findOne({ userId: referrerUser._id });
          if (referrerWallet) {
            referrerWallet.balance += 500;
            referrerWallet.transactions.push({
              amount: 500,
              transactionType: "credit",
              date: new Date(),
            });
            await referrerWallet.save();
          }
        }
      }

      // Save the new user's wallet
      await newWallet.save();

      // Clear the temporary user data and referral code from the session
      delete req.session.tempUserData;
      delete req.session.referral_code;

      // Redirect to the home page
      res.redirect("/");
    } else {
      // OTP is incorrect, render the OTP verification page with an error message
      res.render("OTP-Verification", {
        message: "Invalid OTP. Please try again.",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.render("OTP-Verification", {
      message: "An error occurred. Please try again later.",
    });
  }
};

const loginLoad = async (req, res) => {
  try {
    res.render("login", {
      message: "",
    });
  } catch (error) {
    console.log(error.message);
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return res.render("login", {
        emailError: emailUser,
        passwordError: config.emailPassword,
      });
    }

    const userData = await User.findOne({ email: email });

    if (userData.is_blocked) {
      return res.render("login", {
        message: "User is blocked",
        passwordError: "",
        mainError: "User is Blocked",
      });
    }

    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);

      if (passwordMatch) {
        // Check if the user is an admin
        if (userData.is_admin) {
          req.session.isAdmin = true;
          return res.redirect("/admin/home");
        } else {
          req.session.user_id = userData._id;
          return res.redirect("/home");
        }
      } else {
        return res.render("login", {
          message: "Incorrect password",
        });
      }
    } else {
      return res.render("login", {
        message: "Email not found",
      });
    }
  } catch (error) {
    console.error("Error during login verification:", error.message);
    res.status(500).render("login", {
      emailError: null,
      passwordError: null,
      message: "An error occurred during login. Please try again later.",
    });
  }
};

const loadHome = async (req, res) => {
  try {
    const categories = await Category.find({ listed: true });
    const listedCategoryIds = categories.map(cat => cat._id);

    const products = await Product.find({ category: { $in: listedCategoryIds } });
    console.log("Fetched Products:", products); // Debugging

    const wishlistCount = req.session.user_id
      ? await Wishlist.countDocuments({ user_id: req.session.user_id })
      : 0;

    const cartCount = req.session.user_id
      ? await Cart.countDocuments({ user_id: req.session.user_id })
      : 0;

    res.render("home", { products, categories, wishlistCount, cartCount });
  } catch (error) {
    console.error("Error in loadHome:", error.message);
    res.status(500).render("error", { message: "Unable to load homepage" });
  }
};

//forget password code start

  const verifyMail = async (req, res) => {
  try {
    const user_id = req.session._id;
    const loggedIn = req.session.isAuth ? true : false;
    res.render("verifyForgetPass", {
      loggedIn,
      title: "User verification",
    });
  } catch (error) {
    console.log(error.message);
  }
};

const loadForgetPassword = async (req, res) => {
  try {
    res.render("checkOTPpass", { message: "" });
  } catch (error) {
    console.log(error.message);
  }
};



const verifyforgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const userData = await User.findOne({ email: email });
    if (userData) {
      req.session.tempUserData = { email };
      await sendVerifyMail(email, req);
      res.redirect("/checkOTPpass");
    } else {
      res.render("verifyForgetPass", { message: "Email is incorrect" });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const verifycheckOTPpass = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log(otp);
    const email = req.session.tempUserData;
    if (req.session.otp === otp) {
      res.redirect("/resetpassword");
    } else {
      res.render("checkOTPpass", { message: "Incorrect OTP" });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const loadResetPassword = async (req, res) => {
  try {
    res.render("resetpassword");
  } catch (error) {
    console.log(error.message);
  }
};
const verifyResetPassword = async (req, res) => {
  try {
    const newPassword = req.body.newPassword;
    if (!newPassword) {
      throw new Error("New password is required");
    }

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    const { email } = req.session.tempUserData;
    const userData = await User.findOne({ email: email });
    if (!userData) {
      throw new Error("User not found");
    }

    userData.password = hashedNewPassword;
    const updatedPass = await userData.save();

    if (updatedPass) {
      res.redirect("/");
    } else {
      res.status(500).send("Error updating password");
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send(error.message);
  }
};

const resendOTP = async (req, res) => {
  try {
    const { email } = req.session.tempUserData;

    if (email) {
      await sendVerifyMail(email, req);
      res.redirect("/OTP-verification");
    } else {
      console.log("Email is not available in tempUserData");
      res.status(400).send("Bad Request: Email not found");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const notFoundPage = async (req, res) => {
  try {
    res.status(404).render("404", {
      message: "Page not found",
      page: "user",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("An error occurred while handling the 404 page.");
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/");
  } catch (error) {
    console.log(error.message);
  }
};

const googleSignup = async (req, res) => {
  try {
    const { email, displayName } = req.user;

    // Check if the user already exists
    let user = await User.findOne({ email: email });
    if (user) {
      req.session.user_id = user._id;

      return res.redirect("/home");
    } else {
      // Create a new user
      user = new User({
        name: req.user.displayName,
        email: req.user.emails[0].value,
        image: req.user.photos[0].value,
      });
    }

    // Save the user to the database
    await user.save();

    // Save the user ID to the session
    req.session.user_id = user._id;

    // Log user info for debugging purposes
    console.log(`User created/updated: ${email}, ${displayName}`);

    // Redirect to the home page or send a response
    res.redirect("/home");
  } catch (error) {
    console.error("Error signing up user:", error);
    res.status(500).send("Internal Server Error");
  }
};


const loadUserProfile = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const loggedIn = req.session.isAuht ? true : false;
    const categories = await Category.find({});

    const wishlist = user_id
      ? await Wishlist.find({ user_id: user_id })
      : await Wishlist.find({ user_id: null });

    // Send wishlist count as well
    const wishlistCount = wishlist.length || 0;

    const cartCount = user_id
      ? await Cart.countDocuments({ user_id: user_id })
      : await Cart.countDocuments({ user_id: null });

    const user = await User.findById(user_id);
    const addressData = await Address.find({ user_id: user_id });

    const addressUserId = addressData.map((address) => address.user_id);
    const userData = await User.findOne({ _id: { $in: addressUserId } });

    const { page = 0 } = req.query;
    const limit = 5; // Set the number of products to display per page

    const currentPage = parseInt(page);
    const nextPage = currentPage + 1;

    const totalOrder = await Order.countDocuments({ user: user_id });
    const totalPages = Math.ceil(totalOrder / limit);

    const orderDetails = await Order.find({ user: user_id })
      .populate("products.productId")
      .sort({ date: -1 })
      .skip(currentPage * limit)
      .limit(limit);

    const { walletPage = 0 } = req.query;
    const pageLimit = 5;

    const currentWalletPage = parseInt(walletPage);
    const nextWalletPage = currentWalletPage + 1;

    const wallet = await Wallet.findOne({ userId: user_id }).populate("transactions");
    const totalWalletTransactions = wallet.transactions.length;
    const totalWalletPages = Math.ceil(totalWalletTransactions / pageLimit);

    const walletData = wallet.transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(currentWalletPage * pageLimit, (currentWalletPage + 1) * pageLimit);



    res.render("userProfile", {
      loggedIn,
      user: user,
      address: addressData,
      cartCount,
      order: orderDetails,
      wallet: { balance: wallet.balance, transactions: walletData },
      wishlistCount,
      categories,
      currentPage,
      nextPage,
      totalPages,
      currentWalletPage,
      nextWalletPage,
      totalWalletPages,
      moment,
    });
  } catch (error) {
    console.log(error.message);
  }
};




const userLogout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/");
  } catch (error) {
    console.log(error.message);
  }
};

const loadeditUserProfile = async (req, res) => {
  try {
    const user_id = req.query.id;
    const userData = await User.findById(user_id);
    const loggedIn = req.session.isAuth ? true : false;
    const categories = await Category.find({})

    const wishlist = user_id
        ? await Wishlist.find({ user_id: user_id })
        : await Wishlist.find({ user_id: null });
  
      // Send wishlist count as well
      const wishlistCount = wishlist.length || 0;

    const cartCount = user_id
      ? await Cart.countDocuments({ user_id : user_id})
      : await Cart.countDocuments({ user_id : null })
    


    res.render("edit-userProfile", {
      user: userData,
      loggedIn,
      wishlistCount,
      categories,
      cartCount
    });
  } catch (error) {
    console.log(error.message);
  }
};

const ShowOrderDetails = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const orderId = req.params.orderId;

    const categories = await Category.find({});

    const wishlist = user_id
      ? await Wishlist.find({ user_id: user_id })
      : await Wishlist.find({ user_id: null });

    const wishlistCount = wishlist.length || 0;

    const cartCount = user_id
      ? await Cart.countDocuments({ user_id: user_id })
      : await Cart.countDocuments({ user_id: null });


      const userData = await User.findById(user_id);
  
      // Fetch all orders sorted by creation date in descending order
      const orders = await Order.find({ user: user_id })
        .sort({ createdAt: -1 })
        .populate("address")
        .populate({
          path: "products.productId",
        });
  
      if (orders.length === 0) {
        return res.status(404).send("No orders found for the user");
      }
  
      // Secondary sorting: if two orders have the same timestamp, sort by product price
      orders.sort((a, b) => {
        const dateDiff = new Date(b.createdAt) - new Date(a.createdAt);
        if (dateDiff === 0) {
          const aMaxPrice = Math.max(...a.products.map(p => p.price));
          const bMaxPrice = Math.max(...b.products.map(p => p.price));
          return bMaxPrice - aMaxPrice;
        }
        return dateDiff;
      });

    // Find the specific order requested by orderId
    const order = orders.find(order => order._id.toString() === orderId);

    if (!order) {
      return res.status(404).send("Order not found");
    }
    // Calculating the subtotal 
    const subTotal = order.products.reduce(
      
      (acc, product) => acc + product.productId.salePrice * product.quantity,
      0
    );

    // Calculating the canceled product price
    const canceledProductPrice = order.products.reduce((acc, product) => {
      if (product.status === "Cancelled") {
        return acc + product.productId.salePrice * product.quantity;
      }
      return acc;
    }, 0);
    
    const returnedProductPrice = order.products.reduce((acc, product) => {
      if (product.status === "Returned") {
        return acc + product.productId.salePrice * product.quantity;
      }
      return acc;
    }, 0);

    console.log(returnedProductPrice, "returnedProductPrice")
  

    // Calculating discound amount 
    let discountAmount = subTotal - parseInt(order.totalPrice);

    // if every order is canceled then show 0
    // if (order.products.every(product => product.status === "Cancelled" || product.status === "Returned")) {
    //   discountAmount = 0;
    // }

    console.log(discountAmount, "discountAmount")

  let grandTotal = subTotal - discountAmount 

  console.log(grandTotal)

    // Render the order details view
    res.render("orderDetails", {
      orders, 
      order, 
      user: userData,
      categories,
      wishlistCount,
      cartCount,
      subTotal,
      canceledProductPrice,
      discountAmount,
      grandTotal,
      returnedProductPrice
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};



const createEditUserProfile = async (req, res) => {
  try {
    const { id } = req.query;

    const { name, email, mobile } = req.body;

    const userData = await User.findByIdAndUpdate(
      id,
      {
        name,
        email,
        mobile,
      },
      { new: true }
    );
    if (userData) {
      res.redirect("/userProfile");
    } else {
      res.json({ message: " user not found... " });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const loadAddress = async (req, res) => {
  try {
    res.render("add-Address");
  } catch (error) {
    console.log(error.message);
  }
};

const loadAddressUserProfile = async (req, res) => {
  try {
    const address_id = req.query.id;
    const user_id = req.session.user_id
    const loggedIn = req.session.isAuth ? true : false;

    const cartCount = user_id
    ? await Cart.countDocuments({ user_id : user_id})
    : await Cart.countDocuments({ user_id : null })

    const categories = await Category.find({})

        const wishlist = user_id
        ? await Wishlist.find({ user_id: user_id })
        : await Wishlist.find({ user_id: null });

        const wishlistCount = wishlist.length || 0;

    const address = await Address.findById(address_id);
    console.log(address);

    res.render("editAddressUserProfile", {
      loggedIn,
      cartCount,
      address,
      wishlistCount,
      categories
    });
  } catch (error) {
    console.log(error.message);
  }
};

const editUserProfileAddress = async (req, res) => {
  try {
    const { id } = req.query;
    const {
      firstName,
      lastName,
      city,
      streetAddress,
      state,
      zipcode,
      phone,
      email,
    } = req.body;

    const user_id = req.session.user_id;

    const updatedAddress = await Address.findByIdAndUpdate(
      id,
      {
        firstName,
        lastName,
        city,
        streetAddress,
        state,
        zipcode,
        phone,
        email,
        user_id,
      },
      {
        new: true,
      }
    );
    if (updatedAddress) {
      res.redirect("/userProfile");
    } else {
      res.json({ success: false, message: " Address Not Found... " });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const loadeditPassword = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const userData = await User.findById(user_id);
    const loggedIn = req.session.isAuth ? true : false;

    const categories = await Category.find({})

    const wishlist = user_id
        ? await Wishlist.find({ user_id: user_id })
        : await Wishlist.find({ user_id: null });
  
      // Send wishlist count as well
      const wishlistCount = wishlist.length || 0;

      const cartCount = user_id
      ? await Cart.countDocuments({ user_id : user_id})
      : await Cart.countDocuments({ user_id : null })


    res.render("editPassword", {
      user: userData,
      loggedIn,
      categories,
      wishlistCount,
      cartCount
    });
  } catch (error) {
    console.log(error.message);
  }
};

const editUserPassword = async (req, res) => {
  try {
    const { id } = req.query;
    const { password, newPassword } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = newHashedPassword;
    const updatedUser = await user.save();

    if (updatedUser) {
      return res.json({
        success: true,
        message: "Password successfully updated",
      });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Failed to update password" });
    }
  } catch (error) {
    console.error("Error updating password:", error.message);
    return res
      .status(500)
      .json({
        success: false,
        message:
          "An error occurred while updating the password. Please try again later.",
      });
  }
};


const renderAboutPage = async (req, res) => {

  const user_id = req.session.user_id
  try {

    const categories = await Category.find({});
            
    const wishlist = user_id
        ? await Wishlist.find({ user_id: user_id })
        : await Wishlist.find({ user_id: null });

      const productId = wishlist.map((wishlist) => wishlist.product_id);
      const products = await Product.find({ _id: { $in: productId } });

      const wishlistCount = wishlist.length ||0;

      const cartCount = user_id 
            ? await Cart.countDocuments({ user_id })
            : await Cart.countDocuments({ user_id: null });


    res.render("about",{categories, wishlist, products, wishlistCount, cartCount});

  } catch (error) {
    console.log(error.message);
  }
}


const renderContactPage = async(req,res)=>{

  const user_id = req.session.user_id
  
  try {

    const categories = await Category.find({});
            
    const wishlist = user_id
        ? await Wishlist.find({ user_id: user_id })
        : await Wishlist.find({ user_id: null });

      const productId = wishlist.map((wishlist) => wishlist.product_id);
      const products = await Product.find({ _id: { $in: productId } });

      const wishlistCount = wishlist.length ||0;

      const cartCount = user_id 
            ? await Cart.countDocuments({ user_id })
            : await Cart.countDocuments({ user_id: null });

    res.render("contact",{categories, wishlist, products, wishlistCount, cartCount});
      
  } catch (error) {
      console.log(error.message);
  }
}


const loadReferral=async(req,res)=>{

  const user_id = req.session.user_id
  try {
    const categories = await Category.find({});
    const wishlist = user_id
        ? await Wishlist.find({ user_id: user_id })
        : await Wishlist.find({ user_id: null });

      const productId = wishlist.map((wishlist) => wishlist.product_id);
      const products = await Product.find({ _id: { $in: productId } });

      const wishlistCount = wishlist.length ||0;

      const cartCount = user_id 
            ? await Cart.countDocuments({ user_id })
            : await Cart.countDocuments({ user_id: null });
    res.render("referral",{categories, wishlist, products, wishlistCount, cartCount, user_id});
  } catch (error) {
    console.log(error.message);
  }
}


const downloadInvoice = async(req,res)=>{
  try {
      const orderId = req.query.id
      const userId = req.session.user_id

      const order = await Order.findById(orderId)
      .populate({
          path: 'products.productId',
          model: 'Products'
      }) .populate( 'address');
      if (!order) {
          res.status(404).json({ success : false , message : "Order not Found...!" })
      }
      const user = await User.findById(userId)
      
    
      const invoiceData = {
          id: orderId,
          total: order.products[0].productId.salePrice,
          date : order.date.toLocaleDateString('en-US',{
              year : "numeric",
              month : "long",
              day : "numeric"
          }),
          paymentMethod: order.payment,
          orderStatus: order.status,
          name: order.address.lastName,
          number: order.address.mobile,
          house: order.address.streetAddress,
          pincode: order.address.zipcode,
          town: order.address.city,
          state: order.address.state,
          products: order.products.map((product) => ({
              description: product.productId.productName,
              quantity: product.quantity, // Accessing productName from productId
              price: product.productId.salePrice, // Assuming product has a direct 'price' field,
              total: product.productId.grandTotal,
              'tax-rate': 0,
          })),
          
          sender:{
              company : 'MAHARAJA FURNITURE',
              address : 'Kunnathoor Highway',
              city : "Kunnathoor",
              country : 'India'
          },
          client: {
              company: "ABC FURNITURE",
              zip: order.address.zipcode,
              city: order.address.city,
              address : order.address.streetAddress
              
          },
          information : {
              number : `order${order._id}`,
              date : order.date.toLocaleDateString('en-US',{
                  year : "numeric",
                  month : "long",
                  day : "numeric"
              }),
          },
          'bottom-notice' : 'Happy Shopping and Visit Again...'
      };
      
      const pdfResult = await easyinvoice.createInvoice({
          ...invoiceData
      });
      
      const pdfBuffer = Buffer.from(pdfResult.pdf,'base64')
      

     
      res.setHeader('Content-Disposition','attachment; filename="invoice.pdf"')
      res.setHeader('Content-Type', 'application/pdf');

      
      const pdfStream = new Readable();
      
      pdfStream.push(pdfBuffer)
      pdfStream.push(null)

      pdfStream.pipe(res)
      
  } catch (error) {
      console.log(error.message);
  }
}


module.exports = {
  loadRegister,
  insertUser,
  loginLoad,
  verifyLogin,
  loadHome,
  sendVerifyMail,
  otpVerification,
  verifyMail,
  loadForgetPassword,
  verifycheckOTPpass,
  verifyforgetPassword,
  loadResetPassword,
  verifyResetPassword,
  resendOTP,
  checkOTP,
  logout,
  notFoundPage,
  googleSignup,
  loadUserProfile,
  userLogout,
  loadeditUserProfile,
  editUserProfileAddress,
  createEditUserProfile,
  loadAddressUserProfile,
  loadeditPassword,
  editUserPassword,
  ShowOrderDetails,
  renderAboutPage,
  renderContactPage,
  loadReferral,
  downloadInvoice
};
