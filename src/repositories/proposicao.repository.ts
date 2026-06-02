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

    async countByIdsAndTipo(ids: number[], codTipo: number): Promise<number> {
        return await Proposicao.countDocuments({ _id: { $in: ids }, codTipo });
    }
}
