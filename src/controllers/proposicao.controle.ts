import { Request, Response } from "express";
import { ProposicaoService } from "@/services/proposicao.service";

export class ProposicaoController {
    private readonly proposicaoService: ProposicaoService;

    constructor(proposicaoService: ProposicaoService) {
        this.proposicaoService = proposicaoService;
    }

    async findAll(req: Request, res: Response): Promise<void> {
        try {
            const proposicoes = await this.proposicaoService.findAll();
            res.json(proposicoes);
        } catch (error) {
            console.error("Erro ao listar proposições:", error);
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    async findByDeputado(req: Request, res: Response): Promise<void> {
        try {
            const idDeputado = Number(req.params.idDeputado);
            const page = req.query.page ? Number(req.query.page) : 1;
            const limit = req.query.limit ? Number(req.query.limit) : 20;
            const siglaTipo = req.query.siglaTipo as string | undefined;
            const ementa = req.query.ementa as string | undefined;
            const ano = req.query.ano ? Number(req.query.ano) : undefined;
            const legislatura = req.query.legislatura ? Number(req.query.legislatura) : undefined;

            if (isNaN(idDeputado)) {
                res.status(400).json({ error: "ID do deputado inválido" });
                return;
            }

            const response = await this.proposicaoService.findByDeputado(
                idDeputado,
                page,
                limit,
                siglaTipo,
                ementa,
                ano,
                legislatura
            );

            res.json(response);
        } catch (error) {
            console.error("Erro ao buscar proposições do deputado:", error);
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }
}
