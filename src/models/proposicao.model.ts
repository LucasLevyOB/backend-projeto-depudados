import { Schema, model } from 'mongoose';

export interface IProposicao {
    _id: number;
    id: number;
    uri: string;
    titulo: string;
    siglaTipo: string;
    numero: number;
    ano: number;
    codTipo: number;
    descricaoTipo: string;
    ementa: string;
    ementaDetalhada: string;
    keywords: string;
    dataApresentacao: Date;
    uriOrgaoNumerador: string;
    uriPropAnterior: string;
    uriPropPrincipal: string;
    uriPropPosterior: string;
    urlInteiroTeor: string;
    ultimoStatus: object;
    idPropPrincipal: number | null;
    temas?: string[];
    situacaoAtualBusca?: string;
    estados?: object[];
    autores?: object[];
    txtRegime?: string;
    txtApreciacao?: string;
    linkVideo?: string;
    explicacaoEmenta?: string;
    comissaoPreponderante?: string;
    qtdeDeTramitacoes?: number;
}

const ProposicaoSchema: Schema = new Schema({
    _id: { type: Number, required: true },
    id: { type: Number, unique: true, required: true },
    uri: { type: String },
    titulo: { type: String },
    siglaTipo: { type: String },
    numero: { type: Number },
    ano: { type: Number },
    codTipo: { type: Number },
    descricaoTipo: { type: String },
    ementa: { type: String },
    ementaDetalhada: { type: String },
    keywords: { type: String },
    dataApresentacao: { type: Date },
    uriOrgaoNumerador: { type: String },
    uriPropAnterior: { type: String },
    uriPropPrincipal: { type: String },
    uriPropPosterior: { type: String },
    urlInteiroTeor: { type: String },
    ultimoStatus: { type: Object },
    idPropPrincipal: { type: Number, default: null },
    temas: { type: [String], default: null },
    situacaoAtualBusca: { type: String, default: null },
    estados: { type: [Object], default: null },
    autores: { type: [Object], default: null },
    txtRegime: { type: String, default: null },
    txtApreciacao: { type: String, default: null },
    linkVideo: { type: String, default: null },
    explicacaoEmenta: { type: String, default: null },
    comissaoPreponderante: { type: String, default: null },
    qtdeDeTramitacoes: { type: Number, default: null }
});

export const Proposicao = model<IProposicao>('Proposicao', ProposicaoSchema);