const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MySQL connection configuration
const dbOptions = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Create a MySQL connection pool
const pool = mysql.createPool(dbOptions);

// Test the database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}
testConnection();

const sessionStore = new MySQLStore({}, pool);

// Middleware for session handling
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: sessionStore
}));

// Middleware for redirecting logged-in users
const redirectIfLoggedIn = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  next();
};

// Middleware for checking authentication
const auth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes
app.get('/', auth, async (req, res) => {
  try {
    // Fetch messages from the database
    const [messages] = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');

    // Render index.ejs with the appropriate data
    res.render('index', {
      username: req.session.username,
      messages: messages,
      podName: process.env.POD_NAME || 'Not specified'
    });
  } catch (err) {
    console.error('Database query failed:', err);
    res.status(500).send('Database query failed');
  }
});

app.post('/message', auth, async (req, res) => {
  const { message } = req.body;

  try {
    await pool.query('INSERT INTO messages (message) VALUES (?)', [message]);
    res.redirect('/');
  } catch (err) {
    console.error('Database insert failed:', err);
    res.status(500).send('Database insert failed');
  }
});

// Login route
app.get('/login', redirectIfLoggedIn, (req, res) => {
  res.render('login', { error: null }); // Initialize `error` as null
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Fetch user by username
    const [results] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

    if (results.length > 0) {
      const user = results[0];

      // Log the original password
      console.log('User input password:', password);

      // Log the hashed password from the database
      console.log('Database hashed password:', user.password);

      // Verify password with bcrypt
      const match = await bcrypt.compare(password, user.password);

      // Log the result of comparison
      console.log('Password match result:', match);

      if (match) {
        req.session.userId = user.id;
        req.session.username = username;
        res.redirect('/');
      } else {
        res.render('login', { error: 'Invalid credentials' });
      }
    } else {
      res.render('login', { error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Database query failed:', err);
    res.render('login', { error: 'Database query failed' });
  }
});

// Function to hash passwords
const hashPassword = async (password) => {
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
};

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

// Registration route
app.get('/register', redirectIfLoggedIn, (req, res) => {
  res.render('register', { error: null }); // Initialize `error` as null
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('register', { error: 'Username and password are required' });
  }

  try {
    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.render('register', { error: 'Username already exists' });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);
    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    await pool.query(query, [username, hashedPassword]);

    res.redirect('/login');
  } catch (err) {
    console.error('Database insert failed:', err);
    res.render('register', { error: 'Registration failed. Please try again.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
