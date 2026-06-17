import { DespesaRepository } from "@/repositories/despesa.repository";
import { IDespesa } from "@/models/despesa.model";
import { IPagedResponse } from "@/types";

export class DespesaService {
  private readonly repositorio: DespesaRepository;

  constructor(repositorio: DespesaRepository) {
    this.repositorio = repositorio;
  }

  async findAll(): Promise<IDespesa[]> {
    return await this.repositorio.findAll();
  }

  async findByDeputado(
    idDeputado: number,
    page: number = 1,
    limit: number = 20,
    ano?: number,
    descricao?: string
  ): Promise<IPagedResponse<IDespesa>> {
    return await this.repositorio.findByDeputado(idDeputado, page, limit, ano, descricao);
  }

  async getGastosDespesasByDeputado(idDeputado: number): Promise<number> {
    return await this.repositorio.getGastosDespesasByDeputado(idDeputado);
  }

  async getResumoGastosByDeputado(idDeputado: number): Promise<any[]> {
    return await this.repositorio.getResumoGastosByDeputado(idDeputado);
  }
}
