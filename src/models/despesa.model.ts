import { Schema, model } from 'mongoose';

export interface IDespesa {
    nomeParlamentar: string;
    cpf: string;
    numeroCarteiraParlamentar: string;
    legislatura: number;
    siglaUF: string;
    siglaPartido: string;
    codigoLegislatura: number;
    numeroSubCota: number;
    descricao: string;
    numeroEspecificacaoSubCota: number;
    descricaoEspecificacao: string;
    fornecedor: string;
    cnpjCPF: string;
    numero: string;
    tipoDocumento: string;
    dataEmissao: Date;
    valorDocumento: string;
    valorGlosa: string;
    valorLiquido: string;
    mes: number;
    ano: number;
    parcela: number;
    passageiro: string;
    trecho: string;
    lote: string;
    ressarcimento: string;
    datPagamentoRestituicao: string;
    restituicao: string;
    numeroDeputadoID: number;
    idDeputado?: number;
    idDocumento: number;
    urlDocumento: string;
}

const DespesaSchema: Schema = new Schema({
    nomeParlamentar: { type: String },
    cpf: { type: String },
    numeroCarteiraParlamentar: { type: String },
    legislatura: { type: Number },
    siglaUF: { type: String },
    siglaPartido: { type: String },
    codigoLegislatura: { type: Number },
    numeroSubCota: { type: Number },
    descricao: { type: String },
    numeroEspecificacaoSubCota: { type: Number },
    descricaoEspecificacao: { type: String },
    fornecedor: { type: String },
    cnpjCPF: { type: String },
    numero: { type: String },
    tipoDocumento: { type: String },
    dataEmissao: { type: Date },
    valorDocumento: { type: String },
    valorGlosa: { type: String },
    valorLiquido: { type: String },
    mes: { type: Number },
    ano: { type: Number },
    parcela: { type: Number },
    passageiro: { type: String },
    trecho: { type: String },
    lote: { type: String },
    ressarcimento: { type: String },
    datPagamentoRestituicao: { type: String },
    restituicao: { type: String },
    numeroDeputadoID: { type: Number, index: true },
    idDeputado: { type: Number, index: true },
    idDocumento: { type: Number },
    urlDocumento: { type: String }
});

export const Despesa = model<IDespesa>('Despesa', DespesaSchema);