import { Deputado, IDeputado } from "@/models/deputado.model";

export class DeputadoRepository {
    async findAll(page: number = 1, limit: number = 20): Promise<IDeputado[]> {
        const skip = (page - 1) * limit;
        return await Deputado
            .find()
            .select({ nome: 1, ufNascimento: 1, urlFoto: 1, _id: 1, estatisticas: 1 })
            .where({ idLegislaturaFinal: 57 })
            .sort({ 'estatisticas.scoreEficiencia': -1 })
            .skip(skip)
            .limit(limit)
            .lean();
    }

    async findAllSync(): Promise<IDeputado[]> {
        return await Deputado.find({ idLegislaturaFinal: 57 }).lean();
    }

    async updateEstatisticas(id: number, estatisticas: any): Promise<void> {
        await Deputado.updateOne({ _id: id }, { $set: { estatisticas } });
    }
}