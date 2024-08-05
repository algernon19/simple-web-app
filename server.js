const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); // Módosítás az ígéret alapú API-hoz
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true })); 
app.use(bodyParser.json());

// MySQL connection configuration
const dbOptions = {
  host: process.env.DB_HOST,       // Az adatbázis hosztneve a Kubernetes klaszteren belül
  user: process.env.DB_USER,       // Az adatbázis felhasználója
  password: process.env.DB_PASSWORD, // Az adatbázis jelszava
  database: process.env.DB_NAME    // Az adatbázis neve
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

// Middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: sessionStore
}));

// Create the database and users table if not exists
const createDatabaseAndTables = async () => {
  const createDatabaseQuery = `CREATE DATABASE IF NOT EXISTS ${dbOptions.database}`;
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    );
  `;
  const createMessagesTableQuery = `
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(createDatabaseQuery);
    await pool.query(`USE ${dbOptions.database}`);
    await pool.query(createTableQuery);
    await pool.query(createMessagesTableQuery);
    console.log('Database and tables created');
  } catch (err) {
    console.error('Error creating database and tables:', err);
  }
};

// Initialize database and tables
createDatabaseAndTables();

// Simple authentication middleware
const auth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes
// Home route
app.get('/', auth, async (req, res) => {
  try {
    const [messages] = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
    res.send(`
      <h1>Messages</h1>
      <form action="/message" method="post">
        <textarea name="message" rows="4" cols="50"></textarea><br>
        <input type="submit" value="Submit">
      </form>
      <ul>
        ${messages.map(msg => `<li><strong>ID:</strong> ${msg.id} <strong>Message:</strong> ${msg.message} <strong>Timestamp:</strong> ${msg.created_at}</li>`).join('')}
      </ul>
      <a href="/logout">Logout</a>
    `);
  } catch (err) {
    console.error('Database query failed:', err);
    res.status(500).send('Database query failed');
  }
});

// Message submission route
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

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM users WHERE username = ?';

  try {
    const [results] = await pool.query(query, [username]);
    if (results.length > 0) {
      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        req.session.userId = user.id;
        req.session.username = username;
        res.redirect('/');
      } else {
        res.send('Invalid credentials');
      }
    } else {
      res.send('Invalid credentials');
    }
  } catch (err) {
    console.error('Database query failed:', err);
    res.status(500).send('Database query failed');
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

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await hashPassword(password);
  const query = 'INSERT INTO users (username, password) VALUES (?, ?)';

  try {
    await pool.query(query, [username, hashedPassword]);
    res.send('User registered successfully');
  } catch (err) {
    console.error('Database insert failed:', err);
    res.status(500).send('Database insert failed');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});