import { Router } from "express";
import { DeputadoController } from "@/controllers/deputado.controle";
import { DeputadoRepository } from "@/repositories/deputado.repository";
import { DeputadoService } from "@/services/deputado.service";

const router = Router();

const deputadoRepository = new DeputadoRepository();
const deputadoService = new DeputadoService(deputadoRepository);
const deputadoController = new DeputadoController(deputadoService);

router.get("/", deputadoController.findAll.bind(deputadoController));

export default router;