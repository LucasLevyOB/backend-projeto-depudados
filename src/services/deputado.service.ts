import { DeputadoRepository } from "@/repositories/deputado.repository";
import { IDeputado } from "@/models/deputado.model";
import { ProposicaoAutorService } from "@/services/proposicaoAutor.service";
import { ProposicaoService } from "@/services/proposicao.service";

export class DeputadoService {
    private readonly repositorio: DeputadoRepository;
    private readonly proposicaoAutorService: ProposicaoAutorService;
    private readonly proposicaoService: ProposicaoService;

    constructor(
        repositorio: DeputadoRepository, 
        proposicaoAutorService: ProposicaoAutorService,
        proposicaoService: ProposicaoService
    ) {
        this.repositorio = repositorio;
        this.proposicaoAutorService = proposicaoAutorService;
        this.proposicaoService = proposicaoService;
    }

    async findAll(): Promise<IDeputado[]> {
        return await this.repositorio.findAll();
    }

    async findProposicoes(idDeputado: number, page: number = 1, limit: number = 20) {
        const autores = await this.proposicaoAutorService.findByDeputadoId(idDeputado);
        const proposicaoIds = autores.map(a => a.idProposicao);
        
        return await this.proposicaoService.findByIdsWithPagination(proposicaoIds, page, limit);
    }
}