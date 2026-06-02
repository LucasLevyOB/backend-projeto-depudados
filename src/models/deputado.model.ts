import { Schema, model } from 'mongoose';

export interface IDeputado {
    _id: number;
    uri: string;
    nome: string;
    idLegislaturaInicial: number;
    idLegislaturaFinal: number;
    nomeCivil: string;
    siglaSexo: string;
    urlRedeSocial: string[];
    urlWebsite: string[];
    dataNascimento: string;
    dataFalecimento: string;
    urlFoto: string;
    ufNascimento: string;
    municipioNascimento: string;
    estatisticas?: {
        gastosDespesas: number;
        projetosDeLei: number;
        totalProposicoes: number;
        scoreEficiencia: number;
        custoPorProjetoLei: number | null;
        custoPorProposicao: number | null;
    };
}

const DeputadoSchema: Schema = new Schema({
    _id: { type: Number, required: true },
    uri: { type: String },
    nome: { type: String },
    idLegislaturaInicial: { type: Number },
    idLegislaturaFinal: { type: Number },
    nomeCivil: { type: String },
    siglaSexo: { type: String },
    urlRedeSocial: [{ type: String }],
    urlWebsite: [{ type: String }],
    dataNascimento: { type: String },
    dataFalecimento: { type: String },
    urlFoto: { type: String },
    ufNascimento: { type: String },
    municipioNascimento: { type: String },
    estatisticas: {
        gastosDespesas: { type: Number, default: 0 },
        projetosDeLei: { type: Number, default: 0 },
        totalProposicoes: { type: Number, default: 0 },
        scoreEficiencia: { type: Number, default: 0, index: -1 },
        custoPorProjetoLei: { type: Number, default: null },
        custoPorProposicao: { type: Number, default: null }
    }
});

export const Deputado = model<IDeputado>('Deputado', DeputadoSchema);