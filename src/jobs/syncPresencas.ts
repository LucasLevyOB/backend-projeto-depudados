import { executarJob } from "@/jobs/runner";
import { IngestaoRepository } from "@/repositories/ingestao.repository";
import { IOpcoesCache, lerDados } from "@/utils/cacheDownloader.util";
import { parseArgs, resolverLegislatura } from "@/utils/cliArgs.util";
import { dataBrasilia } from "@/utils/data.util";
import { obterEventosEPresencas } from "@/utils/fontesCamara.util";
import { getAnosByLegislatura, getPeriodoDatasByLegislatura, LEGISLATURA_PADRAO } from "@/utils/legislatura.util";
import { calcularResumoPresencas } from "@/utils/presencas.util";

interface IEventoArquivo {
    id: number;
    dataHoraInicio: string;
    situacao: string;
    descricaoTipo: string;
}

interface IPresencaArquivo {
    idEvento: number;
    idDeputado: number;
}

const ehSessaoDeliberativaValida = (e: IEventoArquivo): boolean =>
    e.situacao !== "Cancelada" && e.descricaoTipo === "Sessão Deliberativa";

/**
 * Consolida as presenças em sessões deliberativas do Plenário para cada deputado com mandato na legislatura.
 * Lê do cache `anos/{ano}/eventos.json` e `presencas.json` (baixando o que faltar) para cada ano já iniciado.
 */
export const syncPresencas = async (idLegislatura: number, opcoes: IOpcoesCache = {}): Promise<void> => {
    const { inicio, fim } = getPeriodoDatasByLegislatura(idLegislatura);
    const anos = getAnosByLegislatura(idLegislatura).filter(ano => ano <= new Date().getFullYear());
    console.log(`[syncPresencas] Legislatura ${idLegislatura} (${inicio.toISOString().slice(0, 10)} até ${fim.toISOString().slice(0, 10)}), anos ${anos.join(", ")}.`);

    const arquivos = await Promise.all(anos.map(ano => obterEventosEPresencas(ano, opcoes)));

    // 1. Sessões válidas dentro do período da legislatura
    const sessoes = new Map<number, Date>();
    for (const { eventos } of arquivos) {
        if (!eventos) continue;
        (await lerDados<IEventoArquivo>(eventos))
            .filter(ehSessaoDeliberativaValida)
            .forEach(e => {
                const data = dataBrasilia(e.dataHoraInicio);
                if (e.id && data && data >= inicio && data <= fim) sessoes.set(e.id, data);
            });
    }
    console.log(`[syncPresencas] ${sessoes.size} sessões deliberativas válidas.`);

    // 2. Presenças por deputado nessas sessões
    const presencasPorDeputado = new Map<number, number>();
    for (const { presencas } of arquivos) {
        if (!presencas) continue;
        (await lerDados<IPresencaArquivo>(presencas))
            .filter(p => sessoes.has(p.idEvento))
            .forEach(p => presencasPorDeputado.set(p.idDeputado, (presencasPorDeputado.get(p.idDeputado) ?? 0) + 1));
    }
    console.log(`[syncPresencas] Presenças contabilizadas para ${presencasPorDeputado.size} deputados.`);

    // 3. Só deputados que já têm o mandato (criado pelo syncCadastros). Antes, o job criava mandatos
    // para todos os deputados do banco, e quem não era da legislatura aparecia nela como "Exercício".
    const repo = new IngestaoRepository();
    const deputados = await repo.listarDeputadosComMandato(idLegislatura);
    const datasSessoes = [...sessoes.values()];

    const resultado = await repo.atualizarResumoPresencas(
        idLegislatura,
        deputados.map(d => ({
            idDeputado: d._id,
            resumoPresencas: calcularResumoPresencas(d.statusMandato, datasSessoes, presencasPorDeputado.get(d._id) ?? 0),
        })),
        idLegislatura === LEGISLATURA_PADRAO
    );

    console.log(`[syncPresencas] ${deputados.length} deputados com mandato ${idLegislatura}, ${resultado.atualizados} atualizados.`);
};

if (require.main === module) {
    const args = parseArgs();
    executarJob("syncPresencas", () => syncPresencas(resolverLegislatura(args), { force: args.forceDownload }));
}
