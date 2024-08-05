const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const ejs = require('ejs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });


// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URL })
}));

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// User schema and model
const userSchema = new mongoose.Schema({
  username: String,
  password: String // Note: In a real app, passwords should be hashed!
});
const User = mongoose.model('User', userSchema);

// Text schema and model
const textSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  text: String
});
const Text = mongoose.model('Text', textSchema);

const createDefaultUser = async () => {
  const defaultUsername = 'admin';
  const defaultPassword = 'password'; // Hashelt jelszó

  const existingUser = await User.findOne({ username: defaultUsername });
  if (!existingUser) {
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const user = new User({ username: defaultUsername, password: hashedPassword });
    await user.save();
    console.log('Default user created');
  }
};


// Initialize default user
createDefaultUser().catch(console.error);

// Simple authentication middleware
const auth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes
app.get('/', auth, async (req, res) => {
  const user = await User.findById(req.session.userId);
  const texts = await Text.find({ userId: req.session.userId }).exec();
  const podName = process.env.HOSTNAME || 'unknown';
  res.render('index', { username: user.username, texts: texts.map(t => t.text), podName: podName });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id;
    res.redirect('/');
  } else {
    res.send('Invalid credentials');
  }
});

app.post('/save', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.session.userId;
    const newText = new Text({ userId, text });
    await newText.save();
    res.redirect('/');
  } catch (error) {
    console.error('Error saving text:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
