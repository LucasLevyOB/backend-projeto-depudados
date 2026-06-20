import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Proposicao } from '@/models/proposicao.model';

dotenv.config();

const connectDB = async (): Promise<void> => {
    try {
        const dbUri = process.env.DATABASE_URL as string;

        const conn = await mongoose.connect(dbUri, {
            autoIndex: true,
        });

        const proposicaos = await conn.model("projeto-depudados", Proposicao.schema).find(
            { temas: { $exists: true, $ne: [] } },
            { _id: 1, temas: 1 }
        ).sort({ _id: -1 }).limit(10)

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Proposições com temas: ${proposicaos}`);
    } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
    }
};

export default connectDB;
