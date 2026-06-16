import Partido, { IPartido } from "@/models/partido.model";

export class PartidoRepository {
    async findAll(): Promise<IPartido[]> {
        return await Partido.find();
    }
}
