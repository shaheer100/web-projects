import express from "express";
import bodyParser from "body-parser";

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const items = ["Buy Food", "Cook Food", "Eat Food"];
const workItems = [];

app.get("/", function(req, res) {

  const currentDate = new Date();
  const options = {
    weekday: "long", 
    day: "numeric",
    month: "long", 
    year: "numeric"
  };

  const formattedDate = currentDate.toLocaleDateString(undefined, options);

  res.render("list", { date: formattedDate, newListItems: items });

});

app.post("/", function(req, res){

  const item = req.body.newItem;

  if (req.body.list === "Work") {
    workItems.push(item);
    res.redirect("/work");
  } else {
    items.push(item);
    res.redirect("/");
  }
});

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
