import { Request, Response } from "express";
import { DespesaService } from "@/services/despesa.service";

export class DespesaController {
    private readonly despesaService: DespesaService;

    constructor(despesaService: DespesaService) {
        this.despesaService = despesaService;
    }

    async findAll(req: Request, res: Response): Promise<void> {
        const despesas = await this.despesaService.findAll();
        res.json(despesas);
    }

    async findByDeputado(req: Request, res: Response): Promise<void> {
        const idDeputado = Number(req.params.idDeputado);
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;

        if (isNaN(idDeputado)) {
            res.status(400).json({ error: "Invalid idDeputado" });
            return;
        }

        const response = await this.despesaService.findByDeputado(idDeputado, page, limit);
        res.json(response);
    }
}
