import { VotoDeputado, IVotoDeputado } from "@/models/votoDeputado.model";
import { IPagedResponse } from "@/types/PagedResponse";

export class VotoDeputadoRepository {
    async findByVotacaoId(idVotacao: string): Promise<IVotoDeputado[]> {
        return await VotoDeputado.find({ idVotacao }).lean();
    }

    async findByDeputadoId(idDeputado: string | number, page: number = 1, limit: number = 20): Promise<IPagedResponse<IVotoDeputado>> {
        const query = { "deputado_.id": idDeputado.toString() };
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
