const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const app = express();
const port = process.env.PORT || 3000;

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

const connection = mysql.createConnection(dbOptions);
const sessionStore = new MySQLStore({}, connection);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: sessionStore
}));

// Create the database and users table if not exists
const createDatabaseAndTables = () => {
  const createDatabaseQuery = `CREATE DATABASE IF NOT EXISTS ${dbOptions.database}`;
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    )
  `;
  
  connection.query(createDatabaseQuery, (err) => {
    if (err) throw err;
    connection.query(`USE ${dbOptions.database}`, (err) => {
      if (err) throw err;
      connection.query(createTableQuery, (err) => {
        if (err) throw err;
        console.log('Database and table created');
      });
    });
  });
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
app.get('/', auth, (req, res) => {
  res.send('Hello, World!');
});

app.get('/login', (req, res) => {
  res.send('<form method="POST" action="/login"><input type="text" name="username" /><input type="password" name="password" /><button type="submit">Login</button></form>');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  
  connection.query(query, [username, password], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      req.session.userId = results[0].id;
      res.redirect('/');
    } else {
      res.send('Invalid credentials');
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
