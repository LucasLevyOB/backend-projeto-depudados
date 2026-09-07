import { Request, Response } from "express";
import { VotacaoService } from "@/services/votacao.service";

export class VotacaoController {
    private readonly votacaoService: VotacaoService;

    constructor(votacaoService: VotacaoService) {
        this.votacaoService = votacaoService;
    }

    async comparar(req: Request, res: Response): Promise<void> {
        try {
            const deputado1 = req.query.deputado1 as string | undefined;
            const deputado2 = req.query.deputado2 as string | undefined;
            const page = req.query.page ? Number(req.query.page) : 1;
            const limit = req.query.limit ? Number(req.query.limit) : 10;
            const ementa = req.query.ementa as string | undefined;

            if (!deputado1 && !deputado2) {
                res.status(400).json({ error: "É necessário informar ao menos um deputado (deputado1 ou deputado2)" });
                return;
            }

            const resultado = await this.votacaoService.compararVotacoes(
                deputado1,
                deputado2,
                page,
                limit,
                ementa
            );

            res.json(resultado);
        } catch (error) {
            console.error("Erro ao comparar votações de deputados:", error);
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }
}
