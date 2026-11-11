import { executarJob } from "@/jobs/runner";
import { syncCadastros } from "@/jobs/syncCadastros";
import { syncDadosAnuais } from "@/jobs/syncDadosAnuais";
import { syncEstatisticas } from "@/jobs/syncEstatisticas";
import { syncPresencas } from "@/jobs/syncPresencas";
import { syncProposicoesBusca } from "@/jobs/syncProposicoesBusca";
import { classificarTemas } from "@/jobs/syncTemas";
import { parseArgs, resolverAno } from "@/utils/cliArgs.util";
import { getLegislaturaByAno } from "@/utils/legislatura.util";
import { garantirBancoLocal } from "@/utils/mongoUri.util";

const ETAPAS = ["cadastros", "anual", "busca", "presencas", "temas", "estatisticas"] as const;
type Etapa = typeof ETAPAS[number];

export interface IOpcoesSyncAll {
    force?: boolean;
    skip?: string[];
}

const validarSkip = (skip: string[]): Etapa[] => {
    const invalidas = skip.filter(s => !(ETAPAS as readonly string[]).includes(s));
    if (invalidas.length > 0) {
        throw new Error(`Etapa(s) desconhecida(s) em --skip: ${invalidas.join(", ")}. Válidas: ${ETAPAS.join(", ")}.`);
    }
    return skip as Etapa[];
};

/**
 * Pipeline completo de um ano no banco local:
 * cadastros → dados anuais → busca do portal → presenças → temas (Ollama) → estatísticas.
 * Para na primeira falha; as etapas já concluídas podem ser puladas na próxima execução com `--skip`.
 */
export const syncAll = async (ano: number, opcoes: IOpcoesSyncAll = {}): Promise<void> => {
    garantirBancoLocal(process.env.DATABASE_URL);
    const pular = validarSkip(opcoes.skip ?? []);
    const idLegislatura = getLegislaturaByAno(ano);
    const force = opcoes.force ?? false;

    const etapas: Record<Etapa, () => Promise<void>> = {
        cadastros: () => syncCadastros(idLegislatura, { force }),
        anual: () => syncDadosAnuais(ano, { force }),
        busca: () => syncProposicoesBusca(ano, { force }),
        // Sem `force`: os arquivos do ano já foram atualizados na etapa "anual"; os outros anos vêm do cache.
        presencas: () => syncPresencas(idLegislatura),
        temas: () => classificarTemas(idLegislatura),
        // Também agrega os temas por deputado.
        estatisticas: () => syncEstatisticas(idLegislatura),
    };

    console.log(`[syncAll] Ano ${ano}, legislatura ${idLegislatura}${force ? ", forçando downloads" : ""}${pular.length ? `, pulando: ${pular.join(", ")}` : ""}.`);
    const tempos: string[] = [];

    for (const etapa of ETAPAS) {
        if (pular.includes(etapa)) {
            tempos.push(`${etapa}: pulada`);
            continue;
        }

        console.log(`\n[syncAll] ===== ${etapa} =====`);
        const inicio = Date.now();
        try {
            await etapas[etapa]();
        } catch (erro) {
            const concluidas = ETAPAS.slice(0, ETAPAS.indexOf(etapa)).filter(e => !pular.includes(e));
            const dica = concluidas.length ? ` Para retomar: --skip=${[...pular, ...concluidas].join(",")}` : "";
            const motivo = (erro as Error).message.replace(/\.$/, "");
            throw new Error(`Etapa "${etapa}" falhou: ${motivo}.${dica}`);
        }
        tempos.push(`${etapa}: ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
    }

    console.log(`\n[syncAll] Concluído. ${tempos.join(" | ")}`);
};

if (require.main === module) {
    const args = parseArgs();
    try {
        // Antes de conectar: nem abrir conexão com um banco remoto.
        garantirBancoLocal(process.env.DATABASE_URL);
        validarSkip(args.skip);
    } catch (erro) {
        console.error(`[syncAll] ${(erro as Error).message}`);
        process.exit(1);
    }
    executarJob("syncAll", () => syncAll(resolverAno(args), { force: args.forceDownload, skip: args.skip }));
}
