require('dotenv').config();
const { R2Adapter } = require('./supabase-adapter.js');

async function testList() {
  // You must set these in environment or pass them explicitly
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_KEY");
    return;
  }
  const r2 = new R2Adapter();
  console.log("Testing list with prefix ''");
  try {
    const result = await r2.list({ prefix: '' });
    console.log("Result:", result);
  } catch (e) {
    console.error("Caught error:", e);
  }
}
testList();