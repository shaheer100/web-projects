import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import OpenAI from "openai";
import _ from "lodash";

dotenv.config();

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  items: [itemsSchema],
};

const List = mongoose.model("List", listsSchema);

const firstTime = false;

app.get("/", async (req, res) =>  {

  let allLists;
  let foundItems;
  
  try {
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
  let allLists;

  if (listName === "apple touch icon precomposed png" || listName === "apple touch icon png" || listName === "favicon ico") {
    res.status(204).send(); // For example, respond with a "No Content" status
    return; // Exit the route handler
  }

  try {
    allLists = await List.find({}, "name"); 
  } catch (err) {
    console.error("Error fetching lists:", err);
    res.status(500).send("Error fetching lists.");
  }

  try {
    const foundList = await List.findOne({ name: listName });

    if (!foundList) {
      const list = new List({
        name: listName,
        items: defaultItems,
      });
      try {
        await list.save();
        res.render("list", { 
          date: formattedDate, 
          newListItems: list.items, 
          listTitle: listName,
          allLists, allLists,
        });
      } catch (err) {
        console.error("Error saving item:", err);
        res.status(500).send("Error saving item.");
      }
    } else {
      res.render("list", { 
        date: formattedDate, 
        newListItems: foundList.items, 
        listTitle: listName,
        allLists, allLists,
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
    const newListName = _.lowerCase(req.body.newListName);
    let allLists;
    
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
    } 
    
    else if (listName) {
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
    
    else {
      // Handle the creation of a new list with a specified name
      if (newListName) {
        const newList = new List({
          name: newListName,
          items: defaultItems,
        });
        try {
          await newList.save();
          // add the newly created list to allLists array
          allLists.push({ name: newListName });
          res.render("list", {
            date: formattedDate,
            newListItems: newList.items,
            listTitle: newListName,
            allLists: allLists,
          });
        } catch (err) {
          console.error("Error creating new list:", err);
          res.status(500).send("Error creating new list.");
        }
      } else {
        // no list name is provided
        res.redirect("/");
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

app.post("/openai/chatgpt", async (req, res) => {
  const listName = req.body.listName;
  const prompt = req.body.prompt;

  const callToOpenAi = async () => {
    try {
      const chatCompletion = await openai.chat.completions.create({
        messages: [
          { role: "user", content: prompt },
          {
            role: "assistant",
            content:
              "Sure! Here's a list of tasks:\nWrite the report\nAttend the meeting\nExercise for 30 minutes\nPrepare lunch\nReview emails",
          },
        ],
        model: "gpt-3.5-turbo",
      });

      // Extract the AI response
      const aiResponse = chatCompletion.choices[0].message.content;
      const tasksArray = aiResponse.split("\n").slice(1); // Remove the first line

      // Filter out empty strings from the tasksArray
      const filteredTasksArray = tasksArray.filter((task) => task.trim() !== "");

      if (filteredTasksArray.length > 0) {
        console.log(filteredTasksArray);

        if (listName === "Main") {
          try {
            await Item.insertMany(filteredTasksArray.map((name) => ({ name }))); // Convert to an array of objects
            console.log("AI items inserted successfully:");
            return res.redirect("/");
          } catch (err) {
            console.error("Error adding AI items:", err);
            return res.status(500).send("Error adding AI items.");
          }
        } else { // find the current list and add items to that list
          try {
            const foundList = await List.findOne({ name: listName });
            filteredTasksArray.forEach(async (taskName) => {
              const newItem = new Item({ name: taskName });
              foundList.items.push(newItem);
            });
            await foundList.save();
            console.log("AI items inserted into list successfully:");
            return res.redirect("/" + listName);
          } catch (err) {
            console.error("Error adding AI items to list:", err);
            return res.status(500).send("Error adding AI items to list.");
          }
        }
      } else { // not a relevant prompt
        return res.status(400).send("Please rewrite your prompt.");
      }
    } catch (err) {
      console.error(err);
      return res.status(500).send("An error occurred while processing your request.");
    }
  }; 
  callToOpenAi();
});

app.post("/deleteList", async (req, res) => {
  const listToDelete = req.body.listName;

  try {
    await List.findOneAndRemove({ name: listToDelete });
    res.redirect("/");
  } catch (err) {
    console.error("Error in deleting list:", err);
    res.status(500).send("Error deleting list.");
  }
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, () => {
  console.log("Server has started successfully");
});
