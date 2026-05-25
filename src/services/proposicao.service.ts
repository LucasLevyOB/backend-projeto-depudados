import { ProposicaoRepository } from "@/repositories/proposicao.repository";
import { IProposicao } from "@/models/proposicao.model";

export class ProposicaoService {
    private readonly repositorio: ProposicaoRepository;

    constructor(repositorio: ProposicaoRepository) {
        this.repositorio = repositorio;
    }

    async findAll(): Promise<IProposicao[]> {
        return await this.repositorio.findAll();
    }
}
