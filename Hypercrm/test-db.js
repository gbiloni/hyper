import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testConnection() {
  console.log("Testing connection with variables:");
  console.log("DB_HOST:", process.env.DB_HOST);
  console.log("DB_USER:", process.env.DB_USER);
  console.log("DB_NAME:", process.env.DB_NAME);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'hyper',
    });
    console.log("SUCCESS: Connected to database.");
    
    const [rows] = await connection.execute("SHOW TABLES LIKE 'nodo%'");
    console.log("Tables matching 'nodo%':", rows);
    
    await connection.end();
  } catch (error) {
    console.error("ERROR CONNECTING TO DB:", error.message);
  }
}

testConnection();
