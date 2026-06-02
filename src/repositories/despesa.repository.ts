import { Despesa, IDespesa } from "@/models/despesa.model";

export class DespesaRepository {
    async findAll(): Promise<IDespesa[]> {
        return await Despesa.find();
    }

    async getGastosDespesasByDeputado(idDeputado: number): Promise<number> {
        const despesas = await Despesa.find({ idDeputado: idDeputado }).select('valorLiquido').lean();
        return despesas.reduce((total, d) => {
            if (!d.valorLiquido) return total;
            const valor = parseFloat(d.valorLiquido.toString().replace(',', '.'));
            return total + (isNaN(valor) ? 0 : valor);
        }, 0);
    }
}
