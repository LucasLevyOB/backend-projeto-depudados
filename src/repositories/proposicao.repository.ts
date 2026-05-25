import { Proposicao, IProposicao } from "@/models/proposicao.model";

export class ProposicaoRepository {
    async findAll(): Promise<IProposicao[]> {
        return await Proposicao.find();
    }
}
