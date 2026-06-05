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

    private readonly PESO_PL = 10;
    private readonly PESO_PROPOSICAO = 1;
    /**
     * Fator de escala para o cálculo do score de eficiência (100 mil reais)
     */
    private readonly FATOR_ESCALA = 100000;

    /**
     * Calcula o score de eficiência do deputado
     * @param totalProjetos Total de projetos de lei do deputado
     * @param totalProposicoes Total de proposições do deputado
     * @param totalGastos Total de gastos do deputado
     * @returns Score de eficiência do deputado
     */
    private calcularScore(totalProjetos: number, totalProposicoes: number, totalGastos: number): number {
        const outrasProposicoes = totalProposicoes - totalProjetos;
        const producaoPonderada = (totalProjetos * this.PESO_PL) + (outrasProposicoes * this.PESO_PROPOSICAO);
        const salarios = 41 * 46000;
        const gastosValidos = totalGastos > 0 ? totalGastos + salarios : salarios;

        return Math.round((producaoPonderada / gastosValidos) * this.FATOR_ESCALA);
    }

    /**
     * Calcula o custo por produção
     * @param total Total de produção
     * @param gastos Total de gastos
     * @returns Custo por produção
     */
    private calcularCustoPor(total: number, gastos: number) {
        return total > 0 ? (gastos / total) : null;
    }

    async findAll(page: number = 1, limit: number = 20): Promise<any[]> {
        return await this.repositorio.findAll(page, limit);
    }

    async syncAllEstatisticas(): Promise<void> {
        const deputados = await this.repositorio.findAllSync();

        for (const deputado of deputados) {
            const gastosDespesas = await this.despesaService.getGastosDespesasByDeputado(deputado._id);

            const proposicoesAutorias = await this.proposicaoAutorService.findByDeputadoId(deputado._id);
            const proposicaoIds = proposicoesAutorias.map(a => a.idProposicao);
            const totalProjetos = await this.proposicaoService.countByIdsAndTipo(proposicaoIds, 139);
            const totalProposicoes = proposicaoIds.length;

            const scoreEficiencia = this.calcularScore(totalProjetos, totalProposicoes, gastosDespesas);

            const custoPorPL = this.calcularCustoPor(totalProjetos, gastosDespesas);
            const custoPorProposicaoGeral = this.calcularCustoPor(totalProposicoes, gastosDespesas);

            await this.repositorio.updateEstatisticas(deputado._id, {
                gastosDespesas: gastosDespesas,
                projetosDeLei: totalProjetos,
                totalProposicoes: totalProposicoes,
                scoreEficiencia: scoreEficiencia,
                custoPorProjetoLei: custoPorPL,
                custoPorProposicao: custoPorProposicaoGeral
            });
        }
    }

    async findProposicoes(idDeputado: number, page: number = 1, limit: number = 20) {
        const autores = await this.proposicaoAutorService.findByDeputadoId(idDeputado);
        const proposicaoIds = autores.map(a => a.idProposicao);

        return await this.proposicaoService.findByIdsWithPagination(proposicaoIds, page, limit);
    }
}