import { Deputado, IDeputado } from "@/models/deputado.model";

export class DeputadoRepository {
    async findAll(): Promise<IDeputado[]> {
        return await Deputado.find();
    }
}