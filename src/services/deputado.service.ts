import { DeputadoRepository } from "@/repositories/deputado.repository";
import { ProposicaoAutorService } from "@/services/proposicaoAutor.service";
import { ProposicaoService } from "@/services/proposicao.service";
import { DespesaService } from "@/services/despesa.service";
import { calcularScoreEficiencia, calcularCustoPorProducao, agruparResumoProposicoes } from "@/utils/estatisticas.util";
import { IPagedResponse } from "@/types";
import { IDeputado } from "@/models/deputado.model";

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

    async findAll(page: number = 1, limit: number = 20, uf?: string, siglaPartido?: string): Promise<IPagedResponse<IDeputado>> {
        return await this.repositorio.findAll(page, limit, uf, siglaPartido);
    }

    async findById(id: number): Promise<any> {
        return await this.repositorio.findById(id);
    }

    async syncAllEstatisticas(): Promise<void> {
        const deputados = await this.repositorio.findAllSync();

        for (const deputado of deputados) {
            const gastosDespesas = await this.despesaService.getGastosDespesasByDeputado(deputado._id);

            const proposicoesAutorias = await this.proposicaoAutorService.findByDeputadoId(deputado._id);
            const proposicaoIds = proposicoesAutorias.map(a => a.idProposicao);
            const totalProjetos = await this.proposicaoService.countByIdsAndTipo(proposicaoIds, 139);
            const totalProposicoes = proposicaoIds.length;

            const scoreEficiencia = calcularScoreEficiencia(totalProjetos, totalProposicoes, gastosDespesas);

            const custoPorPL = calcularCustoPorProducao(totalProjetos, gastosDespesas);
            const custoPorProposicaoGeral = calcularCustoPorProducao(totalProposicoes, gastosDespesas);

            const resumoGastos = await this.despesaService.getResumoGastosByDeputado(deputado._id);

            const proposicoes = await this.proposicaoService.findByIds(proposicaoIds);
            const resumoProposicoes = agruparResumoProposicoes(proposicoes);

            await this.repositorio.updateEstatisticas(deputado._id, {
                gastosDespesas: gastosDespesas,
                projetosDeLei: totalProjetos,
                totalProposicoes: totalProposicoes,
                scoreEficiencia: scoreEficiencia,
                custoPorProjetoLei: custoPorPL,
                custoPorProposicao: custoPorProposicaoGeral
            }, resumoGastos, resumoProposicoes);
        }
    }

    async findProposicoes(idDeputado: number, page: number = 1, limit: number = 20) {
        const autores = await this.proposicaoAutorService.findByDeputadoId(idDeputado);
        const proposicaoIds = autores.map(a => a.idProposicao);

        return await this.proposicaoService.findByIdsWithPagination(proposicaoIds, page, limit);
    }
}