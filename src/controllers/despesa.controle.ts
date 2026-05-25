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
}
