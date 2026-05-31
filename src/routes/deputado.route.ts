import { Router } from "express";
import { DeputadoController } from "@/controllers/deputado.controle";
import { DeputadoRepository } from "@/repositories/deputado.repository";
import { DeputadoService } from "@/services/deputado.service";
import { ProposicaoAutorRepository } from "@/repositories/proposicaoAutor.repository";
import { ProposicaoAutorService } from "@/services/proposicaoAutor.service";
import { ProposicaoRepository } from "@/repositories/proposicao.repository";
import { ProposicaoService } from "@/services/proposicao.service";

const router = Router();

const deputadoRepository = new DeputadoRepository();
const proposicaoAutorRepository = new ProposicaoAutorRepository();
const proposicaoRepository = new ProposicaoRepository();

const proposicaoAutorService = new ProposicaoAutorService(proposicaoAutorRepository);
const proposicaoService = new ProposicaoService(proposicaoRepository);

const deputadoService = new DeputadoService(
    deputadoRepository, 
    proposicaoAutorService, 
    proposicaoService
);
const deputadoController = new DeputadoController(deputadoService);

router.get("/", deputadoController.findAll.bind(deputadoController));
router.get("/:id/proposicoes", deputadoController.findProposicoes.bind(deputadoController));

export default router;