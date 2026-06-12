import fs from "fs/promises";
import path from "path";
import { Deputado } from "@/models/deputado.model";
import connectDB from "@/config/database";

async function run() {
    console.log("Conectando ao MongoDB...");
    await connectDB();
    console.log("Conectado com sucesso.");

    console.log("Lendo o arquivo JSON...");
    const jsonPath = path.resolve(__dirname, "../../../web-scraping/projeto-depudados.deputados-detalhados.json");

    let fileContent;
    try {
        fileContent = await fs.readFile(jsonPath, "utf8");
    } catch (err) {
        console.error("Não foi possível ler o arquivo JSON em:", jsonPath);
        console.error(err);
        process.exit(1);
    }

    const deputadosDetalhados = JSON.parse(fileContent);
    console.log(`Encontrados ${deputadosDetalhados.length} deputados no arquivo.`);

    console.log("Iniciando sincronização (bulkWrite) no MongoDB...");

    // Cria as operações de atualização em lote para o Mongoose
    const bulkOps = deputadosDetalhados.map((deputado: any) => {
        return {
            updateOne: {
                filter: { _id: deputado.id },
                update: {
                    $set: {
                        cpf: deputado.cpf,
                        escolaridade: deputado.escolaridade,
                        ultimoStatus: deputado.ultimoStatus
                    }
                }
            }
        };
    });

    try {
        const result = await Deputado.bulkWrite(bulkOps);
        console.log("Sincronização concluída com sucesso!");
        console.log(`Documentos encontrados/modificados: ${result.matchedCount} / ${result.modifiedCount}`);
    } catch (err) {
        console.error("Erro durante o bulkWrite:", err);
    }

    process.exit(0);
}

run().catch(err => {
    console.error("Erro inesperado:", err);
    process.exit(1);
});
