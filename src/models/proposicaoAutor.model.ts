import { Schema, model } from 'mongoose';

export interface IProposicaoAutor {
    idProposicao: number;
    uriProposicao: string;
    idDeputadoAutor?: number; // Opcional, presente apenas quando for deputado
    uriAutor: string;
    codTipoAutor: number;
    tipoAutor: string;
    nomeAutor: string;
    siglaPartidoAutor: string;
    uriPartidoAutor: string;
    siglaUFAutor: string;
    ordemAssinatura: string;
    proponente: string;
}

const ProposicaoAutorSchema: Schema = new Schema({
    idProposicao: { type: Number, required: true, index: true },
    uriProposicao: { type: String },
    idDeputadoAutor: { type: Number, index: true },
    uriAutor: { type: String },
    codTipoAutor: { type: Number },
    tipoAutor: { type: String },
    nomeAutor: { type: String },
    siglaPartidoAutor: { type: String },
    uriPartidoAutor: { type: String },
    siglaUFAutor: { type: String },
    ordemAssinatura: { type: String },
    proponente: { type: String }
});

export const ProposicaoAutor = model<IProposicaoAutor>('ProposicaoAutor', ProposicaoAutorSchema);
