import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Proposicao } from '@/models/proposicao.model';

dotenv.config();

const connectDB = async (): Promise<void> => {
    try {
        const dbUri = process.env.DATABASE_URL as string;

        await mongoose.connect(dbUri, {
            autoIndex: true,
        });
    } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
    }
};

export default connectDB;
