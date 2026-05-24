import { Request, Response } from "express";
import { DeputadoService } from "@/services/deputado.service";

export class DeputadoController {
    private readonly deputadoService: DeputadoService;

    constructor(deputadoService: DeputadoService) {
        this.deputadoService = deputadoService;
    }

    async findAll(req: Request, res: Response): Promise<void> {
        const deputados = await this.deputadoService.findAll();
        res.json(deputados);
    }
}