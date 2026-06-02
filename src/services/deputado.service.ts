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
            const gastosDespesas = await this.despesaService.getGastosDespesasByDeputado(deputado._id);

            // Fazer um join entre os dois serviços para contar apenas Projetos de Lei (codTipo: 139)
            const proposicoesAutorias = await this.proposicaoAutorService.findByDeputadoId(deputado._id);
            const proposicaoIds = proposicoesAutorias.map(a => a.idProposicao);
            const totalProjetos = await this.proposicaoService.countByIdsAndTipo(proposicaoIds, 139);
            const totalProposicoes = proposicaoIds.length;

            return {
                ...deputado,
                gastos_despesas: gastosDespesas,
                projetos_de_lei: totalProjetos,
                total_proposicoes: totalProposicoes,
                eficiencia: totalProjetos / gastosDespesas,
                custo_por_proposicao: gastosDespesas / totalProposicoes
            };
        }));
    }

    async findProposicoes(idDeputado: number, page: number = 1, limit: number = 20) {
        const autores = await this.proposicaoAutorService.findByDeputadoId(idDeputado);
        const proposicaoIds = autores.map(a => a.idProposicao);

        return await this.proposicaoService.findByIdsWithPagination(proposicaoIds, page, limit);
    }
}