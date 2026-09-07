import { Router } from "express";
import { VotacaoController } from "@/controllers/votacao.controle";
import { VotacaoRepository } from "@/repositories/votacao.repository";
import { VotacaoService } from "@/services/votacao.service";
import { VotoDeputadoRepository } from "@/repositories/votoDeputado.repository";
import { VotoDeputadoService } from "@/services/votoDeputado.service";
import { ProposicaoRepository } from "@/repositories/proposicao.repository";
import { ProposicaoService } from "@/services/proposicao.service";

const router = Router();

const votacaoRepository = new VotacaoRepository();
const votoDeputadoRepository = new VotoDeputadoRepository();
const proposicaoRepository = new ProposicaoRepository();

const votoDeputadoService = new VotoDeputadoService(votoDeputadoRepository);
const proposicaoService = new ProposicaoService(proposicaoRepository);
const votacaoService = new VotacaoService(votacaoRepository, votoDeputadoService, proposicaoService);

const votacaoController = new VotacaoController(votacaoService);

router.get("/comparar", votacaoController.comparar.bind(votacaoController));

export default router;
