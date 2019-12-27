if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

var express = require('express');
var app = express();
const bcrypt = require("bcryptjs");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
const methodOverride = require("method-override");

// setting up mysql
var mysql = require('mysql');


var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "OpdemyBlog"
});

var port = 3000;

// #######################Authentication code starts here#################################################
// working with postman but no the the ui...see from line 80 in index.ejs

var BodyParser = require('body-parser');
app.use(BodyParser.urlencoded({ extended: false }));
app.use(BodyParser.json());

// app.use(function (req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
// });

// var router = express.Router();
// // test route
// router.get('/', function (req, res) {
//     res.json({ message: 'welcome to our upload module apis' });
// });

// router.post('/login', login.login);
// app.use('/api', router);
// ################################authentication code ends here############################################

// setting up ejs
var path = require('path');

// setting up engines
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false
    })
);
app.use(
    session({
        secret: "cookie_secret",
        resave: false,
        saveUninitialized: true
    })
);

// requiring initialise module from passport-config file
const initializedPassport = require("./passport-config");


// passport initialization
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride("_method"));


app.use(express.static('public'));
app.use(express.static("static"));


// Connection to the database
con.connect(function (err) {
    if (err) throw err;
    console.log('connected  to database!');

    // ###########mysql-passport authentication
    //   returning email
    async function find_email(email) {
        return new Promise((res, rej) => {
            con.query(
                `select * from Admin where email = ?`,
                [email],
                async (err, row, field) => {
                    if (err) rej(err);
                    // console.log("+++++++++++");
                    // console.log(row[0].email);
                    res(row);
                }
            );
        }).catch((error) => {
            assert.isNotOk(error, 'Promise error');
            done();
        });;
    }

    //   returning Id
    async function find_Id(id) {
        return new Promise((res, rej) => {
            con.query(
                `select * from Admin where Id = ?`,
                [id],
                async (err, row, field) => {
                    if (err) rej(err);
                    // console.log("+++++++++++");
                    // console.log(row[0].email);
                    res(row);
                }
            );
        }).catch((error) => {
            if (err) throw err;
        });;
    }


    con.query(`select * from Admin`, (err, user, field) => {
        if (err) throw err;
        console.log(user);

        initializedPassport(
            passport,
            email => find_email(email),
            id => find_Id(id)
        );

    });




    // register##################################
    app.get("/register", checkNotAuthenticated, (req, res) => {
        res.render('register');
    });

    app.post("/register", checkNotAuthenticated, async (req, res) => {
        try {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            const values = {
                AdminName: req.body.name,
                email: req.body.email,
                password: hashedPassword
            };
            con.query(`insert into Admin set ?`, values, (err, row, fields) => {
                if (err) throw err;
                console.log(row);
            });
            res.redirect("/login");
        } catch {
            res.redirect("/register");
        }
    });




    // Main page render
    app.get('/blogOpdemy', (req, res) => {
        con.query('select * from Blog Order by postDate', (err, postDate, field) => {
            if (err) { throw err; }
            else {

                con.query('select * from Blog Order by title', (err, title, field) => {
                    if (err) throw err;
                    else {
                        var obj = {};
                        obj.byid = postDate;
                        obj.bylikes = title;
                        // for (var blog in obj.byid) {
                        //     // console.log(obj.bylikes[blog].title); 
                        // }
                        // console.log(obj);
                        res.render('index', { obj });
                    }
                })
            }
        })
    })

    // login post
    app.post('/login', checkNotAuthenticated, function (req, res, next) {
        passport.authenticate('local', function (err, user, info) {
            if (err) { return next(err); }
            // Redirect if it fails
            if (!user) { return res.redirect('/blogOpdemy'); }
            req.logIn(user, function (err) {
                if (err) { return next(err); }
                // Redirect if it succeeds
                console.log(`/adminblogs/${user.Id}`);
                return res.redirect(`/adminblogs/${user.Id}`);
            });
        })(req, res, next);
    });




    // Main page render with admin logged in
    app.get('/adminblogs/:id', checkAuthenticated, (req, res) => {
        var adminId = req.params.id;
        console.log(adminId);
        con.query(`select * from Blog where adminId = ${adminId} Order by Id`, (err, blog, field) => {
            if (err) { throw err; }
            else {
                // for (var i in blog) {
                //     console.log(blog[i]);
                // }
                res.render('adminblogs', { blog, adminId });
            }
        })
    })



    // Blog page show for particular Id
    app.get('/blogPage/:Id', (req, res) => {

        var id = req.params.Id;
        console.log(id);

        con.query(`select * from Blog where Id = ?`, [id], (err, blog, field) => {
            if (err) throw err;

            console.log(blog);

            var obj = {};
            obj.blog = blog;
            // console.log(obj.blog[0].title);
            res.render('blogPage', { obj });
        })
    })

    // Blog entry get request
    app.get('/blogentry/:adminId', checkAuthenticated, (req, res) => {
        var adminId = req.params.adminId;
        // console.log(req.params.adminId);
        res.render('blogentry', { adminId });
    })

    // Blog entry post request
    app.post('/blogentry/:adminId', checkAuthenticated, (req, res) => {

        var blogtitle = req.body.blogtitle;
        var blogBody = req.body.blogBody;
        var likes = req.body.likes || Math.random() * 100;
        var date = new Date().toISOString().slice(0, 10);
        var adminId = req.params.adminId;

        // console.log(`this is the adminId ` + adminId);
        // res.end();
        var values = { title: blogtitle, blogContent: blogBody, likes: likes, postDate: date, adminId: adminId }
        con.query(`insert into Blog set ?`, values, (err, blog, field) => {
            if (err) throw err;

            res.redirect('/blogOpdemy');
        })
    })


    // Blog update get request
    app.get('/updateblog/:adminId/:blogId', checkAuthenticated, (req, res) => {
        var adminId = (req.params.adminId);
        var blogid = (req.params.blogId);
        // console.log(adminId + " " + blogid);

        // console.log(`select * from Blog where Id = ? and adminID = ?`, [blogid], [adminId]);
        con.query(`select * from Blog where (Id = ?)`, [blogid], (err, blog, field) => {
            if (err) throw err;

            console.log(blog);

            var obj = {};
            obj.blog = blog;
            // console.log(obj.blog[0].title);
            res.render('blogpreentered', { obj });
        })


    })

    // Blog update put request for particular Id
    app.post('/updateblog/:adminId/:blogId', checkAuthenticated, (req, res) => {

        var id = req.params.blogId;
        console.log(id);
        var blogtitle = req.body.blogtitle;
        var blogBody = req.body.blogBody;
        var date = new Date().toISOString().slice(0, 10);
        var adminId = req.params.adminId;

        // console.log(blogtitle + " " + blogBody + " " + date);

        // values = { title: blogtitle, blogContent: blogBody, postDate: date }
        con.query(`update Blog set title = ?, blogContent = ?, postDate = ?, adminId = ? where Id = ${id}`, [blogtitle, blogBody, date, adminId], (err, blog, field) => {
            if (err) throw err;

            console.log(blog);
            res.redirect('/blogOpdemy');
        })

    })

    // Log out 
    app.delete("/logout", (req, res) => {
        req.logout();
        res.redirect("/blogOpdemy");
    });

    // for checking if the user is authenticated then stopping him from going to other routes
    function checkAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect("/blogOpdemy");
    }

    // for checking if the user is not authenticated then stopping him from going to any route which should be accessed by authorised personal
    function checkNotAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
            return res.redirect("/blogOpdemy");
        }
        next();
    }
});




app.listen(port, (req, res) => {
    console.log(`listening to port ${port}`);
})
