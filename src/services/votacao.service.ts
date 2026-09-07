import { VotacaoRepository } from "@/repositories/votacao.repository";
import { IVotacao } from "@/models/votacao.model";
import { VotoDeputadoService } from "@/services/votoDeputado.service";
import { ProposicaoService } from "@/services/proposicao.service";
import { IPagedResponse } from "@/types/PagedResponse";
import { IProposicao } from "@/models/proposicao.model";

export interface VotacaoComparadaItem {
    idVotacao: string;
    idProposicao?: number;
    siglaNumeroAno: string;
    tituloResumo: string;
    ementaCompleta?: string;
    dataHoraVotacao?: Date | string;
    votoDeputado1?: string | null;
    votoDeputado2?: string | null;
}

export class VotacaoService {
    private readonly repositorio: VotacaoRepository;
    private readonly votoDeputadoService?: VotoDeputadoService;
    private readonly proposicaoService?: ProposicaoService;

    constructor(
        repositorio: VotacaoRepository,
        votoDeputadoService?: VotoDeputadoService,
        proposicaoService?: ProposicaoService
    ) {
        this.repositorio = repositorio;
        this.votoDeputadoService = votoDeputadoService;
        this.proposicaoService = proposicaoService;
    }

    async findByIds(ids: string[]): Promise<IVotacao[]> {
        return await this.repositorio.findByIds(ids);
    }

    async findByProposicoes(idsProposicao: number[]): Promise<IVotacao[]> {
        return await this.repositorio.findByProposicoes(idsProposicao);
    }

