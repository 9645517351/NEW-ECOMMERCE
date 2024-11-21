const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const { name } = require("ejs");
const nodemailer = require("nodemailer");
const Product = require("../models/productModel");
const passport = require('../controllers/authController')
require("dotenv").config();

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
        pass:process.env.PASS ,
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
      message: ""
    });
  } catch (error) {
    console.log(error.message);
  }
};

const checkOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp || otp.trim() === "") {
      res.render("OTP-Verification", {
        message: "Invalid OTP. Please try again.",
      });
    }

    // Check if the OTP from the session matches the OTP provided by the user
    if (req.session.otp === otp) {
      console.log(otp,req.session.otp);
      // OTP is correct, clear the OTP from the session
      delete req.session.otp;

      // Retrieve user details from the session
      const { name, email, mobile, password } = req.session.tempUserData;
      if (password == ""){
        res.render("OTP-Verification", {
          message: "password should be entered. Please try again.",
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
      await newUser.save();

      // Clear the temporary user data from the session
      delete req.session.tempUserData;

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
    const products = await Product.find({});
    res.render("home", { products });
  } catch (error) {
    console.log(error.message);
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
    res.render("checkOTPpass",{message:""});
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

    return res.redirect('/home');


    } else {
      // Create a new user
      user = new User({
        name: req.user.displayName,
        email: req.user.emails[0].value,
        image: req.user.photos[0].value
      });
    }

    // Save the user to the database
    await user.save();

    // Save the user ID to the session
     req.session.user_id = user._id;

    // Log user info for debugging purposes
    console.log(`User created/updated: ${email}, ${displayName}`);

    // Redirect to the home page or send a response
    res.redirect('/home');
  } catch (error) {
    console.error('Error signing up user:', error);
    res.status(500).send('Internal Server Error');
  }
};







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
  googleSignup
};
