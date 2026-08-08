import { Router } from "express";
import { DeputadoController } from "@/controllers/deputado.controle";
import { DeputadoRepository } from "@/repositories/deputado.repository";
import { DeputadoService } from "@/services/deputado.service";
import { ProposicaoAutorRepository } from "@/repositories/proposicaoAutor.repository";
import { ProposicaoAutorService } from "@/services/proposicaoAutor.service";
import { ProposicaoRepository } from "@/repositories/proposicao.repository";
import { ProposicaoService } from "@/services/proposicao.service";
import { DespesaRepository } from "@/repositories/despesa.repository";
import { DespesaService } from "@/services/despesa.service";
import { VotoDeputadoRepository } from "@/repositories/votoDeputado.repository";
import { VotoDeputadoService } from "@/services/votoDeputado.service";
import { VotacaoRepository } from "@/repositories/votacao.repository";
import { VotacaoService } from "@/services/votacao.service";
const router = Router();

const deputadoRepository = new DeputadoRepository();
const proposicaoAutorRepository = new ProposicaoAutorRepository();
const proposicaoRepository = new ProposicaoRepository();
const despesaRepository = new DespesaRepository();
const votoDeputadoRepository = new VotoDeputadoRepository();
const votacaoRepository = new VotacaoRepository();
const proposicaoAutorService = new ProposicaoAutorService(proposicaoAutorRepository);
const proposicaoService = new ProposicaoService(proposicaoRepository);
const despesaService = new DespesaService(despesaRepository);
const votoDeputadoService = new VotoDeputadoService(votoDeputadoRepository);
const votacaoService = new VotacaoService(votacaoRepository);
const deputadoService = new DeputadoService(
    deputadoRepository,
    proposicaoAutorService,
    proposicaoService,
    despesaService,
    votoDeputadoService,
    votacaoService
);
const deputadoController = new DeputadoController(deputadoService);

router.get("/", deputadoController.findAll.bind(deputadoController));
router.get("/:id", deputadoController.findById.bind(deputadoController));
router.get("/:id/proposicoes", deputadoController.findProposicoes.bind(deputadoController));
router.get("/:id/votacoes", deputadoController.findVotacoes.bind(deputadoController));

export default router;