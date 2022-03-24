const { Pool } = require("pg");

const dbPool = new Pool({
  database: "personal-web-siang",
  port: "5432",
  user: "postgres",
  password: "sevme080995",
});

module.exports = dbPool;