    async compararVotacoes(
        idDeputado1?: string | number,
        idDeputado2?: string | number,
        page: number = 1,
        limit: number = 10,
        ementa?: string
    ): Promise<IPagedResponse<VotacaoComparadaItem>> {
        if (!this.votoDeputadoService) {
            throw new Error("VotoDeputadoService não injetado no VotacaoService");
        }

        const idsDeputados: string[] = [];
        if (idDeputado1 != null && idDeputado1 !== "") {
            idsDeputados.push(idDeputado1.toString());
        }
        if (idDeputado2 != null && idDeputado2 !== "") {
            idsDeputados.push(idDeputado2.toString());
        }

        if (idsDeputados.length === 0) {
            return {
                data: [],
                total: 0,
                page,
                limit,
                totalPages: 0
            };
        }

        let idVotacoesFiltradas: string[] | undefined = undefined;

        if (ementa && ementa.trim() !== "" && this.proposicaoService) {
            const proposicoesEncontradas = await this.proposicaoService.findByEmenta(ementa.trim());
            const idsProposicoes: number[] = [];
            for (const prop of proposicoesEncontradas) {
                idsProposicoes.push(prop.id);
            }

            if (idsProposicoes.length === 0) {
                return {
                    data: [],
                    total: 0,
                    page,
                    limit,
                    totalPages: 0
                };
            }

            const votacoesEncontradas = await this.findByProposicoes(idsProposicoes);
            idVotacoesFiltradas = [];
            for (const vot of votacoesEncontradas) {
                idVotacoesFiltradas.push(vot.id);
            }

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

        const { idVotacoes, total, totalPages } = await this.votoDeputadoService.findVotacoesIdsByDeputados(
            idsDeputados,
            page,
            limit,
            idVotacoesFiltradas
        );

        if (idVotacoes.length === 0) {
            return {
                data: [],
                total: 0,
                page,
                limit,
                totalPages: 0
            };
        }

        const [votacoes, votos] = await Promise.all([
            this.findByIds(idVotacoes),
            this.votoDeputadoService.findByDeputadosEVotacoes(idsDeputados, idVotacoes)
        ]);

        const idsProposicoesParaBuscar: number[] = [];
        for (const v of votacoes) {
            const idPropAcessoria = v.ultimaApresentacaoProposicao?.idProposicao;
            if (idPropAcessoria && idPropAcessoria > 0 && !idsProposicoesParaBuscar.includes(idPropAcessoria)) {
                idsProposicoesParaBuscar.push(idPropAcessoria);
            }

            const prefixoId = v.id ? Number(v.id.split("-")[0]) : 0;
            if (prefixoId && !isNaN(prefixoId) && prefixoId > 0 && !idsProposicoesParaBuscar.includes(prefixoId)) {
                idsProposicoesParaBuscar.push(prefixoId);
            }
        }

        let proposicoes: IProposicao[] = [];
        if (this.proposicaoService && idsProposicoesParaBuscar.length > 0) {
            proposicoes = await this.proposicaoService.findByIds(idsProposicoesParaBuscar);
        }

        const mapaVotacoes = new Map<string, IVotacao>();
        for (const vot of votacoes) {
            mapaVotacoes.set(vot.id, vot);
        }

        const mapaProposicoes = new Map<number, IProposicao>();
        for (const prop of proposicoes) {
            mapaProposicoes.set(prop.id, prop);
        }

        const mapaVotos = new Map<string, string>();
        for (const voto of votos) {
            mapaVotos.set(`${voto.idVotacao}_${voto.deputado_.id}`, voto.voto);
        }

        const data: VotacaoComparadaItem[] = [];
        for (const idVotacao of idVotacoes) {
            const votacao = mapaVotacoes.get(idVotacao);
            const prefixoId = idVotacao ? Number(idVotacao.split("-")[0]) : 0;
            const idPropAcessoria = votacao?.ultimaApresentacaoProposicao?.idProposicao;

            // Prioriza a proposição principal (ex: PL 41/2026), senão tenta a acessória
            const propPrincipal = prefixoId && mapaProposicoes.has(prefixoId) ? mapaProposicoes.get(prefixoId) : null;
            const propAcessoria = idPropAcessoria && mapaProposicoes.has(idPropAcessoria) ? mapaProposicoes.get(idPropAcessoria) : null;
            const proposicao = propPrincipal || propAcessoria;

            const idProposicaoFinal = proposicao?.id || (prefixoId > 0 ? prefixoId : idPropAcessoria);

            const strDep1 = idDeputado1 != null && idDeputado1 !== "" ? idDeputado1.toString() : null;
            const strDep2 = idDeputado2 != null && idDeputado2 !== "" ? idDeputado2.toString() : null;

            const voto1 = strDep1 ? mapaVotos.get(`${idVotacao}_${strDep1}`) ?? null : null;
            const voto2 = strDep2 ? mapaVotos.get(`${idVotacao}_${strDep2}`) ?? null : null;

            let siglaNumeroAno = "Votação";
            if (proposicao && proposicao.siglaTipo && proposicao.numero) {
                siglaNumeroAno = `${proposicao.siglaTipo} ${proposicao.numero}/${proposicao.ano}`;
            } else if (votacao?.descricao) {
                // Tenta extrair padrões comuns na descrição como "Projeto de Lei nº 996, de 2015"
                const matchPl = votacao.descricao.match(/(Projeto de Lei(?: Complementar)?|Proposta de Emenda à Constituição|Medida Provisória|Requerimento)[^\d]*(\d+)[^\d]+(\d{4})/i);
                if (matchPl) {
                    const tipoDesc = matchPl[1].toLowerCase();
                    let sigla = "PL";
                    if (tipoDesc.includes("complementar")) sigla = "PLP";
                    else if (tipoDesc.includes("emenda")) sigla = "PEC";
                    else if (tipoDesc.includes("provisória") || tipoDesc.includes("provisoria")) sigla = "MPV";
                    else if (tipoDesc.includes("requerimento")) sigla = "REQ";
                    siglaNumeroAno = `${sigla} ${matchPl[2]}/${matchPl[3]}`;
                } else if (votacao.siglaOrgao) {
                    siglaNumeroAno = `${votacao.siglaOrgao} - Votação`;
                }
            } else if (votacao?.siglaOrgao) {
                siglaNumeroAno = `${votacao.siglaOrgao} - Votação`;
            }

            const tituloResumo = proposicao?.ementa
                ? (proposicao.ementa.length > 130 ? `${proposicao.ementa.slice(0, 127)}...` : proposicao.ementa)
                : (votacao?.descricao ?? "Votação sem descrição");

            const ementaCompleta = proposicao?.ementa ?? votacao?.descricao ?? undefined;

            data.push({
                idVotacao,
                idProposicao: idProposicaoFinal && idProposicaoFinal > 0 ? idProposicaoFinal : undefined,
                siglaNumeroAno,
                tituloResumo,
                ementaCompleta,
                dataHoraVotacao: votacao?.dataHoraRegistro ?? votacao?.data,
                votoDeputado1: voto1,
                votoDeputado2: voto2
            });
        }

        return {
            data,
            total,
            page,
            limit,
            totalPages
        };
    }
}
