import { Schema, model, Document } from 'mongoose';

export interface IProposicao extends Document {
    id: number;
    idDeputadoAutor: number;
    uri: string;
    siglaTipo: string;
    codTipo: number;
    numero: number;
    ano: number;
    ementa: string;
    dataApresentacao: Date;
    
    // Detailed fields (optional, populated on demand)
    statusProposicao?: object;
    ementaDetalhada?: string;
    keywords?: string;
    urlInteiroTeor?: string;
    justificativa?: string;
}

const ProposicaoSchema: Schema = new Schema({
    id: { type: Number, unique: true, required: true },
    idDeputadoAutor: { type: Number, required: true, index: true },
    uri: { type: String },
    siglaTipo: { type: String },
    codTipo: { type: Number },
    numero: { type: Number },
    ano: { type: Number },
    ementa: { type: String },
    dataApresentacao: { type: Date },
    statusProposicao: { type: Object },
    ementaDetalhada: { type: String },
    keywords: { type: String },
    urlInteiroTeor: { type: String },
    justificativa: { type: String },
});

export const Proposicao = model<IProposicao>('Proposicao', ProposicaoSchema);