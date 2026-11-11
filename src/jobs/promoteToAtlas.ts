import mongoose from "mongoose";
import { conectarBanco } from "@/config/database";
import { executarJob } from "@/jobs/runner";
import { imprimirVerificacoes, validarLocal } from "@/jobs/validarLocal";
import { CATALOGO_PROMOCAO, NOMES_ALTERNATIVOS, PromocaoRepository } from "@/repositories/promocao.repository";
import { parseArgs } from "@/utils/cliArgs.util";
import { getLegislaturaByAno, LEGISLATURA_PADRAO } from "@/utils/legislatura.util";
import { garantirBancoLocal, mesmoBanco } from "@/utils/mongoUri.util";

export interface IOpcoesPromocao {
    /** Promove só os dados transacionais deste ano (partidos e deputados vão sempre inteiros). */
    ano?: number;
    /** Sem `apply`, apenas simula: mostra o que seria escrito. */
    apply: boolean;
}

const garantirUris = (): { uriAtlas: string } => {
    garantirBancoLocal(process.env.DATABASE_URL);
    const uriAtlas = process.env.DATABASE_URL_ATLAS;
    if (!uriAtlas) {
        throw new Error("DATABASE_URL_ATLAS não definido no .env.");
    }
    if (mesmoBanco(process.env.DATABASE_URL!, uriAtlas)) {
        throw new Error("DATABASE_URL e DATABASE_URL_ATLAS apontam para o mesmo banco.");
    }
    return { uriAtlas };
};

/**
 * Copia os dados já processados e validados do banco local para o Atlas, sem reprocessar IA nem scraping.
 * Bloqueia se a validação local tiver erros ou se o Atlas usar nomes de coleção diferentes dos models.
 */
export const promoverParaAtlas = async ({ ano, apply }: IOpcoesPromocao): Promise<void> => {
    const { uriAtlas } = garantirUris();
    const idLegislatura = ano ? getLegislaturaByAno(ano) : LEGISLATURA_PADRAO;

    console.log(`[promoteToAtlas] ${apply ? "APLICANDO" : "SIMULAÇÃO"}: ${ano ? `ano ${ano}` : "todos os anos"} (legislatura ${idLegislatura}).\n`);

    const verificacoes = await validarLocal(idLegislatura);
    imprimirVerificacoes(verificacoes);
    if (verificacoes.some(v => v.nivel === "ERRO")) {
        throw new Error("A validação local tem erros; a promoção foi bloqueada.");
    }

    const destino = await conectarBanco(uriAtlas);
    try {
        const repo = new PromocaoRepository(mongoose.connection, destino);
        const colecoesAtlas = await repo.colecoesDestino();

        const conflitos = CATALOGO_PROMOCAO
            .map(c => c.nome)
            .filter(nome => !colecoesAtlas.has(nome) && colecoesAtlas.has(NOMES_ALTERNATIVOS[nome] ?? ""));
        if (conflitos.length > 0) {
            throw new Error(
                `O Atlas tem ${conflitos.map(n => `"${NOMES_ALTERNATIVOS[n]}"`).join(", ")} mas não ${conflitos.map(n => `"${n}"`).join(", ")}, ` +
                "que é o nome usado pelos models. Promover criaria coleções novas que a API não lê do jeito esperado; resolva os nomes antes."
            );
        }

        const plano = await Promise.all(
            CATALOGO_PROMOCAO.map(async c => {
                const filtro = await c.filtro(mongoose.connection, ano);
                return { c, filtro, ...(await repo.contar(c, filtro)) };
            })
        );

        console.log("\nColeção                Local    Atlas (antes)  Ação");
        plano.forEach(({ c, origem, destino: noDestino }) =>
            console.log(`${c.nome.padEnd(20)} ${String(origem).padStart(8)} ${String(noDestino).padStart(14)}  ${c.substituirPorAno ? "substituir por ano" : "upsert por chave"}${colecoesAtlas.has(c.nome) ? "" : " (coleção nova no Atlas)"}`)
        );

        if (!apply) {
            console.log("\nSimulação: nada foi escrito. Para aplicar, rode novamente com --apply.");
            return;
        }

        for (const { c, filtro, origem } of plano) {
            const inicio = Date.now();
            await repo.criarIndices(c);
            const r = await repo.promover(c, filtro, n => {
                if (n % 20_000 === 0) console.log(`[promoteToAtlas] ${c.nome}: ${n}/${origem}`);
            });
            console.log(`[promoteToAtlas] ${c.nome}: ${r.inseridos} inseridos, ${r.substituidos} substituídos${r.removidos ? `, ${r.removidos} removidos antes` : ""} (${((Date.now() - inicio) / 1000).toFixed(1)}s).`);
        }

        console.log("\nConferência              Local    Atlas");
        for (const { c, filtro } of plano) {
            const { origem, destino: noDestino } = await repo.contar(c, filtro);
            const marca = noDestino >= origem ? "" : "  <-- Atlas com menos documentos que o local";
            console.log(`${c.nome.padEnd(20)} ${String(origem).padStart(8)} ${String(noDestino).padStart(8)}${marca}`);
        }
    } finally {
        await destino.close();
    }
};

if (require.main === module) {
    const args = parseArgs();
    try {
        // Antes de conectar a qualquer banco.
        garantirUris();
    } catch (erro) {
        console.error(`[promoteToAtlas] ${(erro as Error).message}`);
        process.exit(1);
    }
    executarJob("promoteToAtlas", () => promoverParaAtlas({ ano: args.ano, apply: args.apply }));
}
