const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',      
  password: '',     
  database: 'name',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


const promisePool = pool.promise();

// console.log("تم تهيئة حوض الاتصال بقاعدة البيانات...");

module.exports = promisePool;