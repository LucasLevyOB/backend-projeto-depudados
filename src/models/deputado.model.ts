import { Schema, model } from 'mongoose';

export interface IStatus {
    situacao: string;
    condicaoEleitoral: string;
    siglaPartido: string;
    siglaUf: string;
    idLegislatura: number;
    nomeEleitoral: string;
    data: string;
    descricaoStatus: string | null;
    gabinete?: {
        nome: string | null;
        predio: string | null;
        sala: string | null;
        andar: string | null;
        telefone: string | null;
        email: string | null;
    };
}

export interface IResumoGastos {
    ano: number;
    totalGastos: number;
    meses: Array<{
        mes: number;
        totalGasto: number;
    }>;
    categorias: Array<{
        descricao: string;
        totalGasto: number;
    }>;
}

export interface IResumoProposicoes {
    ano: number;
    meses: Array<{
        mes: number;
        projetosDeLei: number;
        outrasProposicoes: number;
    }>;
    tipos: Array<{
        siglaTipo: string;
        quantidade: number;
    }>;
}

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
        temasProposicoes?: Array<{ tema: string; quantidade: number }>;
    };
    cpf?: string;
    escolaridade?: string;
    ultimoStatus?: IStatus;
    resumoGastos?: IResumoGastos[];
    resumoProposicoes?: IResumoProposicoes[];
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
        custoPorProposicao: { type: Number, default: null },
        temasProposicoes: [{
            tema: { type: String },
            quantidade: { type: Number, default: 0 }
        }]
    },
    cpf: { type: String },
    escolaridade: { type: String },
    ultimoStatus: {
        situacao: { type: String },
        condicaoEleitoral: { type: String },
        siglaPartido: { type: String },
        siglaUf: { type: String },
        idLegislatura: { type: Number },
        nomeEleitoral: { type: String },
        data: { type: String },
        descricaoStatus: { type: String },
        gabinete: {
            nome: { type: String },
            predio: { type: String },
            sala: { type: String },
            andar: { type: String },
            telefone: { type: String },
            email: { type: String }
        }
    },
    resumoGastos: [{
        ano: { type: Number },
        totalGastos: { type: Number },
        meses: [{
            mes: { type: Number },
            totalGasto: { type: Number }
        }],
        categorias: [{
            descricao: { type: String },
            totalGasto: { type: Number }
        }]
    }],
    resumoProposicoes: [{
        ano: { type: Number },
        meses: [{
            mes: { type: Number },
            projetosDeLei: { type: Number, default: 0 },
            outrasProposicoes: { type: Number, default: 0 }
        }],
        tipos: [{
            siglaTipo: { type: String },
            descricaoTipo: { type: String },
            quantidade: { type: Number, default: 0 }
        }]
    }]
}, {
    collation: { locale: "pt", strength: 1 }
});

export const Deputado = model<IDeputado>('Deputado', DeputadoSchema);