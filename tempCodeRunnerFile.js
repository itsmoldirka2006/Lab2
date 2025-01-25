const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require('./models/user');
const _ = require('lodash');
const bcrypt = require('bcrypt'); // For password hashing
const session = require('express-session'); // For session management
require('dotenv').config();

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.get('/', (req, res) => {
    res.render('about'); // Assuming you have a work.ejs file in the 'views' folder
});

// MongoDB Atlas connection
mongoose.connect(process.env.ATLAS_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Login page
app.get('/login', (req, res) => {
    res.render('login');
});

// Handle login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).send('User not found');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send('Invalid password');
    }

    // Store user information in session
    req.session.userId = user._id;

    // Redirect to the profile page after successful login
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Registration page
app.get('/register', (req, res) => {
  res.render('register');
});

// Handle registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10); // Hash password
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    // Redirect to login page after successful registration
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});
app.get('/profile', async (req, res) => {
    try {
      const user = await User.findOne({ username: 'Moldir' }); 
      if (!user) {
        return res.status(404).send('User not found');
      }
      res.render('profile', { user });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });
    
app.post('/profile', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      await User.updateOne(
        { username: 'Moldir' },
        { username, password: hashedPassword }
      );
  
      // Send a success message
      res.send('Profile updated successfully');
    } catch (err) {
      console.error(err);
      res.status(500).send('Failed to update profile');
    }
  });
  
// Main page or Dashboard
app.get('/main', async (req, res) => {
  // Ensure user is logged in
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  try {
    const foundItems = await Item.find({});
    if (foundItems.length === 0) {
      await Item.insertMany(defaultItems);
      console.log('Successfully added default items');
      res.redirect('/main');
    } else {
      res.render('list', { listTitle: 'Today', newListItems: foundItems });
    }
  } catch (err) {
    console.error(err);
  }
});

app.post('/', async (req, res) => {
  try {
    const itemName = req.body.newItem;
    const listName = req.body.list;

    const item = new Item({ name: itemName });

    if (listName === 'Today') {
      await item.save();
      res.redirect('/main');
    } else {
      const foundList = await List.findOne({ name: listName });
      foundList.items.push(item);
      await foundList.save();
      res.redirect('/' + listName);
    }
  } catch (err) {
    console.error(err);
  }
});

app.post('/delete', async (req, res) => {
  try {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;

    if (listName === 'Today') {
      await Item.findByIdAndDelete(checkedItemId);
      console.log('Successfully deleted');
      res.redirect('/main');
    } else {
      await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: checkedItemId } } }
      );
      console.log('Successfully deleted from custom list');
      res.redirect('/' + listName);
    }
  } catch (err) {
    console.error(err);
  }
});

app.get('/:customListName', async (req, res) => {
  try {
    const customListName = _.capitalize(req.params.customListName);
    const foundList = await List.findOne({ name: customListName }).exec();

    if (!foundList) {
      const list = new List({
        name: customListName,
        items: defaultItems,
      });
      await list.save();
      res.redirect('/' + customListName);
    } else {
      res.render('list', {
        listTitle: foundList.name,
        newListItems: foundList.items,
      });
    }
  } catch (err) {
    console.error(err);
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
