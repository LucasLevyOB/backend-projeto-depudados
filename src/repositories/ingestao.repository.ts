import { AnyBulkWriteOperation, Model, mongo } from "mongoose";
import Partido from "@/models/partido.model";
import { Deputado, IDeputado, IMandatoLegislatura, IStatus } from "@/models/deputado.model";
import { Despesa, IDespesa } from "@/models/despesa.model";
import { Proposicao, IProposicao } from "@/models/proposicao.model";
import { ProposicaoAutor, IProposicaoAutor } from "@/models/proposicaoAutor.model";
import { Votacao, IVotacao } from "@/models/votacao.model";
import { VotoDeputado } from "@/models/votoDeputado.model";
import {
    chaveDeputado,
    chavePartido,
    chaveProposicao,
    chaveProposicaoAutor,
    chaveVotacao,
    chaveVotoDeputado,
} from "@/repositories/chavesUpsert";

const TAMANHO_LOTE = 2_000;

export interface IResultadoIngestao {
    inseridos: number;
    atualizados: number;
    correspondidos: number;
}

const RESULTADO_VAZIO: IResultadoIngestao = { inseridos: 0, atualizados: 0, correspondidos: 0 };

type Operacao = AnyBulkWriteOperation;

const upsert = (filter: Record<string, unknown>, $set: Record<string, unknown>): Operacao => ({
    updateOne: { filter, update: { $set }, upsert: true },
});

/** Executa as operações em lotes, sem parar no primeiro erro de um documento (`ordered: false`). */
const executarEmLotes = async <O>(
    operacoes: O[],
    escrever: (lote: O[]) => Promise<mongo.BulkWriteResult>
): Promise<IResultadoIngestao> => {
    let total = RESULTADO_VAZIO;

    for (let inicio = 0; inicio < operacoes.length; inicio += TAMANHO_LOTE) {
        const r = await escrever(operacoes.slice(inicio, inicio + TAMANHO_LOTE));
        total = {
            inseridos: total.inseridos + r.upsertedCount + r.insertedCount,
            atualizados: total.atualizados + r.modifiedCount,
            correspondidos: total.correspondidos + r.matchedCount,
        };
    }

    return total;
};

/** Escritor genérico para operações de `$set` simples (o tipo `Document` do driver basta). */
const escreverEm = (model: Pick<Model<unknown>, "bulkWrite">) =>
    (lote: Operacao[]) => model.bulkWrite(lote, { ordered: false });

const mandatoVazio = (idLegislatura: number, ultimoStatus: Partial<IStatus>): IMandatoLegislatura => ({
    idLegislatura,
    ultimoStatus: ultimoStatus as IStatus,
    estatisticas: {
        gastosDespesas: 0,
        projetosDeLei: 0,
        totalProposicoes: 0,
        scoreEficiencia: 0,
        custoPorProjetoLei: null,
        custoPorProposicao: null,
        temasProposicoes: [],
    },
    resumoPresencas: { totalSessoes: 0, presencas: 0, ausencias: 0, percentualPresenca: 0 },
});

export type DeputadoCadastro = Partial<Omit<IDeputado, "estatisticas" | "resumoGastos" | "resumoProposicoes" | "resumoPresencas" | "mandatos">> & { _id: number };

export class IngestaoRepository {
    async upsertPartidos(partidos: Array<{ id: string; sigla: string; nome: string; uri: string }>): Promise<IResultadoIngestao> {
        return executarEmLotes(partidos.map(p => upsert(chavePartido(p), p)), escreverEm(Partido));
    }

    /** Só grava campos cadastrais: nunca toca em `estatisticas`, `resumo*` ou `mandatos`. */
    async upsertDeputadosCadastro(deputados: DeputadoCadastro[]): Promise<IResultadoIngestao> {
        return executarEmLotes(
            deputados.map(({ _id, ...cadastro }) => upsert(chaveDeputado({ _id }), cadastro)),
            escreverEm(Deputado)
        );
    }

    /** Cria `mandatos[idLegislatura]` (com estatísticas zeradas) para quem ainda não tem. */
    async garantirMandatos(
        idLegislatura: number,
        itens: Array<{ idDeputado: number; ultimoStatus: Partial<IStatus> }>
    ): Promise<IResultadoIngestao> {
        const operacoes: AnyBulkWriteOperation<IDeputado>[] = itens.map(({ idDeputado, ultimoStatus }) => ({
            updateOne: {
                filter: { _id: idDeputado, "mandatos.idLegislatura": { $ne: idLegislatura } },
                update: { $push: { mandatos: mandatoVazio(idLegislatura, ultimoStatus) } },
            },
        }));
        return executarEmLotes(operacoes, lote => Deputado.bulkWrite(lote, { ordered: false }));
    }

    async atualizarStatusMandatos(
        idLegislatura: number,
        itens: Array<{ idDeputado: number; ultimoStatus: IStatus }>
    ): Promise<IResultadoIngestao> {
        return executarEmLotes(
            itens.map(({ idDeputado, ultimoStatus }) => ({
                updateOne: {
                    filter: { _id: idDeputado, "mandatos.idLegislatura": idLegislatura },
                    update: { $set: { "mandatos.$.ultimoStatus": ultimoStatus } },
                },
            })),
            escreverEm(Deputado)
        );
    }

    /**
     * Substitui todas as despesas de um ano. Algumas notas não têm `idDocumento` único,
     * então não há chave natural confiável para upsert.
     */
    async substituirDespesasAno(ano: number, lotes: AsyncIterable<Array<Partial<IDespesa>>>): Promise<{ removidas: number; inseridas: number }> {
        const { deletedCount } = await Despesa.deleteMany({ ano });
        let inseridas = 0;

        for await (const lote of lotes) {
            const docs = await Despesa.insertMany(lote, { ordered: false, lean: true });
            inseridas += docs.length;
        }

        return { removidas: deletedCount, inseridas };
    }

    async upsertProposicoes(proposicoes: Array<Partial<IProposicao> & { _id: number }>): Promise<IResultadoIngestao> {
        return executarEmLotes(
            proposicoes.map(({ _id, ...campos }) => upsert(chaveProposicao({ _id }), campos)),
            escreverEm(Proposicao)
        );
    }

    async upsertProposicoesAutores(autores: IProposicaoAutor[]): Promise<IResultadoIngestao> {
        return executarEmLotes(autores.map(a => upsert(chaveProposicaoAutor(a), { ...a })), escreverEm(ProposicaoAutor));
    }

    async upsertVotacoes(votacoes: Array<Partial<IVotacao> & { _id: string }>): Promise<IResultadoIngestao> {
        return executarEmLotes(
            votacoes.map(({ _id, ...campos }) => upsert(chaveVotacao({ _id }), campos)),
            escreverEm(Votacao)
        );
    }

    async upsertVotosDeputados(
        votos: Array<{ idVotacao: string; deputado_: { id: string } & Record<string, unknown> } & Record<string, unknown>>
    ): Promise<IResultadoIngestao> {
        return executarEmLotes(votos.map(v => upsert(chaveVotoDeputado(v), v)), escreverEm(VotoDeputado));
    }
}
