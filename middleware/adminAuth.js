const isLogin = async (req, res, next) => {
  try {
    console.log(req.session.isAdmin,"admin auth")
    if (!req.session.isAdmin) res.redirect("/");

    next();
  } catch (error) {
    console.log(error.message);
  }
};

const isLogout = async (req, res, next) => {
  try {
    if (req.session.isAdmin) {
      res.redirect("/admin/home");
    }

    next();
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  isLogin,
  isLogout,
};
