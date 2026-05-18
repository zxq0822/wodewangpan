require('dotenv').config(); // if we had a .env
const { R2Adapter } = require('./supabase-adapter.js');

// We have no .env, let's mock it for the test script using process.env
process.env.SUPABASE_URL = "YOUR URL GOES HERE";
// Let the user supply the env vars directly
