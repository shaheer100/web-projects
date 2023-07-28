import express from "express";
import bodyParser from "body-parser";
import ejs from "ejs";
import _ from "lodash";

const homeStartingContent = "home";
const aboutContent = "about";
const contactContent = "contact";

const app = express(); //setting up the app

let posts = [];

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public")); // static files are in the public folder

app.get("/", (req, res) => {
  res.render("home.ejs", { startingContent: homeStartingContent, posts: posts});
});

app.get("/about", (req, res) => {
  res.render("about.ejs", { about: aboutContent });
});

app.get("/contact", (req, res) => {
  res.render("contact.ejs", { contact: contactContent });
});

app.get("/compose", (req, res) => {
  res.render("compose.ejs");
});

app.post("/compose", (req, res) => {
  const post = {
    title: req.body.postTitle,
    body: req.body.postBody
  };
  
  posts.push(post);

  res.redirect("/");
});

app.get("/posts/:postName", (req, res) => {
  const requestedPost = _.lowerCase(req.params.postName);
  
  posts.forEach(post => {
    const storedPost = _.lowerCase(post.title);

    if (storedPost === requestedPost) {
      res.render("post.ejs", { title: post.title, body: post.body });
    } 
  });

});

// Start the server
app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});
