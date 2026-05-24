import { DeputadoRepository } from "@/repositories/deputado.repository";
import { IDeputado } from "@/models/deputado.model";

export class DeputadoService {
    private readonly repositorio: DeputadoRepository;

    constructor(repositorio: DeputadoRepository) {
        this.repositorio = repositorio;
    }

    async findAll(): Promise<IDeputado[]> {
        return await this.repositorio.findAll();
    }
}