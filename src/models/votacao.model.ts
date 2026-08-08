import { Schema, model } from 'mongoose';

export interface IVotacao {
    _id: string;
    id: string;
    uri: string;
    data: Date;
    dataHoraRegistro: Date;
    idOrgao: number;
    uriOrgao: string;
    siglaOrgao: string;
    idEvento: number;
    uriEvento: string;
    aprovacao: number;
    votosSim: number;
    votosNao: number;
    votosOutros: number;
    descricao: string;
    ultimaAberturaVotacao: {
        dataHoraRegistro: Date | string | null;
        descricao: string;
    };
    ultimaApresentacaoProposicao: {
        dataHoraRegistro: Date | string | null;
        descricao: string;
        idProposicao: number;
        uriProposicao: string;
    };
}

const VotacaoSchema = new Schema<IVotacao>({
    _id: { type: String, required: true },
    id: { type: String, unique: true, required: true },
    uri: { type: String, default: null },
    data: { type: Date, default: null },
    dataHoraRegistro: { type: Date, default: null },
    idOrgao: { type: Number, default: null },
    uriOrgao: { type: String, default: null },
    siglaOrgao: { type: String, default: null },
    idEvento: { type: Number, default: null },
    uriEvento: { type: String, default: null },
    aprovacao: { type: Number, default: null },
    votosSim: { type: Number, default: null },
    votosNao: { type: Number, default: null },
    votosOutros: { type: Number, default: null },
    descricao: { type: String, default: null },
    ultimaAberturaVotacao: {
        dataHoraRegistro: { type: Schema.Types.Mixed, default: null },
        descricao: { type: String, default: null }
    },
    ultimaApresentacaoProposicao: {
        dataHoraRegistro: { type: Schema.Types.Mixed, default: null },
        descricao: { type: String, default: null },
        idProposicao: { type: Number, default: null },
        uriProposicao: { type: String, default: null }
    }
});

export const Votacao = model<IVotacao>('Votacao', VotacaoSchema);
