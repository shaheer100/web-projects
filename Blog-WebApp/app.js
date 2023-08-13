import dotenv from "dotenv";
import express, { request } from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import _ from "lodash";
import ejs from "ejs";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import findOrCreate from "mongoose-findorcreate";
import FacebookStrategy from "passport-facebook";

dotenv.config();

let auth = false;
let userID = "123";

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

// use the session package, setting it up with initial configurations
app.use(session({
  secret: "messi",
  resave: false,
  saveUninitialized: false
}));

app.use(bodyParser.urlencoded({ extended: true }));

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
  password: String,
});

// used to hash + salt passwords, and save users into MongoDB database
usersSchema.plugin(passportLocalMongoose); 
usersSchema.plugin(findOrCreate);

// mongoose models
const Post = new mongoose.model("Post", postsSchema); 
const User = new mongoose.model("User", usersSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id); 
});

passport.deserializeUser(async function(id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Facebook OAuth setup
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "https://blogtoday-358bc2e83982.herokuapp.com/auth/facebook/callback"
}, 
async function(accessToken, refreshToken, profile, cb) {
  const displayName = profile.displayName;
  const username = profile.id;

  try {
    // Check if a user with the same username already exists
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      // User already exists, return the existing user
      return cb(null, existingUser);
    } else {
      // Create a new user
      const newUser = new User({
        username,
        displayName,
      });

      const savedUser = await newUser.save();
      return cb(null, savedUser);
    }
  } catch (err) {
    return cb(err, null);
  }
}
));

// Google OAuth 2.0 setup
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "https://blogtoday-358bc2e83982.herokuapp.com/auth/google/callback",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
async function(accessToken, refreshToken, profile, cb) {
  const displayName = profile.displayName;
  const username = profile.id;

  try {
    // Check if a user with the same username already exists
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      // User already exists, return the existing user
      return cb(null, existingUser);
    } else {
      // Create a new user
      const newUser = new User({
        username,
        displayName,
      });

      const savedUser = await newUser.save();
      return cb(null, savedUser);
    }
  } catch (err) {
    return cb(err, null);
  }
}
));

app.get("/auth/facebook", passport.authenticate("facebook", { scope: "email" }));

app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
});

app.get("/auth/google/callback", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/");
});

app.get("/register", (req, res) => {
  auth = req.isAuthenticated();
  userID = auth ? req.user._id : "123";
  const address = req.url;

  res.render("register.ejs", { 
    address: address, 
    auth: auth, 
    userID: userID 
  });
});

app.post("/register", async (req, res) => {
  const newUser = new User({
    displayName: req.body.displayName,
    aboutMe: req.body.aboutMe,
    username: req.body.username,
    password: req.body.password,
  });

  // register user using parameters entered
  User.register(newUser, req.body.password , (err, user) => {
    if (err) { 
      // if unsuccessful, log errors and refresh page and display error
      console.log(err); 
      res.render("register", { 
        address: "/register", 
        auth: false, 
        userID: "123", 
        error: err 
      });
    }
    else { 
      // successful registration
      passport.authenticate("local")(req, res, () => {
        res.redirect("/");
      })
    }
  });
});

app.get("/login", (req, res) => {
  auth = req.isAuthenticated();
  userID = auth ? req.user._id : "123";
  const address = req.url;

  res.render("login.ejs", { 
    address: address, 
    auth: auth, 
    userID: userID 
  });
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      // Handle the error by rendering the login page with an error message
      return res.render("login", {
        address: "/login",
        auth: false,
        userID: "123",
        error: "An error occurred during authentication. Please try again."
      });
    }

    if (!user) {
      // Authentication failed, render login page with error message
      return res.render("login", { 
        address: "/login", 
        auth: false, 
        userID: "123", 
        error: "Incorrect username or password." 
      });
    }

    // Authentication succeeded, log in user and redirect to root (home page) route
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
  auth = req.isAuthenticated();
  userID = auth ? req.user._id : "123";
  const address = req.url;

  // can't go to compose page unless you are authorized (signed in)
  if (auth) {
    res.render("compose.ejs", { 
      address: address, 
      auth: auth, 
      userID: userID 
    });
  } else {
    res.render("login.ejs", { 
      address: address, 
      auth: auth, 
      userID: userID 
    });
  }
});

