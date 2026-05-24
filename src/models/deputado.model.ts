import { Schema, model, Document } from 'mongoose';

export interface IDeputado extends Document {
    email: string;
    id: number;
    idLegislatura: number;
    nome: string;
    siglaPartido: string;
    siglaUf: string;
    uri: string;
    uriPartido: string;
    urlFoto: string;
}

const DeputadoSchema: Schema = new Schema({
    email: { type: String },
    id: { type: Number, unique: true, required: true },
    idLegislatura: { type: Number },
    nome: { type: String },
    siglaPartido: { type: String },
    siglaUf: { type: String },
    uri: { type: String },
    uriPartido: { type: String },
    urlFoto: { type: String }
});

export const Deputado = model<IDeputado>('Deputado', DeputadoSchema);