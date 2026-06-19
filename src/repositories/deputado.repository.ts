import { Deputado, IDeputado } from "@/models/deputado.model";
import { IPagedResponse } from "@/types";
import { regexFlexivel } from "@/utils";

export class DeputadoRepository {
    private formatQuery(uf?: string, siglaPartido?: string, nome?: string): any {
        const query: any = { 'ultimoStatus.situacao': 'Exercício', 'ultimoStatus.idLegislatura': 57 };
        if (uf) {
            query['ultimoStatus.siglaUf'] = uf;
        }
        if (siglaPartido) {
            query['ultimoStatus.siglaPartido'] = siglaPartido;
        }
        if (nome) {
            console.log(regexFlexivel(nome))
            query['nome'] = { $regex: regexFlexivel(nome), $options: 'i' };
        }
        return query;
    }

    async findAll(page: number = 1, limit: number = 20, uf?: string, siglaPartido?: string, nome?: string): Promise<IPagedResponse<IDeputado>> {
        const skip = (page - 1) * limit;
        const query = this.formatQuery(uf, siglaPartido, nome);

        const total = await Deputado.countDocuments(query);

        const data = await Deputado
            .find()
            .select({ nome: 1, urlFoto: 1, _id: 1, estatisticas: 1, siglaPartido: '$ultimoStatus.siglaPartido', siglaUf: '$ultimoStatus.siglaUf' })
            .where(query)
            .sort({ 'estatisticas.scoreEficiencia': -1 })
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

    async findAllSync(): Promise<IDeputado[]> {
        return await Deputado.find({ idLegislaturaFinal: 57 }).lean();
    }

    async updateEstatisticas(id: number, estatisticas: any, resumoGastos?: any, resumoProposicoes?: any): Promise<void> {
        const updateDoc: any = { $set: { estatisticas } };
        if (resumoGastos) {
            updateDoc.$set.resumoGastos = resumoGastos;
        }
        if (resumoProposicoes) {
            updateDoc.$set.resumoProposicoes = resumoProposicoes;
        }
        await Deputado.updateOne({ _id: id }, updateDoc);
    }

    async findById(id: number): Promise<IDeputado[]> {
        return await Deputado
            .find({ _id: id })
            .select({
                _id: 1,
                nome: 1,
                urlFoto: 1,
                siglaPartido: '$ultimoStatus.siglaPartido',
                siglaUf: '$ultimoStatus.siglaUf',
                estatisticas: 1,
                resumoGastos: 1,
                resumoProposicoes: 1,
                escolaridade: 1,
                situacao: '$ultimoStatus.situacao',
                condicaoEleitoral: '$ultimoStatus.condicaoEleitoral',
                nomeEleitoral: '$ultimoStatus.nomeEleitoral',
                descricaoStatus: '$ultimoStatus.descricaoStatus',
                gabinete: '$ultimoStatus.gabinete',
                urlRedeSocial: 1,
            })
    }
}