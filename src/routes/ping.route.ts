import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({
        status: "ok",
        db: mongoose.connection.readyState === 1 ? "conectado" : "conectando",
        uptime: Math.round(process.uptime()),
    });
});

export default router;
