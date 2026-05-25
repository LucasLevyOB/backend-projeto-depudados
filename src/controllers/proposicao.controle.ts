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
}
