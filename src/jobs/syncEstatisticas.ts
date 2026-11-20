import { criarServicos } from "@/jobs/container";
import { executarJob } from "@/jobs/runner";
import { parseArgs, resolverLegislatura } from "@/utils/cliArgs.util";

export const syncEstatisticas = async (idLegislatura: number): Promise<void> => {
    const { deputadoService } = criarServicos();

    console.log(`[syncEstatisticas] Iniciando sincronização de estatísticas dos deputados para a legislatura ${idLegislatura}...`);
    await deputadoService.syncAllEstatisticas(idLegislatura);
    console.log("[syncEstatisticas] Sincronização finalizada com sucesso!");
};

if (require.main === module) {
    executarJob("syncEstatisticas", () => syncEstatisticas(resolverLegislatura(parseArgs())));
}
