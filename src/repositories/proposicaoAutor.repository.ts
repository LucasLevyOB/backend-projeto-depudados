import { ProposicaoAutor, IProposicaoAutor } from "@/models/proposicaoAutor.model";

export class ProposicaoAutorRepository {
    async findByProposicaoId(idProposicao: number): Promise<IProposicaoAutor[]> {
        return await ProposicaoAutor.find({ idProposicao });
    }

    async findByDeputadoId(idDeputadoAutor: number): Promise<IProposicaoAutor[]> {
        return await ProposicaoAutor.find({ idDeputadoAutor });
    }

    async countProjetosByDeputadoId(idDeputadoAutor: number): Promise<number> {
        return await ProposicaoAutor.countDocuments({ idDeputadoAutor });
    }
}
