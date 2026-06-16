import { Request, Response } from "express";
import { PartidoService } from "@/services/partido.service";

export class PartidoController {
    private readonly partidoService: PartidoService;

    constructor(partidoService: PartidoService) {
        this.partidoService = partidoService;
    }

    async findAll(req: Request, res: Response): Promise<void> {
        try {
            const partidos = await this.partidoService.findAll();
            res.json(partidos);
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar partidos" });
        }
    }
}
