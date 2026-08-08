import { VotacaoRepository } from "@/repositories/votacao.repository";
import { IVotacao } from "@/models/votacao.model";

export class VotacaoService {
    private readonly repositorio: VotacaoRepository;

    constructor(repositorio: VotacaoRepository) {
        this.repositorio = repositorio;
    }

    async findByIds(ids: string[]): Promise<IVotacao[]> {
        return await this.repositorio.findByIds(ids);
    }
}
