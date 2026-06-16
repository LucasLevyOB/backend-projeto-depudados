import mongoose, { Document, Schema } from 'mongoose';

export interface IPartido extends Document {
    id: string;
    sigla: string;
    nome: string;
    uri: string;
}

const partidoSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    sigla: { type: String, required: true },
    nome: { type: String, required: true },
    uri: { type: String, required: true },
});

export default mongoose.model<IPartido>('Partido', partidoSchema);