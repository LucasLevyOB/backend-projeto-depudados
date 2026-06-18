import { Proposicao, IProposicao } from "@/models/proposicao.model";
import { ProposicaoAutor } from "@/models/proposicaoAutor.model";
import { IPagedResponse } from "@/types";

export class ProposicaoRepository {
  async findAll(): Promise<IProposicao[]> {
    return await Proposicao.find();
  }

  async findByIdsWithPagination(
    ids: number[],
    page: number,
    limit: number,
  ): Promise<IProposicao[]> {
    const skip = (page - 1) * limit;
    return await Proposicao.find({ _id: { $in: ids } })
      .sort({ dataApresentacao: -1 })
      .skip(skip)
      .limit(limit);
  }

  async findByIds(ids: number[]): Promise<IProposicao[]> {
    return await Proposicao.find({ _id: { $in: ids } }).lean();
  }

  async countByIdsAndTipo(
    ids: number[],
    codTipo: number,
    periodo?: number[],
  ): Promise<number> {
    if (periodo) {
      return await Proposicao.countDocuments({
        _id: { $in: ids },
        codTipo,
        ano: { $in: periodo },
      });
    }
    return await Proposicao.countDocuments({ _id: { $in: ids }, codTipo });
  }

  async findByDeputado(
    idDeputado: number,
    page: number = 1,
    limit: number = 20,
    siglaTipo?: string,
    ementa?: string,
    ano?: number,
  ): Promise<IPagedResponse<IProposicao>> {
    const autores = await ProposicaoAutor.find({ idDeputadoAutor: idDeputado })
      .select("idProposicao")
      .lean();
    const idsProposicoes = autores.map((a) => a.idProposicao);

    let query: any = { id: { $in: idsProposicoes } };

    if (siglaTipo) {
      query.siglaTipo = siglaTipo;
    }

    if (ementa) {
      query.ementa = { $regex: ementa, $options: "i" };
    }

    if (ano) {
      query.$or = [
        { ano: ano },
        {
          $expr: {
            $eq: [
              {
                $substrCP: [
                  { $toString: { $ifNull: ["$dataApresentacao", "0000"] } },
                  0,
                  4,
                ],
              },
              ano.toString(),
            ],
          },
        },
        {
          $expr: {
            $eq: [
              {
                $substrCP: [
                  { $toString: { $ifNull: ["$ultimoStatus.data", "0000"] } },
                  0,
                  4,
                ],
              },
              ano.toString(),
            ],
          },
        },
      ];
    }

    const total = await Proposicao.countDocuments(query);
    const skip = (page - 1) * limit;

    const data = await Proposicao.find(query)
      .select({
        siglaTipo: 1,
        numero: 1,
        ano: 1,
        ementa: 1,
        dataApresentacao: 1,
        urlInteiroTeor: 1,
        _id: 0,
        id: 1,
      })
      .sort({ dataApresentacao: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      data: data,
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
