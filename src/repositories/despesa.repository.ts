import { Despesa, IDespesa } from "@/models/despesa.model";

export class DespesaRepository {
    async findAll(): Promise<IDespesa[]> {
        return await Despesa.find();
    }
}
