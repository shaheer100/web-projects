import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import _ from "lodash";

const homeStartingContent = "home";
const aboutContent = "about";
const contactContent = "contact";

//setting up the app
const app = express();

app.set('view engine', 'ejs');

// static files are in the public folder
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public")); 

// creating a new database
mongoose.connect("mongodb+srv://shaheersheeraz22:Test123@cluster0.ndvvhaa.mongodb.net/blogDB");

// mongoose schema, with field name and type
const postsSchema = {
  username: String,
  title: String,
  body: String,
  date: String
}

// mongoose model
const Post = mongoose.model("Post", postsSchema); 

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

app.get("/about", (req, res) => {
  res.render("about.ejs", { about: aboutContent });
});

app.get("/contact", (req, res) => {
  res.render("contact.ejs", { contact: contactContent });
});

app.get("/compose", (req, res) => {
  res.render("compose.ejs", { address: address });
});

app.post("/compose", async (req, res) => {
  const postTitle = req.body.postTitle;
  const postContent = req.body.postBody;

  const post = new Post({
    title: postTitle,
    body: postContent
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
  const postID = req.params.postID;
  try {
    const requestedPost = await Post.findOne({ _id: postID });
    res.render("post.ejs", { title: requestedPost.title, body: requestedPost.body });
  } catch (err) {
    console.error("Error finding specified post:", err);
    res.status(500).send("Error finding specified post.");
  }
});

// Start the server
app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});
