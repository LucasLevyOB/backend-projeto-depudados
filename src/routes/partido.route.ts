import { Router } from "express";
import { PartidoController } from "@/controllers/partido.controle";
import { PartidoRepository } from "@/repositories/partido.repository";
import { PartidoService } from "@/services/partido.service";

const router = Router();

const partidoRepository = new PartidoRepository();
const partidoService = new PartidoService(partidoRepository);
const partidoController = new PartidoController(partidoService);

router.get("/", partidoController.findAll.bind(partidoController));

export default router;
