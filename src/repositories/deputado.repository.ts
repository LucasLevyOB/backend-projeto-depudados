import { Deputado, IDeputado } from "@/models/deputado.model";

export class DeputadoRepository {
    async findAll(page: number = 1, limit: number = 20): Promise<IDeputado[]> {
        const skip = (page - 1) * limit;
        return await Deputado
            .find()
            .select({ nome: 1, ufNascimento: 1, urlFoto: 1, _id: 1 })
            .where({ idLegislaturaFinal: 57 })
            .skip(skip)
            .limit(limit)
            .lean();
    }
}