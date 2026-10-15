const mongoose = require('mongoose');

let isConnecting = false;

const connectDB = async (retries = 5) => {
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2 || isConnecting) {
        return;
    }
    isConnecting = true;
    try {
        const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
        const MONGODB_URI = (process.env.MONGODB_URI || latestAtlasURI).trim();

        console.log('Attempting to connect to MongoDB...');

        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 50,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 15000,
            family: 4,
        });

        console.log('MongoDB Connected successfully');
    } catch (error) {
        console.error(`Status: DB Connection Error: ${error.message}`);
        if (retries > 0) {
            console.log(`Retrying DB connection in 5 seconds... (${retries} retries left)`);
            setTimeout(() => connectDB(retries - 1), 5000);
        } else {
            console.error('Failed to connect to MongoDB after multiple attempts. Will retry automatically on next request or interval.');
        }
    } finally {
        isConnecting = false;
    }
};

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected! Attempting automatic reconnect in 5s...');
    setTimeout(() => {
        if (mongoose.connection.readyState === 0) {
            connectDB(3);
        }
    }, 5000);
});

module.exports = connectDB;

