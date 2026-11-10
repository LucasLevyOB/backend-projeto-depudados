import { Deputado, IDeputado, IDeputadoResumo } from "@/models/deputado.model";
import { IPagedResponse } from "@/types";
import { regexFlexivel, LEGISLATURA_PADRAO, getAnosByLegislatura } from "@/utils";

export class DeputadoRepository {
    private formatQuery(uf?: string, siglaPartido?: string, nome?: string, idLegislatura: number = LEGISLATURA_PADRAO): any {
        const mandatoFilter: any = {
            idLegislatura,
            'ultimoStatus.situacao': 'Exercício',
        };
        if (uf) {
            mandatoFilter['ultimoStatus.siglaUf'] = uf;
        }
        if (siglaPartido) {
            mandatoFilter['ultimoStatus.siglaPartido'] = siglaPartido;
        }

        const condicoes: any[] = [
            { mandatos: { $elemMatch: mandatoFilter } }
        ];

        // Suporte retrocompatível caso os deputados ainda não tenham migrado para o array mandatos
        if (idLegislatura === LEGISLATURA_PADRAO) {
            const legacyFilter: any = {
                'ultimoStatus.situacao': 'Exercício',
                'ultimoStatus.idLegislatura': idLegislatura
            };
            if (uf) legacyFilter['ultimoStatus.siglaUf'] = uf;
            if (siglaPartido) legacyFilter['ultimoStatus.siglaPartido'] = siglaPartido;
            condicoes.push(legacyFilter);
        }

        const query: any = { $or: condicoes };

        if (nome) {
            query['nome'] = { $regex: regexFlexivel(nome), $options: 'i' };
        }
        return query;
    }

