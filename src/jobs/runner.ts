import mongoose from "mongoose";
import connectDB from "@/config/database";

/**
 * Ponto de entrada de linha de comando dos jobs: conecta, executa, desconecta e encerra o processo.
 * As funções dos jobs em si não conectam nem chamam `process.exit`, para poderem ser encadeadas pelo orquestrador.
 */
export const executarJob = (nome: string, job: () => Promise<void>): void => {
    const inicio = Date.now();

    connectDB()
        .then(job)
        .then(async () => {
            await mongoose.disconnect();
            console.log(`[${nome}] Concluído em ${((Date.now() - inicio) / 1000).toFixed(1)}s.`);
            process.exit(0);
        })
        .catch(erro => {
            console.error(`[${nome}] Erro durante a execução:`, erro);
            process.exit(1);
        });
};
