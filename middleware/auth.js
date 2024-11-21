const isLogin = async (req, res, next) => {
  try {
    if (req.session.user_id ) {
      next(); // Proceed to the next middleware/route handler
    } else if(req.session.isAdmin) {
      res.redirect("/admin/home");
    }
    else {
      res.redirect('/')
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const isLogout = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      res.redirect("/home");
    }else if (req.session.isAdmin) {
      res.redirect('/admin/home')
    }
     else {
      next(); // Proceed to the next middleware/route handler
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};



module.exports = {
  isLogin,
  isLogout,
  
};
