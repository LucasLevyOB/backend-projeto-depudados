import { Router } from "express";
import { DespesaController } from "@/controllers/despesa.controle";
import { DespesaRepository } from "@/repositories/despesa.repository";
import { DespesaService } from "@/services/despesa.service";

const router = Router();

const despesaRepository = new DespesaRepository();
const despesaService = new DespesaService(despesaRepository);
const despesaController = new DespesaController(despesaService);

router.get("/", despesaController.findAll.bind(despesaController));

export default router;
