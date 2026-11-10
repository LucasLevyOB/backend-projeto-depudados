import { Request, Response } from "express";
import { DeputadoService } from "@/services/deputado.service";

export class DeputadoController {
    private readonly deputadoService: DeputadoService;

    constructor(deputadoService: DeputadoService) {
        this.deputadoService = deputadoService;
    }

    async findAll(req: Request, res: Response): Promise<void> {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const uf = req.query.uf as string | undefined;
            const siglaPartido = req.query.siglaPartido as string | undefined;
            const nome = req.query.nome as string | undefined;
            const legislatura = req.query.legislatura ? Number(req.query.legislatura) : undefined;

            const deputados = await this.deputadoService.findAll(page, limit, uf, siglaPartido, nome, legislatura);
            res.json(deputados);
        } catch (error) {
            console.error("Erro ao listar deputados:", error);
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    async search(req: Request, res: Response): Promise<void> {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const uf = req.query.uf as string | undefined;
            const siglaPartido = req.query.siglaPartido as string | undefined;
            const nome = req.query.nome as string | undefined;
            const legislatura = req.query.legislatura ? Number(req.query.legislatura) : undefined;

            const deputados = await this.deputadoService.search(page, limit, nome, uf, siglaPartido, legislatura);
            res.json(deputados);
        } catch (error) {
            console.error("Erro na busca de deputados:", error);
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    async findProposicoes(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const legislatura = req.query.legislatura ? Number(req.query.legislatura) : undefined;

            if (isNaN(id)) {
                res.status(400).json({ error: "ID do deputado inválido" });
                return;
            }

            const proposicoes = await this.deputadoService.findProposicoes(id, page, limit, legislatura);
            res.json(proposicoes);
        } catch (error) {
            console.error("Erro ao buscar proposições do deputado:", error);
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    async findVotacoes(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const ementa = req.query.ementa as string | undefined;
            const legislatura = req.query.legislatura ? Number(req.query.legislatura) : undefined;

            if (isNaN(id)) {
                res.status(400).json({ error: "ID do deputado inválido" });
                return;
            }

            const votacoes = await this.deputadoService.findVotacoes(id, page, limit, ementa, legislatura);
            res.json(votacoes);
        } catch (error) {
            console.error("Erro ao buscar votações do deputado:", error);
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    async findById(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            const legislatura = req.query.legislatura ? Number(req.query.legislatura) : undefined;

            if (isNaN(id)) {
                res.status(400).json({ error: "ID do deputado inválido" });
                return;
            }

            const deputado = await this.deputadoService.findById(id, legislatura);
            res.json(deputado);
        } catch (error) {
            console.error("Erro ao buscar deputado por id:", error);
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }
}
