import { DeputadoRepository } from "@/repositories/deputado.repository";
import { ProposicaoAutorService } from "@/services/proposicaoAutor.service";
import { ProposicaoService } from "@/services/proposicao.service";
import { DespesaService } from "@/services/despesa.service";
import { VotoDeputadoService } from "@/services/votoDeputado.service";
import { VotacaoService } from "@/services/votacao.service";
import { calcularScoreEficiencia, calcularCustoPorProducao, agruparResumoProposicoes } from "@/utils/estatisticas.util";
import { IPagedResponse } from "@/types";
import { IDeputado } from "@/models/deputado.model";

export class DeputadoService {
    private readonly repositorio: DeputadoRepository;
    private readonly proposicaoAutorService: ProposicaoAutorService;
    private readonly proposicaoService: ProposicaoService;
    private readonly despesaService: DespesaService;
    private readonly votoDeputadoService: VotoDeputadoService;
    private readonly votacaoService: VotacaoService;

    constructor(
        repositorio: DeputadoRepository,
        proposicaoAutorService: ProposicaoAutorService,
        proposicaoService: ProposicaoService,
        despesaService: DespesaService,
        votoDeputadoService: VotoDeputadoService,
        votacaoService: VotacaoService
    ) {
        this.repositorio = repositorio;
        this.proposicaoAutorService = proposicaoAutorService;
        this.proposicaoService = proposicaoService;
        this.despesaService = despesaService;
        this.votoDeputadoService = votoDeputadoService;
        this.votacaoService = votacaoService;
    }

    async findAll(page: number = 1, limit: number = 20, uf?: string, siglaPartido?: string, nome?: string): Promise<IPagedResponse<IDeputado>> {
        return await this.repositorio.findAll(page, limit, uf, siglaPartido, nome);
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

            const proposicoes = await this.proposicaoService.findByIds(proposicaoIds);
            const scoreEficiencia = calcularScoreEficiencia(proposicoes, gastosDespesas);

            const custoPorPL = calcularCustoPorProducao(totalProjetos, gastosDespesas);
            const custoPorProposicaoGeral = calcularCustoPorProducao(totalProposicoes, gastosDespesas);

            const resumoGastos = await this.despesaService.getResumoGastosByDeputado(deputado._id);
            const resumoProposicoes = agruparResumoProposicoes(proposicoes);

            await this.repositorio.updateEstatisticas(deputado._id, {
                gastosDespesas: gastosDespesas,
                projetosDeLei: totalProjetos,
                totalProposicoes: totalProposicoes,
                scoreEficiencia: scoreEficiencia,
                custoPorProjetoLei: custoPorPL,
                custoPorProposicao: custoPorProposicaoGeral
            }, resumoGastos, resumoProposicoes);

            await this.syncTemasProposicoes(deputado._id, [139]);
        }
    }

    async findProposicoes(idDeputado: number, page: number = 1, limit: number = 20) {
        const autores = await this.proposicaoAutorService.findByDeputadoId(idDeputado);
        const proposicaoIds = autores.map(a => a.idProposicao);

        return await this.proposicaoService.findByIdsWithPagination(proposicaoIds, page, limit);
    }

    async findVotacoes(idDeputado: number, page: number = 1, limit: number = 20, ementa?: string) {
        let idVotacoesFiltradas: string[] | undefined = undefined;

        if (ementa) {
            const proposicoesEncontradas = await this.proposicaoService.findByEmenta(ementa);
            const idsProposicoes = proposicoesEncontradas.map(p => p.id);
            
            if (idsProposicoes.length === 0) {
                return {
                    data: [],
                    total: 0,
                    page,
                    limit,
                    totalPages: 0
                };
            }

            const votacoesEncontradas = await this.votacaoService.findByProposicoes(idsProposicoes);
            idVotacoesFiltradas = votacoesEncontradas.map(v => v.id);

            if (idVotacoesFiltradas.length === 0) {
                return {
                    data: [],
                    total: 0,
                    page,
                    limit,
                    totalPages: 0
                };
            }
        }

        const votosPaginados = await this.votoDeputadoService.findByDeputadoId(idDeputado, page, limit, idVotacoesFiltradas);

        const idVotacoes = [...new Set(votosPaginados.data.map(v => v.idVotacao))];
        const votacoes = await this.votacaoService.findByIds(idVotacoes);

        const idProposicoes = [...new Set(
            votacoes
                .map(v => v.ultimaApresentacaoProposicao?.idProposicao)
                .filter(id => id != null && id !== 0)
        )];
        const proposicoes = await this.proposicaoService.findByIds(idProposicoes);

        const dataEnriquecida = votosPaginados.data.map(voto => {
            const votacao = votacoes.find(v => v.id === voto.idVotacao);
            const proposicao = votacao?.ultimaApresentacaoProposicao?.idProposicao
                ? proposicoes.find(p => p.id === votacao.ultimaApresentacaoProposicao.idProposicao)
                : null;
            return {
                ...voto,
                votacao_: votacao || null,
                proposicao_: proposicao || null
            };
        });

        return {
            ...votosPaginados,
            data: dataEnriquecida
        };
    }

    async syncTemasProposicoes(idDeputado: number, codTiposPermitidos?: number[]): Promise<void> {
        const autores = await this.proposicaoAutorService.findByDeputadoId(idDeputado);
        const proposicaoIds = autores.map(a => a.idProposicao);
        let proposicoes = await this.proposicaoService.findByIds(proposicaoIds);

        if (codTiposPermitidos && codTiposPermitidos.length > 0) {
            proposicoes = proposicoes.filter(p => codTiposPermitidos.includes(p.codTipo));
        }

        const contagemTemas = new Map<string, number>();

        for (const proposicao of proposicoes) {
            if (!proposicao.temas || proposicao.temas.length === 0) continue;

            for (const tema of proposicao.temas) {
                contagemTemas.set(tema, (contagemTemas.get(tema) ?? 0) + 1);
            }
        }

        const temasProposicoes = Array.from(contagemTemas.entries())
            .map(([tema, quantidade]) => ({ tema, quantidade }))
            .sort((a, b) => b.quantidade - a.quantidade);

        await this.repositorio.updateTemasProposicoes(idDeputado, temasProposicoes);
    }
}