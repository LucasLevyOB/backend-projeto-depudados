import { Connection, mongo, Schema } from "mongoose";
import Partido from "@/models/partido.model";
import { Deputado } from "@/models/deputado.model";
import { Despesa } from "@/models/despesa.model";
import { Proposicao } from "@/models/proposicao.model";
import { ProposicaoAutor } from "@/models/proposicaoAutor.model";
import { Votacao } from "@/models/votacao.model";
import { VotoDeputado } from "@/models/votoDeputado.model";
import {
    chaveDeputado,
    chavePartido,
    chaveProposicao,
    chaveProposicaoAutor,
    chaveVotacao,
    chaveVotoDeputado,
} from "@/repositories/chavesUpsert";

/** `_id` aqui pode ser número (deputados, proposições), string (votações) ou ObjectId. */
type Doc = { _id: number | string | mongo.ObjectId; [campo: string]: unknown };
type Filtro = mongo.Filter<Doc>;

const TAMANHO_LOTE = 1_000;

/** Documento cru lido do banco, visto com os campos que a chave natural usa. */
const como = <T>(doc: Doc): T => doc as unknown as T;

export interface IColecaoPromocao {
    /** Nome real da coleção (o que o Mongoose usa: ex. `proposicaos`). */
    nome: string;
    modelName: string;
    schema: Schema;
    /** Chave natural: identidade do documento nos dois bancos (os `_id`s de autores, votos e despesas diferem). */
    chave: (doc: Doc) => Filtro;
    /** Subconjunto a promover; `ano` ausente = coleção inteira. Consultas auxiliares usam o banco de origem. */
    filtro: (origem: Connection, ano?: number) => Promise<Filtro>;
    /** Despesas não têm chave natural confiável: o ano inteiro é substituído no destino. */
    substituirPorAno?: boolean;
}

const doModel = (m: { collection: { name: string }; modelName: string; schema: Schema }) => ({
    nome: m.collection.name,
    modelName: m.modelName,
    schema: m.schema,
});

const intervaloDoAno = (ano: number) => ({ $gte: new Date(Date.UTC(ano, 0, 1)), $lt: new Date(Date.UTC(ano + 1, 0, 1)) });

const distinct = (origem: Connection, colecao: string, campo: string, filtro: Filtro): Promise<unknown[]> =>
    origem.db!.collection<Doc>(colecao).distinct(campo, filtro);

/** Ordem de promoção: cadastros antes dos dados que os referenciam. */
export const CATALOGO_PROMOCAO: IColecaoPromocao[] = [
    { ...doModel(Partido), chave: d => chavePartido(como<{ id: string }>(d)), filtro: async () => ({}) },
    { ...doModel(Deputado), chave: d => chaveDeputado(como<{ _id: number }>(d)), filtro: async () => ({}) },
    {
        ...doModel(Proposicao),
        chave: d => chaveProposicao(como<{ _id: number }>(d)),
        filtro: async (_, ano) => (ano ? { ano } : {}),
    },
    {
        ...doModel(ProposicaoAutor),
        chave: d => chaveProposicaoAutor(como<{ idProposicao: number; idDeputadoAutor?: number | null; nomeAutor: string }>(d)),
        filtro: async (origem, ano) =>
            ano ? { idProposicao: { $in: await distinct(origem, Proposicao.collection.name, "_id", { ano }) } } : {},
    },
    {
        ...doModel(Votacao),
        chave: d => chaveVotacao(como<{ _id: string }>(d)),
        filtro: async (_, ano) => (ano ? { data: intervaloDoAno(ano) } : {}),
    },
    {
        ...doModel(VotoDeputado),
        chave: d => chaveVotoDeputado(como<{ idVotacao: string; deputado_: { id: string } }>(d)),
        filtro: async (origem, ano) =>
            ano ? { idVotacao: { $in: await distinct(origem, Votacao.collection.name, "_id", { data: intervaloDoAno(ano) }) } } : {},
    },
    {
        ...doModel(Despesa),
        chave: d => ({ _id: d._id }),
        filtro: async (_, ano) => (ano ? { ano } : {}),
        substituirPorAno: true,
    },
];

/** Nomes que um banco importado manualmente poderia usar no lugar dos nomes gerados pelo Mongoose. */
export const NOMES_ALTERNATIVOS: Record<string, string> = {
    proposicaos: "proposicoes",
    votacaos: "votacoes",
};

