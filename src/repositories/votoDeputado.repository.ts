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
}
