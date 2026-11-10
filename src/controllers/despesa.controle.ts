import { Request, Response } from "express";
import { DespesaService } from "@/services/despesa.service";

export class DespesaController {
  private readonly despesaService: DespesaService;

  constructor(despesaService: DespesaService) {
    this.despesaService = despesaService;
  }

  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const despesas = await this.despesaService.findAll();
      res.json(despesas);
    } catch (error) {
      console.error("Erro ao listar despesas:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  async findByDeputado(req: Request, res: Response): Promise<void> {
    try {
      const idDeputado = Number(req.params.idDeputado);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const ano = Number(req.query.ano) || undefined;
      const descricao = req.query.descricao as string || undefined;
      const legislatura = req.query.legislatura ? Number(req.query.legislatura) : undefined;

      if (isNaN(idDeputado)) {
        res.status(400).json({ error: "ID do deputado inválido" });
        return;
      }

      const response = await this.despesaService.findByDeputado(
        idDeputado,
        page,
        limit,
        ano,
        descricao,
        legislatura
      );
      res.json(response);
    } catch (error) {
      console.error("Erro ao buscar despesas do deputado:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
}
