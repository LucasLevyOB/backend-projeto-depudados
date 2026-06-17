import { Despesa, IDespesa } from "@/models/despesa.model";
import { IPagedResponse } from "@/types";

export class DespesaRepository {
    async findAll(): Promise<IDespesa[]> {
        return await Despesa.find();
    }

    async findByDeputado(idDeputado: number, page: number = 1, limit: number = 20): Promise<IPagedResponse<IDespesa>> {
        const skip = (page - 1) * limit;
        const total = await Despesa.countDocuments({ idDeputado });

        const data = await Despesa
            .find({ idDeputado })
            .select({ descricao: 1, valorLiquido: 1, fornecedor: 1, dataEmissao: 1, descricaoEspecificacao: 1, _id: 0 })
            .sort({ dataEmissao: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return {
            data: data,
            total: total,
            page: page,
            limit: limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async getGastosDespesasByDeputado(idDeputado: number): Promise<number> {
        const despesas = await Despesa.find({ idDeputado: idDeputado }).select('valorLiquido').lean();
        return despesas.reduce((total, d) => {
            if (!d.valorLiquido) return total;
            const valor = parseFloat(d.valorLiquido.toString().replace(',', '.'));
            return total + (isNaN(valor) ? 0 : valor);
        }, 0);
    }

    async getResumoGastosByDeputado(idDeputado: number): Promise<any[]> {
        const despesas = await Despesa.find({ idDeputado: idDeputado }).select('ano mes valorLiquido').lean();

        const mapaAnos = new Map<number, { ano: number; totalGastos: number; mesesMap: Map<number, number> }>();

        for (const d of despesas) {
            if (!d.valorLiquido || !d.ano || !d.mes) continue;
            const valor = parseFloat(d.valorLiquido.toString().replace(',', '.'));
            const valorNumerico = isNaN(valor) ? 0 : valor;

            if (!mapaAnos.has(d.ano)) {
                mapaAnos.set(d.ano, { ano: d.ano, totalGastos: 0, mesesMap: new Map<number, number>() });
            }

            const anoData = mapaAnos.get(d.ano)!;
            anoData.totalGastos += valorNumerico;

            const mesAtual = anoData.mesesMap.get(d.mes) || 0;
            anoData.mesesMap.set(d.mes, mesAtual + valorNumerico);
        }

        return Array.from(mapaAnos.values()).map(anoData => {
            const mesesArray = Array.from(anoData.mesesMap.entries()).map(([mes, totalGasto]) => ({
                mes,
                totalGasto: Number(totalGasto.toFixed(2))
            })).sort((a, b) => a.mes - b.mes);

            return {
                ano: anoData.ano,
                totalGastos: Number(anoData.totalGastos.toFixed(2)),
                meses: mesesArray
            };
        }).sort((a, b) => b.ano - a.ano);
    }
}
