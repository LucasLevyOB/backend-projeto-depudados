import { DeputadoRepository } from "@/repositories/deputado.repository";
import { IDeputado } from "@/models/deputado.model";
import { ProposicaoAutorService } from "@/services/proposicaoAutor.service";
import { ProposicaoService } from "@/services/proposicao.service";
import { DespesaService } from "@/services/despesa.service";

export class DeputadoService {
    private readonly repositorio: DeputadoRepository;
    private readonly proposicaoAutorService: ProposicaoAutorService;
    private readonly proposicaoService: ProposicaoService;
    private readonly despesaService: DespesaService;

    constructor(
        repositorio: DeputadoRepository,
        proposicaoAutorService: ProposicaoAutorService,
        proposicaoService: ProposicaoService,
        despesaService: DespesaService
    ) {
        this.repositorio = repositorio;
        this.proposicaoAutorService = proposicaoAutorService;
        this.proposicaoService = proposicaoService;
        this.despesaService = despesaService;
    }

    async findAll(page: number = 1, limit: number = 20): Promise<any[]> {
        const deputados = await this.repositorio.findAll(page, limit);

        return Promise.all(deputados.map(async (deputado) => {
            const totalGastos = await this.despesaService.getTotalGastosByDeputado(deputado._id);
            const totalProjetos = await this.proposicaoAutorService.countProjetosByDeputadoId(deputado._id);

            return {
                ...deputado,
                totalGastos,
                totalProjetos
            };
        }));
    }

    async findProposicoes(idDeputado: number, page: number = 1, limit: number = 20) {
        const autores = await this.proposicaoAutorService.findByDeputadoId(idDeputado);
        const proposicaoIds = autores.map(a => a.idProposicao);

        return await this.proposicaoService.findByIdsWithPagination(proposicaoIds, page, limit);
    }
}