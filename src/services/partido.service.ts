import { PartidoRepository } from "@/repositories/partido.repository";
import { IPartido } from "@/models/partido.model";

export class PartidoService {
    private readonly repositorio: PartidoRepository;

    constructor(repositorio: PartidoRepository) {
        this.repositorio = repositorio;
    }

    async findAll(): Promise<IPartido[]> {
        return await this.repositorio.findAll();
    }
}
