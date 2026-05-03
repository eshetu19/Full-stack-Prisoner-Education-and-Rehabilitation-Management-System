const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306
});

console.log('  Resetting database...');

db.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME || 'prison_rehab_system'}`, (err) => {
    if (err) throw err;
    console.log(' Database dropped');
    db.end();
    console.log('Run "npm run seed" to recreate the database');
});