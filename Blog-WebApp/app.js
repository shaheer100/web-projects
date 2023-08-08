import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import _ from "lodash";
import ejs from "ejs";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";

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
  date: String
});

const usersSchema = new mongoose.Schema ({
  email: String,
  password: String
});

// used to hash + salt passwords, and save users into MongoDB database
usersSchema.plugin(passportLocalMongoose); 

// mongoose models
const Post = new mongoose.model("Post", postsSchema); 
const User = new mongoose.model("User", usersSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", async (req, res) => {
  const address = req.url;
  const userID = req.isAuthenticated() ? req.user._id : "";
  
  try {
    const posts = await Post.find({});
    res.render("home.ejs", { 
      address: address, 
      posts: posts, 
      auth: req.isAuthenticated(), 
      userID: userID 
    });
  } catch (err) {
    console.error("Error loading posts:", err);
    res.status(500).send("Error loading posts.");
  }
});

app.get("/register", (req, res) => {
  const address = req.url;
  const userID = req.isAuthenticated() ? req.user._id : "";

  res.render("register.ejs", { 
    address: address, 
    auth: req.isAuthenticated(), 
    userID: userID 
  });
});

app.post("/register", async (req, res) => {  
  const address = req.url;
  const userID = req.isAuthenticated() ? req.user._id : "";

/*   const { username, aboutme, email, password } = req.body;

  const newUser = new User({
    displayName: username,
    aboutMe: aboutme,
    username: email
  }); */

  User.register({ username: req.body.username }, req.body.password, (err, user) => {
    if (err) {
      console.log(err);
      res.render("register", { 
        address: address, 
        auth: req.isAuthenticated(),
        userID: userID,
        error: err
      });
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/");
      });
    }
  });
});

app.get("/login", (req, res) => {
  const address = req.url;
  const userID = req.isAuthenticated() ? req.user._id : "";

  console.log(req.isAuthenticated());

  res.render("login", {
    address: address,
    auth: req.isAuthenticated(),
    userID: userID
  });
});

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/");
      });
    }
  });
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.get("/compose", (req, res) => {
  const address = req.url;
  const userID = req.isAuthenticated() ? req.user._id : "";

  res.render("compose.ejs", { 
    address: address, 
    auth: req.isAuthenticated(), 
    userID: userID 
  });
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
  const address = req.url;
  const userID = req.isAuthenticated() ? req.user._id : "";

  const postID = req.params.postID;
  try {
    const requestedPost = await Post.findOne({ _id: postID });
    res.render("post.ejs", { 
      title: requestedPost.title, 
      body: requestedPost.body, 
      address: address, 
      date: requestedPost.date, 
      auth: req.isAuthenticated(), 
      userID: userID 
    });
  } catch (err) {
    console.error("Error finding specified post:", err);
    res.status(500).send("Error finding specified post.");
  }
});

app.get("/users/:userID", async (req, res) => {
  const address = req.url;
  const userID = req.params.userID;

  let postsWithSpecificUser;
  try {
    postsWithSpecificUser = await Post.find({ user: userID });
  } catch (err) {
    console.error("Error finding specified user's posts:", err);
    res.status(500).send("Error finding specified user's posts.");
    return;
  }

  try {
    const requestedUser = await User.findOne({ _id: userID });
    res.render("user.ejs", { 
      username: requestedUser.displayName, 
      aboutMe: requestedUser.aboutMe, 
      address: address, 
      auth: req.isAuthenticated(), 
      userID: userID, 
      posts: postsWithSpecificUser 
    });
  } catch (err) {
    console.error("Error finding specified user:", err);
    res.status(500).send("Error finding specified user.");
  }
});

// Start the server
app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});

