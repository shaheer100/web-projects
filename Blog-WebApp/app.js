import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import _ from "lodash";
import ejs from "ejs";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";

let auth = false;
let userID = "";

// getting the formatted date (Month day, year)
const currentDate = new Date();
const monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const day = currentDate.getDate();
const month = monthNames[currentDate.getMonth()];
const year = currentDate.getFullYear();

const formattedDate = `${month} ${day}, ${year}`;

//setting up the app, static files in public folder, setting up ejs
const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public")); 
app.use(bodyParser.urlencoded({ extended: true }));

// use the session package, setting it up with initial configurations
app.use(session({
  secret: "messi",
  resave: false,
  saveUninitialized: false
}));

// use and initialize passport packages, and use passport for managing those sessions
app.use(passport.initialize());
app.use(passport.session());

// creating a new database
mongoose.connect("mongodb+srv://shaheersheeraz22:Test123@cluster0.ndvvhaa.mongodb.net/blogDB");

// mongoose schemas, with field name and type
const postsSchema = new mongoose.Schema ({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  title: String,
  body: String,
  date: String,
});

const usersSchema = new mongoose.Schema ({
  displayName: String,
  aboutMe: String,
  username: String,
  Password: String,
});

// used to hash + salt passwords, and save users into MongoDB database
usersSchema.plugin(passportLocalMongoose); 

// mongoose models
const Post = new mongoose.model("Post", postsSchema); 
const User = new mongoose.model("User", usersSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, null);
    });
});

app.get("/register", (req, res) => {
  if (req.isAuthenticated()) {
    auth = true;
    userID = auth ? req.user._id : "";
  }

  console.log(auth);
  const address = req.url;

  res.render("register.ejs", { address: address, auth: auth, userID: userID });
});

app.post("/register", async (req, res) => {
  const newUser = new User({
    displayName: req.body.displayName,
    aboutMe: req.body.aboutMe,
    username: req.body.username,
    Password: req.body.password,
  });

  // register user using parameters entered
  User.register(newUser, req.body.password , (err, user) => {
    if (err) {
      console.log(err); res.redirect("/register");
    }
    else {
      console.log(user + "2");
      passport.authenticate("local")(req, res, () => {
        res.redirect("/");
      })
    }
  });
});

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    auth = true;
    userID = auth ? req.user._id : "";
  }

  console.log(auth);
  const address = req.url;

  res.render("login.ejs", { address: address, auth: auth, userID: userID });
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      // Authentication failed, render login page with error message
      return res.render("login", { address: "/login", auth: false, userID: "", error: "Incorrect username or password." });
    }

    // Authentication succeeded, log in user
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect("/"); 
    });
  })(req, res, next);
});


app.get("/logout", (req, res) => {
  auth = false;

  // log out user, cookie is no longer present
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect("/");
    }
    res.redirect("/");
  });
});

app.get("/compose", (req, res) => {
  if (req.isAuthenticated()) {
    auth = true;
    userID = auth ? req.user._id : "";
  }

  console.log(auth);
  const address = req.url;

  if (req.isAuthenticated()) {
    res.render("compose.ejs", { address: address, auth: auth, userID: userID });
  } else {
    res.render("login.ejs", { address: address, auth: auth, userID: userID });
  }
});

app.post("/compose", async (req, res) => {
  const postTitle = req.body.postTitle;
  const postContent = req.body.postBody;

  const post = new Post({
    user: req.user._id,
    title: postTitle,
    body: postContent,
    date: formattedDate
  });
  
  try {
    await post.save();
    res.redirect("/");
  } catch (err) {
    console.error("Error saving post:", err);
    res.status(500).send("Error saving post.");
  }
});

app.get("/posts/:postID", async (req, res) => {
  if (req.isAuthenticated()) {
    auth = true;
    userID = auth ? req.user._id : "";
  }

  console.log(auth);
  const address = req.url;

  const postID = req.params.postID;
  try {
    const requestedPost = await Post.findOne({ _id: postID });
    res.render("post.ejs", { title: requestedPost.title, body: requestedPost.body, address: address, date: requestedPost.date, auth: auth, userID: userID });
  } catch (err) {
    console.error("Error finding specified post:", err);
    res.status(500).send("Error finding specified post.");
  }
});

app.get("/users/:userID", async (req, res) => {
  if (req.isAuthenticated()) {
    auth = true;
    userID = auth ? req.user._id : "";
  }

  console.log(auth);
  const address = req.url;

  let postsWithSpecificUser;
  try {
    postsWithSpecificUser = await Post.find({ user: userID });
  } catch (err) {
    console.error("Error finding specified user's posts:", err);
    res.status(500).send("Error finding specified user's posts.");
    return;
  }

  try {
    const requestedUser = await User.findOne({ _id: req.user._id });
    res.render("user.ejs", { 
      username: requestedUser.displayName, 
      aboutMe: requestedUser.aboutMe, 
      address: address, 
      auth: auth, 
      userID: userID,
      posts: postsWithSpecificUser,
    });
  } catch (err) {
    console.error("Error finding specified user:", err);
    res.status(500).send("Error finding specified user.");
  }
});

app.get("/", async (req, res) => {
  if (req.isAuthenticated()) {
    auth = true;
    userID = auth ? req.user._id : "";
  }

  console.log(auth);
  const address = req.url;
  
  try {
    const posts = await Post.find({});
    res.render("home.ejs", { address: address, posts: posts, auth: auth, userID: userID });
  } catch (err) {
    console.error("Error loading posts:", err);
    res.status(500).send("Error loading posts.");
  }
});

// Start the server
app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});