    async findAll(
        page: number = 1,
        limit: number = 20,
        uf?: string,
        siglaPartido?: string,
        nome?: string,
        idLegislatura: number = LEGISLATURA_PADRAO
    ): Promise<IPagedResponse<IDeputado>> {
        const skip = (page - 1) * limit;
        const query = this.formatQuery(uf, siglaPartido, nome, idLegislatura);

        const total = await Deputado.countDocuments(query);

        const docs = await Deputado
            .find(query)
            .select({
                nome: 1,
                urlFoto: 1,
                _id: 1,
                estatisticas: 1,
                ultimoStatus: 1,
                mandatos: 1
            })
            .sort(
                idLegislatura === LEGISLATURA_PADRAO
                    ? { 'estatisticas.scoreEficiencia': -1 }
                    : { 'mandatos.estatisticas.scoreEficiencia': -1 }
            )
            .skip(skip)
            .limit(limit)
            .lean();

        const data = docs.map(d => {
            const mandato = d.mandatos?.find(m => m.idLegislatura === idLegislatura);
            return {
                _id: d._id,
                nome: d.nome,
                urlFoto: d.urlFoto,
                estatisticas: mandato?.estatisticas ?? d.estatisticas,
                siglaPartido: mandato?.ultimoStatus?.siglaPartido ?? d.ultimoStatus?.siglaPartido,
                siglaUf: mandato?.ultimoStatus?.siglaUf ?? d.ultimoStatus?.siglaUf,
            } as unknown as IDeputado;
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async search(
        page: number = 1,
        limit: number = 20,
        nome?: string,
        uf?: string,
        siglaPartido?: string,
        idLegislatura: number = LEGISLATURA_PADRAO
    ): Promise<IPagedResponse<IDeputadoResumo>> {
        const skip = (page - 1) * limit;
        const query = this.formatQuery(uf, siglaPartido, nome, idLegislatura);

        const total = await Deputado.countDocuments(query);

        const docs = await Deputado
            .find(query)
            .select({
                _id: 1,
                nome: 1,
                urlFoto: 1,
                ultimoStatus: 1,
                mandatos: 1
            })
            .sort({ nome: 1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const data: IDeputadoResumo[] = docs.map(d => {
            const mandato = d.mandatos?.find(m => m.idLegislatura === idLegislatura);
            return {
                _id: d._id,
                nome: d.nome,
                urlFoto: d.urlFoto,
                siglaPartido: mandato?.ultimoStatus?.siglaPartido ?? d.ultimoStatus?.siglaPartido ?? "",
                siglaUf: mandato?.ultimoStatus?.siglaUf ?? d.ultimoStatus?.siglaUf ?? "",
            };
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async findAllSync(idLegislatura: number = LEGISLATURA_PADRAO): Promise<IDeputado[]> {
        return await Deputado.find({
            $or: [
                { "mandatos.idLegislatura": idLegislatura },
                { idLegislaturaFinal: idLegislatura },
                { "ultimoStatus.idLegislatura": idLegislatura }
            ]
        }).lean();
    }

    async updateEstatisticas(
        id: number,
        estatisticas: any,
        resumoGastos?: any,
        resumoProposicoes?: any,
        idLegislatura: number = LEGISLATURA_PADRAO
    ): Promise<void> {
        const resultadoMandato = await Deputado.updateOne(
            { _id: id, "mandatos.idLegislatura": idLegislatura },
            { $set: { "mandatos.$.estatisticas": estatisticas } }
        );

        if (resultadoMandato.matchedCount === 0) {
            await Deputado.updateOne(
                { _id: id },
                {
                    $push: {
                        mandatos: {
                            idLegislatura,
                            estatisticas,
                            ultimoStatus: {},
                            resumoPresencas: { totalSessoes: 0, presencas: 0, ausencias: 0, percentualPresenca: 0 }
                        }
                    }
                }
            );
        }

        const updateDocRaiz: any = {};
        if (idLegislatura === LEGISLATURA_PADRAO) {
            updateDocRaiz.estatisticas = estatisticas;
        }
        if (resumoGastos) {
            updateDocRaiz.resumoGastos = resumoGastos;
        }
        if (resumoProposicoes) {
            updateDocRaiz.resumoProposicoes = resumoProposicoes;
        }

        if (Object.keys(updateDocRaiz).length > 0) {
            await Deputado.updateOne({ _id: id }, { $set: updateDocRaiz });
        }
    }

    async updateTemasProposicoes(
        id: number,
        temasProposicoes: Array<{ tema: string; quantidade: number }>,
        idLegislatura: number = LEGISLATURA_PADRAO
    ): Promise<void> {
        await Deputado.updateOne(
            { _id: id, "mandatos.idLegislatura": idLegislatura },
            { $set: { "mandatos.$.estatisticas.temasProposicoes": temasProposicoes } }
        );

        if (idLegislatura === LEGISLATURA_PADRAO) {
            await Deputado.updateOne(
                { _id: id },
                { $set: { "estatisticas.temasProposicoes": temasProposicoes } }
            );
        }
    }

    async findById(id: number, idLegislatura: number = LEGISLATURA_PADRAO): Promise<any[]> {
        const deputado = await Deputado.findOne({ _id: id }).lean();
        if (!deputado) {
            return [];
        }

        const anosLegislatura = getAnosByLegislatura(idLegislatura);
        const mandato = deputado.mandatos?.find(m => m.idLegislatura === idLegislatura);

        const legislaturasDisponiveis = Array.from(new Set([
            ...(deputado.mandatos?.map(m => m.idLegislatura) ?? []),
            ...(deputado.ultimoStatus?.idLegislatura ? [deputado.ultimoStatus.idLegislatura] : [])
        ])).sort((a, b) => b - a);

        const resumoGastos = (deputado.resumoGastos ?? []).filter(g => anosLegislatura.includes(g.ano));
        const resumoProposicoes = (deputado.resumoProposicoes ?? []).filter(p => anosLegislatura.includes(p.ano));

        const item = {
            _id: deputado._id,
            nome: deputado.nome,
            urlFoto: deputado.urlFoto,
            siglaPartido: mandato?.ultimoStatus?.siglaPartido ?? deputado.ultimoStatus?.siglaPartido,
            siglaUf: mandato?.ultimoStatus?.siglaUf ?? deputado.ultimoStatus?.siglaUf,
            estatisticas: mandato?.estatisticas ?? deputado.estatisticas,
            resumoGastos,
            resumoProposicoes,
            escolaridade: deputado.escolaridade,
            situacao: mandato?.ultimoStatus?.situacao ?? deputado.ultimoStatus?.situacao,
            condicaoEleitoral: mandato?.ultimoStatus?.condicaoEleitoral ?? deputado.ultimoStatus?.condicaoEleitoral,
            nomeEleitoral: mandato?.ultimoStatus?.nomeEleitoral ?? deputado.ultimoStatus?.nomeEleitoral,
            descricaoStatus: mandato?.ultimoStatus?.descricaoStatus ?? deputado.ultimoStatus?.descricaoStatus,
            gabinete: mandato?.ultimoStatus?.gabinete ?? deputado.ultimoStatus?.gabinete,
            urlRedeSocial: deputado.urlRedeSocial,
            resumoPresencas: mandato?.resumoPresencas ?? deputado.resumoPresencas,
            legislaturasDisponiveis
        };

        return [item];
    }
}
