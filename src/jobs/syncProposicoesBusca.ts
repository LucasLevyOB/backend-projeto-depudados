import fs from "fs/promises";
import path from "path";
import { Proposicao } from "@/models/proposicao.model";
import connectDB from "@/config/database";

const getTemaPortalOuAutomatico = (prop: any) => {
    if (prop.temaAutomatico && prop.temaAutomatico.length > 0) {
        return prop.temaAutomatico.map((t: any) => t.tema);
    }
    if (prop.temaPortal && prop.temaPortal.length > 0) {
        return prop.temaPortal;
    }
    return [];
};

async function run() {
    console.log("Conectando ao MongoDB...");
    await connectDB();
    console.log("Conectado com sucesso.");

    console.log("Lendo o arquivo JSON...");
    const jsonPath = path.resolve(__dirname, "../../../web-scraping/projeto-depudados.proposicoes-busca.json");

    let fileContent;
    try {
        fileContent = await fs.readFile(jsonPath, "utf8");
    } catch (err) {
        console.error("Não foi possível ler o arquivo JSON em:", jsonPath);
        process.exit(1);
    }

    const deputados = JSON.parse(fileContent);
    console.log(`Encontrados dados de ${deputados.length} deputados no arquivo.`);

    // Achatamento e deduplicação
    const proposicoesMap = new Map();

    for (let i = 0; i < deputados.length; i++) {
        const deputado = deputados[i];
        if (!deputado.proposicoes) continue;

        for (let j = 0; j < deputado.proposicoes.length; j++) {
            const prop = deputado.proposicoes[j];
            // Usando ID como chave para deduplicar caso existam autores repetidos no mesmo projeto
            if (!proposicoesMap.has(prop.id)) {
                proposicoesMap.set(prop.id, prop);
            }
        }
    }

    const proposicoesUnicas = Array.from(proposicoesMap.values());
    console.log(`Foram extraídas ${proposicoesUnicas.length} proposições únicas.`);

    console.log("Iniciando sincronização (bulkWrite) no MongoDB...");

    // Cria as operações de upsert em lote para o Mongoose
    const bulkOps = proposicoesUnicas.map((prop: any) => {
        return {
            updateOne: {
                filter: { _id: prop.id },
                update: {
                    $set: {
                        id: prop.id,
                        numero: prop.numero,
                        ano: prop.ano,
                        ementa: prop.ementa,
                        siglaTipo: prop.siglaProposicao || "PL",
                        codTipo: prop.codTipoProposicao || 139,
                        keywords: prop.indexacao || "",
                        titulo: prop.titulo || "",
                        temas: getTemaPortalOuAutomatico(prop),
                        situacaoAtualBusca: prop.situacaoAtual || prop.situacaoProposicao || "",
                        estados: prop.estados || [],
                        dataApresentacao: prop.dataApresentacao ? new Date(prop.dataApresentacao) : undefined,
                        dataDaUltimaTramitacao: prop.dataDaUltimaTramitacao ? new Date(prop.dataDaUltimaTramitacao) : undefined,
                        dataDaUltimaMovimentacao: prop.dataDaUltimaMovimentacao ? new Date(prop.dataDaUltimaMovimentacao) : undefined,
                        dataOrdenacao: prop.dataOrdenacao ? new Date(prop.dataOrdenacao) : undefined,
                        autores: prop.autores || [],
                        txtRegime: prop.txtRegime || "",
                        txtApreciacao: prop.txtApreciacao || "",
                        linkVideo: prop.linkVideo || "",
                        explicacaoEmenta: prop.explicacaoEmenta || "",
                        comissaoPreponderante: prop.comissaoPreponderante || "",
                        qtdeDeTramitacoes: prop.qtdeDeTramitacoes || 0,
                        tipoSituacaoProposicao: prop.tipoSituacaoProposicao || "",
                        resultadoItens: prop['resultado-itens'] || [],
                        codProposicaoApensadaPai: prop.codProposicaoApensadaPai || null
                    },
                    $setOnInsert: {
                        _id: prop.id
                    }
                },
                upsert: true
            }
        };
    });

    try {
        const result = await Proposicao.bulkWrite(bulkOps);
        console.log("Sincronização concluída com sucesso!");
        console.log(`Documentos correspondidos (matched): ${result.matchedCount}`);
        console.log(`Documentos modificados (modified): ${result.modifiedCount}`);
        console.log(`Documentos inseridos novos (upserted): ${result.upsertedCount}`);
    } catch (err) {
        console.error("Erro durante o bulkWrite:", err);
    }

    process.exit(0);
}

run().catch(err => {
    console.error("Erro inesperado:", err);
    process.exit(1);
});
