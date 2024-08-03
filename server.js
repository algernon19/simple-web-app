const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

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
  store: new MongoStore({ mongooseConnection: mongoose.connection })
}));

// User schema and model
const userSchema = new mongoose.Schema({
  username: String,
  password: String // Note: In a real app, passwords should be hashed!
});
const User = mongoose.model('User', userSchema);

// Function to create default user
const createDefaultUser = async () => {
  const defaultUsername = 'admin';
  const defaultPassword = 'password'; // Use a hashed password in a real app

  const existingUser = await User.findOne({ username: defaultUsername });
  if (!existingUser) {
    const user = new User({ username: defaultUsername, password: defaultPassword });
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
app.get('/', auth, (req, res) => {
  res.send('Hello, World!');
});

app.get('/login', (req, res) => {
  res.send('<form method="POST" action="/login"><input type="text" name="username" /><input type="password" name="password" /><button type="submit">Login</button></form>');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    req.session.userId = user._id;
    res.redirect('/');
  } else {
    res.send('Invalid credentials');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
