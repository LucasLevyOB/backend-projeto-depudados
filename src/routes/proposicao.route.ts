import { Router } from "express";
import { ProposicaoController } from "@/controllers/proposicao.controle";
import { ProposicaoRepository } from "@/repositories/proposicao.repository";
import { ProposicaoService } from "@/services/proposicao.service";

const router = Router();

const proposicaoRepository = new ProposicaoRepository();
const proposicaoService = new ProposicaoService(proposicaoRepository);
const proposicaoController = new ProposicaoController(proposicaoService);

router.get("/", proposicaoController.findAll.bind(proposicaoController));
router.get("/deputado/:idDeputado", proposicaoController.findByDeputado.bind(proposicaoController));

export default router;
