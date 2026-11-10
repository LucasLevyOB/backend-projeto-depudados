import { VotoDeputadoRepository } from "@/repositories/votoDeputado.repository";
import { IVotoDeputado } from "@/models/votoDeputado.model";
import { IPagedResponse } from "@/types/PagedResponse";

export class VotoDeputadoService {
    private readonly repositorio: VotoDeputadoRepository;

    constructor(repositorio: VotoDeputadoRepository) {
        this.repositorio = repositorio;
    }

    async findByDeputadoId(
        idDeputado: number | string,
        page: number = 1,
        limit: number = 20,
        idVotacoes?: string[],
        idLegislatura?: number
    ): Promise<IPagedResponse<IVotoDeputado>> {
        return await this.repositorio.findByDeputadoId(idDeputado, page, limit, idVotacoes, idLegislatura);
    }

    async findVotacoesIdsByDeputados(
        idsDeputados: (string | number)[],
        page: number = 1,
        limit: number = 10,
        idVotacoesFiltradas?: string[],
        idLegislatura?: number
    ): Promise<{ idVotacoes: string[]; total: number; totalPages: number }> {
        return await this.repositorio.findVotacoesIdsByDeputados(idsDeputados, page, limit, idVotacoesFiltradas, idLegislatura);
    }

    async findByDeputadosEVotacoes(
        idsDeputados: (string | number)[],
        idsVotacoes: string[]
    ): Promise<IVotoDeputado[]> {
        return await this.repositorio.findByDeputadosEVotacoes(idsDeputados, idsVotacoes);
    }
}
