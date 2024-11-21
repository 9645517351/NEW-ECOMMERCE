const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

const GOOGLE_CLIENT_ID ="11421401078-qig4jqtthb9n85mh9m30hqrqrqk5eusq.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET ="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";

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/callback",
  passReqToCallback: true,
},
function(request, accessToken, refreshToken, profile, done) {
  return done(null, profile);
}));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


const isLoggedIn = (req, res, next) => {
  req.user ? next() : res.sendStatus(401);
};

const GetGooglelogin = async (req, res) =>{
  res.send('<a href="/auth/google">Authenticate with Google</a>');
}


const googleAuth = passport.authenticate('google', { scope: [ 'email', 'profile' ] });




module.exports = { 
  googleAuth,
  GetGooglelogin,
  isLoggedIn
};
