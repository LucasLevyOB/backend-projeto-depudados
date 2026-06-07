import { Request, Response } from "express";
import { DeputadoService } from "@/services/deputado.service";

export class DeputadoController {
    private readonly deputadoService: DeputadoService;

    constructor(deputadoService: DeputadoService) {
        this.deputadoService = deputadoService;
    }

    async findAll(req: Request, res: Response): Promise<void> {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;

        const deputados = await this.deputadoService.findAll(page, limit);
        res.json(deputados);
    }

    async findProposicoes(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;

            if (isNaN(id)) {
                res.status(400).json({ error: "ID do deputado inválido" });
                return;
            }

            const proposicoes = await this.deputadoService.findProposicoes(id, page, limit);
            res.json(proposicoes);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    async findById(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({ error: "ID do deputado inválido" });
                return;
            }

            const proposicoes = await this.deputadoService.findById(id);
            res.json(proposicoes);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }
}