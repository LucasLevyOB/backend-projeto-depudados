import mongoose, { Connection } from "mongoose";
import { Deputado } from "@/models/deputado.model";
import { Despesa } from "@/models/despesa.model";
import { Proposicao } from "@/models/proposicao.model";
import { Votacao } from "@/models/votacao.model";
import { VotoDeputado } from "@/models/votoDeputado.model";

export interface IContagemDespesas { ano: number; total: number; comDeputado: number }
export interface IContagemProposicoes { ano: number; total: number; pls: number; plsComTema: number }
export interface IContagemAno { ano: number; total: number }

export interface IResumoDeputadosLegislatura {
    comMandato: number;
    emExercicio: number;
    emExercicioSemCpf: number;
    emExercicioSemPresencas: number;
    emExercicioSemGastos: number;
}

const inicioDoAno = (ano: number): Date => new Date(Date.UTC(ano, 0, 1));

/** Consultas de contagem usadas pelo `validate:local` (somente leitura). */
export class ValidacaoRepository {
    async despesasPorAno(anos: number[]): Promise<IContagemDespesas[]> {
        return Despesa.aggregate<IContagemDespesas>([
            { $match: { ano: { $in: anos } } },
            {
                $group: {
                    _id: "$ano",
                    total: { $sum: 1 },
                    comDeputado: { $sum: { $cond: [{ $gt: ["$idDeputado", null] }, 1, 0] } },
                },
            },
            { $project: { _id: 0, ano: "$_id", total: 1, comDeputado: 1 } },
        ]);
    }

    async proposicoesPorAno(anos: number[]): Promise<IContagemProposicoes[]> {
        const ehPL = { $eq: ["$codTipo", 139] };
        return Proposicao.aggregate<IContagemProposicoes>([
            { $match: { ano: { $in: anos } } },
            {
                $group: {
                    _id: "$ano",
                    total: { $sum: 1 },
                    pls: { $sum: { $cond: [ehPL, 1, 0] } },
                    plsComTema: {
                        $sum: { $cond: [{ $and: [ehPL, { $gt: [{ $size: { $ifNull: ["$temas", []] } }, 0] }] }, 1, 0] },
                    },
                },
            },
            { $project: { _id: 0, ano: "$_id", total: 1, pls: 1, plsComTema: 1 } },
        ]);
    }

    async votacoesPorAno(anos: number[]): Promise<IContagemAno[]> {
        return Votacao.aggregate<IContagemAno>([
            { $match: { data: { $gte: inicioDoAno(Math.min(...anos)), $lt: inicioDoAno(Math.max(...anos) + 1) } } },
            { $group: { _id: { $year: "$data" }, total: { $sum: 1 } } },
            { $project: { _id: 0, ano: "$_id", total: 1 } },
        ]);
    }

    async votosPorAno(anos: number[]): Promise<IContagemAno[]> {
        return VotoDeputado.aggregate<IContagemAno>([
            { $match: { dataHoraVoto: { $gte: inicioDoAno(Math.min(...anos)), $lt: inicioDoAno(Math.max(...anos) + 1) } } },
            { $group: { _id: { $year: "$dataHoraVoto" }, total: { $sum: 1 } } },
            { $project: { _id: 0, ano: "$_id", total: 1 } },
        ]);
    }

    async resumoDeputados(idLegislatura: number): Promise<IResumoDeputadosLegislatura> {
        const emExercicio = (extra: Record<string, unknown> = {}) => ({
            mandatos: { $elemMatch: { idLegislatura, "ultimoStatus.situacao": "Exercício", ...extra } },
        });

        const [comMandato, total, semCpf, semPresencas, semGastos] = await Promise.all([
            Deputado.countDocuments({ "mandatos.idLegislatura": idLegislatura }),
            Deputado.countDocuments(emExercicio()),
            Deputado.countDocuments({ ...emExercicio(), cpf: { $in: [null, ""] } }),
            Deputado.countDocuments(emExercicio({ "resumoPresencas.totalSessoes": { $in: [0, null] } })),
            Deputado.countDocuments(emExercicio({ "estatisticas.gastosDespesas": { $in: [0, null] } })),
        ]);

        return {
            comMandato,
            emExercicio: total,
            emExercicioSemCpf: semCpf,
            emExercicioSemPresencas: semPresencas,
            emExercicioSemGastos: semGastos,
        };
    }

    /** Tamanho do banco padrão (dados + índices), em bytes. */
    async tamanhoBanco(): Promise<{ dados: number; indices: number }> {
        const stats = await mongoose.connection.db!.stats();
        return { dados: stats.dataSize, indices: stats.indexSize };
    }

    /** Contagem (estimada) de documentos de cada coleção de uma conexão qualquer. */
    async contarColecoes(conexao: Connection = mongoose.connection): Promise<Map<string, number>> {
        const db = conexao.db!;
        const colecoes = await db.listCollections({}, { nameOnly: true }).toArray();
        const contagens = await Promise.all(
            colecoes.map(async c => [c.name, await db.collection(c.name).estimatedDocumentCount()] as const)
        );
        return new Map(contagens);
    }
}
