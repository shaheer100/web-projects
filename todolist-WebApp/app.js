import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// creating a new database
mongoose.connect("mongodb://localhost:27017/listDB");

// mongoose schema, with field name and type
const itemsSchema = {
  name: String
}

// new mongoose model based on the schema
const Item = mongoose.model("Item", itemsSchema);

// creating and adding default items to the database
const default1 = new Item ({
  name: "Welcome to the To-do List!"
});

const default2 = new Item ({
  name: "Click + to add a new item"
});

const default3 = new Item ({
  name: "Click the check to delete an item"
});

const defaultItems = [default1, default2, default3];

app.get("/", async (req, res) =>  {

  const currentDate = new Date();
  const options = {
    weekday: "long", 
    day: "numeric",
    month: "long", 
    year: "numeric"
  };

  const formattedDate = currentDate.toLocaleDateString(undefined, options);

  // error handling
  const db = mongoose.connection;

  db.on("error", (error) => {
    console.error("Database connection error:", error);
  });
  
  // tap into model and find everything in the items collection
  // will display the default items ensuring they don't stack
  // render the items that are present in the database
  try {
    const foundItems = await Item.find({});
    if (foundItems.length === 0) {
      db.once("open", async () => {
        console.log("Connected to the database");
        try {
          await Item.insertMany(defaultItems);
          console.log("Default items inserted successfully:");
        } catch (err) {
          console.error(err);
        }
      });
      res.redirect("/");
    } else {
      res.render("list", { date: formattedDate, newListItems: foundItems });
    }
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).send("Error fetching items.");
  }
});

app.post("/", async (req, res) => {

  const itemName = req.body.newItem;

  const item = new Item({
    name: itemName
  });

  // after we save our item, we redirect so that we can FIND all items and render them on screen
  try {
    await item.save();
    res.redirect("/");
  } catch (err) {
    console.error("Error saving item:", err);
    res.status(500).send("Error saving item.");
  }
});

app.post("/delete", async (req, res) => {

  const itemToDelete = req.body.deleteItem;

  try {
    await Item.findByIdAndRemove(itemToDelete);
    res.redirect("/");
  } catch (err) {
    console.error("Error in deleting item:", err);
    res.status(500).send("Error deleting item.");
  }
});

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
