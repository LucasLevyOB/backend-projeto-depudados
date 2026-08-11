import { Votacao, IVotacao } from "@/models/votacao.model";
import { IPagedResponse } from "@/types";

export class VotacaoRepository {
    async findAll(): Promise<IVotacao[]> {
        return await Votacao.find().lean();
    }

    async findById(id: string): Promise<IVotacao | null> {
        return await Votacao.findById(id).lean();
    }

    async findByIds(ids: string[]): Promise<IVotacao[]> {
        return await Votacao.find({ id: { $in: ids } }).lean();
    }

    async findByProposicao(idProposicao: number): Promise<IVotacao[]> {
        return await Votacao.find({ "ultimaApresentacaoProposicao.idProposicao": idProposicao }).lean();
    }

    async findByProposicoes(idsProposicao: number[]): Promise<IVotacao[]> {
        return await Votacao.find({ "ultimaApresentacaoProposicao.idProposicao": { $in: idsProposicao } }).lean();
    }
}
