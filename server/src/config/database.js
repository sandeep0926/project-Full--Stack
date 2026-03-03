import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        mongoose.connection.on('error', (err) => {
            logger.error(`MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

        return conn;
    } catch (error) {
        logger.error(`MongoDB connection failed: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
