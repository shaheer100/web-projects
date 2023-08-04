import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import _ from "lodash";

const currentDate = new Date();
const monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const day = currentDate.getDate();
const month = monthNames[currentDate.getMonth()];
const year = currentDate.getFullYear();

const formattedDate = `${month} ${day}, ${year}`;

//setting up the app
const app = express();

app.set('view engine', 'ejs');

// static files are in the public folder
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); 

// creating a new database
mongoose.connect("mongodb+srv://shaheersheeraz22:Test123@cluster0.ndvvhaa.mongodb.net/blogDB");

// mongoose schema, with field name and type
const postsSchema = new mongoose.Schema ({
  username: String,
  title: String,
  body: String,
  date: String
});

// mongoose model
const Post = new mongoose.model("Post", postsSchema); 

app.get("/", async (req, res) => {
  const address = req.url;
  try {
    const posts = await Post.find({});
    res.render("home.ejs", { address: address, posts: posts});
  } catch (err) {
    console.error("Error loading posts:", err);
    res.status(500).send("Error loading posts.");
  }
});

app.get("/login", (req, res) => {
  const address = req.url;
  res.render("login.ejs", { address: address });
});

app.get("/register", (req, res) => {
  const address = req.url;
  res.render("register.ejs", { address: address });
});

app.get("/compose", (req, res) => {
  const address = req.url;
  res.render("compose.ejs", { address: address });
});

app.post("/compose", async (req, res) => {
  const postTitle = req.body.postTitle;
  const postContent = req.body.postBody;

  const post = new Post({
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
  const postID = req.params.postID;
  try {
    const requestedPost = await Post.findOne({ _id: postID });
    res.render("post.ejs", { title: requestedPost.title, body: requestedPost.body, address: address, date: requestedPost.date });
  } catch (err) {
    console.error("Error finding specified post:", err);
    res.status(500).send("Error finding specified post.");
  }
});

// Start the server
app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});