export interface IResultadoPromocao {
    inseridos: number;
    /** Documentos que já existiam no destino e foram substituídos pela versão local. */
    substituidos: number;
    removidos: number;
}

export class PromocaoRepository {
    constructor(private readonly origem: Connection, private readonly destino: Connection) {}

    async colecoesDestino(): Promise<Set<string>> {
        const colecoes = await this.destino.db!.listCollections({}, { nameOnly: true }).toArray();
        return new Set(colecoes.map(c => c.name));
    }

    async contar(c: IColecaoPromocao, filtro: Filtro): Promise<{ origem: number; destino: number }> {
        const [origem, destino] = await Promise.all([
            this.origem.db!.collection<Doc>(c.nome).countDocuments(filtro),
            this.destino.db!.collection<Doc>(c.nome).countDocuments(filtro),
        ]);
        return { origem, destino };
    }

    /** Cria no destino os índices declarados no schema (necessários para os upserts por chave serem rápidos). */
    async criarIndices(c: IColecaoPromocao): Promise<void> {
        const model = this.destino.models[c.modelName] ?? this.destino.model(c.modelName, c.schema, c.nome);
        await model.createIndexes();
    }

    async promover(c: IColecaoPromocao, filtro: Filtro, aoProgresso: (n: number) => void): Promise<IResultadoPromocao> {
        return c.substituirPorAno ? this.substituirPorAno(c, filtro, aoProgresso) : this.upsertPorChave(c, filtro, aoProgresso);
    }

    /** Lê a origem em lotes e substitui cada documento no destino pela chave natural. */
    private async upsertPorChave(c: IColecaoPromocao, filtro: Filtro, aoProgresso: (n: number) => void): Promise<IResultadoPromocao> {
        let resultado: IResultadoPromocao = { inseridos: 0, substituidos: 0, removidos: 0 };
        let processados = 0;

        const escrever = async (lote: Doc[]): Promise<void> => {
            const r = await this.destino.db!.collection<Doc>(c.nome).bulkWrite(
                lote.map(doc => {
                    // Sem `_id` na substituição: o destino mantém o seu (ou recebe o do filtro, se for `_id`).
                    const { _id, ...campos } = doc;
                    return { replaceOne: { filter: c.chave(doc), replacement: campos, upsert: true } };
                }),
                { ordered: false }
            );
            resultado = {
                ...resultado,
                inseridos: resultado.inseridos + r.upsertedCount,
                substituidos: resultado.substituidos + r.matchedCount,
            };
            processados += lote.length;
            aoProgresso(processados);
        };

        await this.emLotes(c, filtro, escrever);
        return resultado;
    }

    /** Para cada ano presente na origem: apaga o ano no destino e insere os documentos da origem. */
    private async substituirPorAno(c: IColecaoPromocao, filtro: Filtro, aoProgresso: (n: number) => void): Promise<IResultadoPromocao> {
        const anos = (await distinct(this.origem, c.nome, "ano", filtro)) as number[];
        let resultado: IResultadoPromocao = { inseridos: 0, substituidos: 0, removidos: 0 };
        let processados = 0;

        for (const ano of anos.sort()) {
            const { deletedCount } = await this.destino.db!.collection<Doc>(c.nome).deleteMany({ ano });
            resultado = { ...resultado, removidos: resultado.removidos + deletedCount };

            await this.emLotes(c, { ano }, async lote => {
                const r = await this.destino.db!.collection<Doc>(c.nome).insertMany(lote, { ordered: false });
                resultado = { ...resultado, inseridos: resultado.inseridos + r.insertedCount };
                processados += lote.length;
                aoProgresso(processados);
            });
        }

        return resultado;
    }

    private async emLotes(c: IColecaoPromocao, filtro: Filtro, escrever: (lote: Doc[]) => Promise<void>): Promise<void> {
        const cursor = this.origem.db!.collection<Doc>(c.nome).find(filtro).batchSize(TAMANHO_LOTE);
        let lote: Doc[] = [];

        for await (const doc of cursor) {
            lote.push(doc);
            if (lote.length >= TAMANHO_LOTE) {
                await escrever(lote);
                lote = [];
            }
        }
        if (lote.length > 0) await escrever(lote);
    }
}
