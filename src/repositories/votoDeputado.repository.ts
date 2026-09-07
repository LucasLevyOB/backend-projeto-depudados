import { VotoDeputado, IVotoDeputado } from "@/models/votoDeputado.model";
import { IPagedResponse } from "@/types/PagedResponse";

export class VotoDeputadoRepository {
    async findByVotacaoId(idVotacao: string): Promise<IVotoDeputado[]> {
        return await VotoDeputado.find({ idVotacao }).lean();
    }

    async findByDeputadoId(idDeputado: string | number, page: number = 1, limit: number = 20, idVotacoes?: string[]): Promise<IPagedResponse<IVotoDeputado>> {
        const query: any = { "deputado_.id": idDeputado.toString() };
        
        if (idVotacoes && idVotacoes.length > 0) {
            query.idVotacao = { $in: idVotacoes };
        } else if (idVotacoes && idVotacoes.length === 0) {
            return {
                data: [],
                total: 0,
                page,
                limit,
                totalPages: 0
            };
        }

        const total = await VotoDeputado.countDocuments(query);
        const skip = (page - 1) * limit;

        const data = await VotoDeputado.find(query)
            .skip(skip)
            .limit(limit)
            .lean();

        return {
            data: data as IVotoDeputado[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async findByDeputadoEVotacao(idDeputado: string | number, idVotacao: string): Promise<IVotoDeputado | null> {
        return await VotoDeputado.findOne({
            "deputado_.id": idDeputado.toString(),
            idVotacao
        }).lean();
    }

    async findVotacoesIdsByDeputados(
        idsDeputados: (string | number)[],
        page: number = 1,
        limit: number = 10,
        idVotacoesFiltradas?: string[]
    ): Promise<{ idVotacoes: string[]; total: number; totalPages: number }> {
        if (!idsDeputados || idsDeputados.length === 0) {
            return { idVotacoes: [], total: 0, totalPages: 0 };
        }

        if (idVotacoesFiltradas && idVotacoesFiltradas.length === 0) {
            return { idVotacoes: [], total: 0, totalPages: 0 };
        }

        const strIds = idsDeputados.map(id => id.toString());
        const matchStage: Record<string, unknown> = {
            "deputado_.id": { $in: strIds }
        };

        if (idVotacoesFiltradas && idVotacoesFiltradas.length > 0) {
            matchStage.idVotacao = { $in: idVotacoesFiltradas };
        }

        const skip = (page - 1) * limit;

        const aggregateResult = await VotoDeputado.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$idVotacao",
                    dataMaisRecente: { $max: "$dataHoraVoto" }
                }
            },
            { $sort: { dataMaisRecente: -1 } },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: skip }, { $limit: limit }]
                }
            }
        ]);

        const firstResult = aggregateResult[0];
        const total = (firstResult?.metadata?.[0]?.total as number) || 0;
        const dataItems = (firstResult?.data as { _id: string }[]) || [];
        const idVotacoes: string[] = [];

        for (const item of dataItems) {
            idVotacoes.push(item._id);
        }

        return {
            idVotacoes,
            total,
            totalPages: Math.ceil(total / limit)
        };
    }

    async findByDeputadosEVotacoes(
        idsDeputados: (string | number)[],
        idsVotacoes: string[]
    ): Promise<IVotoDeputado[]> {
        if (!idsDeputados || idsDeputados.length === 0 || !idsVotacoes || idsVotacoes.length === 0) {
            return [];
        }

        const strIds = idsDeputados.map(id => id.toString());
        return await VotoDeputado.find({
            "deputado_.id": { $in: strIds },
            idVotacao: { $in: idsVotacoes }
        }).lean();
    }
}
