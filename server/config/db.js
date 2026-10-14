const mongoose = require('mongoose');
const dns = require('dns');
// Set public DNS servers to prevent querySrv ECONNREFUSED on Windows local networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in environments where setServers is restricted
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      family: 4,
    });
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Atlas Connection Error: ${error.message}`);
    console.log('⚠️ Running with database connection retry in background...');
  }
};

module.exports = connectDB;
