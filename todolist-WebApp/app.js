import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import _ from "lodash";

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// formatted date for the title of the todo list
const currentDate = new Date();
const options = {
  weekday: "long", 
  day: "numeric",
  month: "long", 
  year: "numeric"
};

const formattedDate = currentDate.toLocaleDateString(undefined, options);

// creating a new database
mongoose.connect("mongodb+srv://admin-shaheer:Test123@cluster0.p7p6tvn.mongodb.net/listDB");

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

// new list schema
const listsSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listsSchema);

const firstTime = false;

app.get("/", async (req, res) =>  {
  // error handling
  const db = mongoose.connection;
  
  db.on("error", (error) => {
    console.error("Database connection error:", error);
  });

  try {

    let allLists;
    const selectedList = "Main";
    let foundItems;

    try {
      allLists = await List.find({}, "name"); // only find the names of the lists
    } catch (err) {
      console.error("Error fetching lists:", err);
      res.status(500).send("Error fetching lists.");
    }

    try {
      foundItems = await Item.find({}); // find items for the main page
    } catch (err) {
      console.error("Error finding items:", err);
      res.status(500).send("Error finding items.");
    }
    
    if (foundItems.length === 0 && firstTime) {
      try {
        await Item.insertMany(defaultItems);
        console.log("Default items inserted successfully:");
        firstTime = true;
      } catch (err) {
        console.error("Error adding default items:", err);
        res.status(500).send("Error adding default items.");
      }
      res.redirect("/");
    } else {
      res.render("list", {
        date: formattedDate,
        newListItems: foundItems,
        listTitle: "Main",
        allLists: allLists,
        selectedList: selectedList,
      });
    }
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).send("Error fetching items.");
  }
});

// using express route parameters to make multiple lists 
app.get("/:listName", async (req, res) => {
  const listName = _.lowerCase(req.params.listName);

  try {
    const foundList = await List.findOne({ name: listName });

    if (!foundList) {
      const list = new List({
        name: listName,
        items: defaultItems
      });
      try {
        await list.save();
        res.redirect("/" + listName);
      } catch (err) {
        console.error("Error saving item:", err);
        res.status(500).send("Error saving item.");
      }
    } else {
      res.render("list", { 
        date: formattedDate, 
        newListItems: foundList.items, 
        listTitle: listName 
      });
    }
    
  } catch (err) {
    console.error("Error while accessing database:", err);
    res.status(500).send("Error while accessing database.");
  }
});

app.post("/", async (req, res) => {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });
  
  try {

    let allLists;
    const selectedList = listName;

    try {
      allLists = await List.find({}, "name"); 
    } catch (err) {
      console.error("Error fetching lists:", err);
      res.status(500).send("Error fetching lists.");
    }
    
    if (listName === "Main") {
      // after we save our item, we redirect so that we can FIND all items and render them on screen
      try {
        await item.save();
        res.redirect("/");
      } catch (err) {
        console.error("Error saving item:", err);
        res.status(500).send("Error saving item.");
      }
    } else {
      try {
        const foundList = await List.findOne({ name: listName });
        foundList.items.push(item);
        await foundList.save();
        res.redirect("/" + listName);
      } catch (err) {
        console.error("Error while accessing database:", err);
        res.status(500).send("Error while accessing database.");
      }
    }
  } catch (err) {
    console.error("Error fetching lists:", err);
    res.status(500).send("Error fetching lists.");
  }
});

app.post("/delete", async (req, res) => {
  const itemToDelete = req.body.deleteItem;
  const listName = req.body.listName;

  if (listName === "Main") {
    try {
      await Item.findByIdAndRemove(itemToDelete);
      res.redirect("/");
    } catch (err) {
      console.error("Error in deleting item:", err);
      res.status(500).send("Error deleting item.");
    }
  } else {
    // efficient way of removing an item from a Mongo Array
    try {
      const foundList = await List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: itemToDelete }}});
      res.redirect("/" + listName);
    } catch (err) {
      console.error("Error in deleting item from list:", err);
      res.status(500).send("Error deleting item from list.");
    }
  }
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, () => {
  console.log("Server has started successfully");
});
