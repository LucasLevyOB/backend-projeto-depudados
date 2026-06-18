import { Request, Response } from "express";
import { ProposicaoService } from "@/services/proposicao.service";

export class ProposicaoController {
    private readonly proposicaoService: ProposicaoService;

    constructor(proposicaoService: ProposicaoService) {
        this.proposicaoService = proposicaoService;
    }

    async findAll(req: Request, res: Response): Promise<void> {
        const proposicoes = await this.proposicaoService.findAll();
        res.json(proposicoes);
    }

    async findByDeputado(req: Request, res: Response): Promise<void> {
        try {
            const idDeputado = Number(req.params.idDeputado);
            const page = req.query.page ? Number(req.query.page) : 1;
            const limit = req.query.limit ? Number(req.query.limit) : 20;
            const siglaTipo = req.query.siglaTipo as string | undefined;
            const ementa = req.query.ementa as string | undefined;
            const ano = req.query.ano ? Number(req.query.ano) : undefined;

            const response = await this.proposicaoService.findByDeputado(
                idDeputado,
                page,
                limit,
                siglaTipo,
                ementa,
                ano
            );

            res.json(response);
        } catch (error) {
            console.error("Error finding proposicoes by deputado:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
}
