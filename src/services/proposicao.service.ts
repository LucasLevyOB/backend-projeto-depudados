import { ProposicaoRepository } from "@/repositories/proposicao.repository";
import { IProposicao } from "@/models/proposicao.model";

export class ProposicaoService {
    private readonly repositorio: ProposicaoRepository;

    constructor(repositorio: ProposicaoRepository) {
        this.repositorio = repositorio;
    }

    async findAll(): Promise<IProposicao[]> {
        return await this.repositorio.findAll();
    }

    async findByIdsWithPagination(ids: number[], page: number, limit: number): Promise<IProposicao[]> {
        return await this.repositorio.findByIdsWithPagination(ids, page, limit);
    }

    async findByIds(ids: number[]): Promise<IProposicao[]> {
        return await this.repositorio.findByIds(ids);
    }

    async countByIdsAndTipo(ids: number[], codTipo: number, periodo?: number[]): Promise<number> {
        return await this.repositorio.countByIdsAndTipo(ids, codTipo, periodo);
    }

    async findByDeputado(idDeputado: number, page: number = 1, limit: number = 20, siglaTipo?: string, ementa?: string, ano?: number) {
        return await this.repositorio.findByDeputado(idDeputado, page, limit, siglaTipo, ementa, ano);
    }
}