app.post("/compose", async (req, res) => {
  // create a newPost by the data that is entered / retrieved
  const post = new Post({
    user: req.user._id,
    title: req.body.postTitle,
    body: req.body.postBody,
    date: formattedDate,
  });
  
  // save that post into database under the user's name
  try {
    await post.save();
    res.redirect("/");
  } catch (err) {
    console.error("Error saving post:", err);
    res.status(500).send("Error saving post.");
  }
});

app.post("/delete/:postID", async (req, res) => {
  const postToDelete = req.params.postID;

  try {
    await Post.findByIdAndDelete(postToDelete);
    res.redirect("/");
  } catch (err) {
    console.error("Error in deleting item:", err);
    res.status(500).send("Error deleting item.");
  }
});

app.post("/edit/:postID", async (req, res) => {
  const postID = req.params.postID;
  const updatedPostData = {
    title: req.body.postTitle,
    body: req.body.postBody,
  };
  try {
    // Find the post by its ID and update its data
    const updatedPost = await Post.findByIdAndUpdate(postID, updatedPostData, { new: true });

    if (!updatedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.redirect("/");
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).send({ message: 'Error updating post' });
  }
});

app.get("/posts/:postID", async (req, res) => {
  auth = req.isAuthenticated();
  userID = auth ? req.user._id : "123"; // signed in User
  const address = req.url;
  const postID = req.params.postID;
  
  try {
    // find the post and render post.ejs
    const requestedPost = await Post.findOne({ _id: postID }).populate("user");
    res.render("post.ejs", { 
      title: requestedPost.title, 
      body: requestedPost.body, 
      address: address, 
      date: requestedPost.date, 
      auth: auth, 
      userID: userID,
      postuserID: requestedPost.user._id,
      displayName: requestedPost.user.displayName,
      postID: postID,
    });
  } catch (err) {
    console.error("Error finding specified post:", err);
    res.status(500).send("Error finding specified post.");
  }
});

app.get("/users/:userID", async (req, res) => {
  auth = req.isAuthenticated();
  const address = req.url;

  // if not authorized (signed in) then redirect to login
  if (!auth) {
    return res.render("login", { address: "/login", auth: false, userID: "123", });
  }

  userID = req.user._id; // logged in user id
  const requestedUserID = req.params.userID; // the user that was requested
  
  // find all posts under the requested user's ID
  let postsWithSpecificUser;
  try {
    postsWithSpecificUser = await Post.find({ user: requestedUserID }).sort({ date: -1 }).populate("user");
  } catch (err) {
    console.error("Error finding specified user's posts:", err);
    res.status(500).send("Error finding specified user's posts.");
  }
  
  // finding that user and rendering user.ejs
  try {
    const requestedUser = await User.findOne({ _id: requestedUserID });
    res.render("user.ejs", { 
      displayName: requestedUser.displayName, 
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
  auth = req.isAuthenticated();
  userID = auth ? req.user._id : "123";
  const address = req.url;
  
  // finding all posts and displaying them in the home page (rendering home.ejs)
  try {
    // Fetch all posts from the database, sort by date in descending order, and populate the "user" field
    const posts = await Post.find({}).sort({ date: -1 }).populate("user");
    res.render("home.ejs", { 
      address: address, 
      posts: posts, 
      auth: auth, 
      userID: userID 
    });
  } catch (err) {
    console.error("Error loading posts:", err);
    res.status(500).send("Error loading posts.");
  }
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

// Start the server
app.listen(port, () => {
  console.log("Server has started successfully.");
});
