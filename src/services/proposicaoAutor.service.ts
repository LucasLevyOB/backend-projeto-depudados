import { ProposicaoAutorRepository } from "@/repositories/proposicaoAutor.repository";
import { IProposicaoAutor } from "@/models/proposicaoAutor.model";

export class ProposicaoAutorService {
    private readonly repositorio: ProposicaoAutorRepository;

    constructor(repositorio: ProposicaoAutorRepository) {
        this.repositorio = repositorio;
    }

    async findByProposicaoId(idProposicao: number): Promise<IProposicaoAutor[]> {
        return await this.repositorio.findByProposicaoId(idProposicao);
    }

    async findByDeputadoId(idDeputadoAutor: number): Promise<IProposicaoAutor[]> {
        return await this.repositorio.findByDeputadoId(idDeputadoAutor);
    }
}
