import { Proposicao, IProposicao } from "@/models/proposicao.model";

export class ProposicaoRepository {
    async findAll(): Promise<IProposicao[]> {
        return await Proposicao.find();
    }

    async findByIdsWithPagination(ids: number[], page: number, limit: number): Promise<IProposicao[]> {
        const skip = (page - 1) * limit;
        return await Proposicao.find({ _id: { $in: ids } })
            .sort({ dataApresentacao: -1 })
            .skip(skip)
            .limit(limit);
    }

    async findByIds(ids: number[]): Promise<IProposicao[]> {
        return await Proposicao.find({ _id: { $in: ids } }).lean();
    }

    async countByIdsAndTipo(ids: number[], codTipo: number, periodo?: number[]): Promise<number> {
        if (periodo) {
            return await Proposicao.countDocuments({ _id: { $in: ids }, codTipo, ano: { $in: periodo } });
        }
        return await Proposicao.countDocuments({ _id: { $in: ids }, codTipo });
    }
}
