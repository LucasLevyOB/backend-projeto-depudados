import { Schema, model, Document } from 'mongoose';

export interface IDespesa extends Document {
    idDeputado: number;
    ano: number;
    cnpjCpfFornecedor: string;
    codDocumento: string;
    codLote: number;
    codTipoDocumento: number;
    dataDocumento: Date;
    mes: number;
    nomeFornecedor: string;
    numDocumento: string;
    numRessarcimento: string;
    parcela: number;
    tipoDespesa: string;
    tipoDocumento: string;
    urlDocumento: string;
    valorDocumento: number;
    valorGlosa: number;
    valorLiquido: number;
}

const DespesaSchema: Schema = new Schema({
    idDeputado: { type: Number, required: true, index: true },
    ano: { type: Number },
    cnpjCpfFornecedor: { type: String },
    codDocumento: { type: String },
    codLote: { type: Number },
    codTipoDocumento: { type: Number },
    dataDocumento: { type: Date },
    mes: { type: Number },
    nomeFornecedor: { type: String },
    numDocumento: { type: String },
    numRessarcimento: { type: String },
    parcela: { type: Number },
    tipoDespesa: { type: String },
    tipoDocumento: { type: String },
    urlDocumento: { type: String },
    valorDocumento: { type: Number },
    valorGlosa: { type: Number },
    valorLiquido: { type: Number },
});

export const Despesa = model<IDespesa>('Despesa', DespesaSchema);