import { DespesaRepository } from "@/repositories/despesa.repository";
import { IDespesa } from "@/models/despesa.model";

export class DespesaService {
    private readonly repositorio: DespesaRepository;

    constructor(repositorio: DespesaRepository) {
        this.repositorio = repositorio;
    }

    async findAll(): Promise<IDespesa[]> {
        return await this.repositorio.findAll();
    }

    async getTotalGastosByDeputado(idDeputado: number): Promise<number> {
        return await this.repositorio.getTotalGastosByDeputado(idDeputado);
    }
}
