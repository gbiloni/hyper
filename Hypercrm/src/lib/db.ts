import mysql from 'mysql2/promise';

// Configuramos el pool de conexiones hacia la base de datos local "hyper"
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hyper',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
