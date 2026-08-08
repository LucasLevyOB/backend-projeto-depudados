import { Schema, model, Document } from 'mongoose';

export interface IVotoDeputado extends Document {
    idVotacao: string;
    uriVotacao: string;
    dataHoraVoto: Date;
    voto: string;
    deputado_: {
        id: string;
        uri: string;
        nome: string;
        siglaPartido: string;
        uriPartido: string;
        siglaUf: string;
        idLegislatura: string;
        urlFoto: string;
    };
}

const VotoDeputadoSchema = new Schema<IVotoDeputado>({
    idVotacao: { type: String, required: true },
    uriVotacao: { type: String, default: null },
    dataHoraVoto: { type: Date, default: null },
    voto: { type: String, required: true },
    deputado_: {
        id: { type: String, required: true },
        uri: { type: String, default: null },
        nome: { type: String, required: true },
        siglaPartido: { type: String, default: null },
        uriPartido: { type: String, default: null },
        siglaUf: { type: String, default: null },
        idLegislatura: { type: String, default: null },
        urlFoto: { type: String, default: null }
    }
});

export const VotoDeputado = model<IVotoDeputado>('VotoDeputado', VotoDeputadoSchema, 'votosDeputados');
