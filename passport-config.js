const LocalStrategy = require("passport-local").Strategy;

const bcrypt = require("bcryptjs");

async function initialize(passport, getUserByEmail, getUserId) {
  const authenticateUser = async (email, password, done) => {
    const user = await getUserByEmail(email)
      .then(res => res)
      .catch(err => {
        throw err;
      });
    console.log(user[0].password);
    if (!user) {
      return done(null, false, { message: "no user found!" });
    }
    // console.log(
    //   "userpasword " + user[0].Password + " && password is " + password
    // );
    try {
      if (
        bcrypt.compare(password, user[0].password, function(err, res) {
          // res == true
          if (err) throw err;
          if (res === true) {
            console.log("user logged in => " + user[0].AdminName);
            return done(null, user[0]);
          } else {
            return done(null, false, { message: "password doest not match" });
          }
        })
      );

      //   if (await bcrypt.compare(password, user[0].Password), ) {
      //     return done(null, user);
      //   } else {
      //     return done(null, false, { message: "password doest not match" });
      //   }
    } catch (e) {
      return done(e);
    }
  };

  passport.use(new LocalStrategy({ usernameField: "email" }, authenticateUser));

  passport.serializeUser(async (user, done) => await done(null, user));
  passport.deserializeUser((id, done) => {
    return done(null, getUserId(id));
  });
}

module.exports = initialize;
