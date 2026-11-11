import { DeputadoRepository } from "@/repositories/deputado.repository";
import { ClassificacaoTemaService } from "@/services/classificacaoTema.service";
import { ProposicaoService } from "@/services/proposicao.service";
import { DeputadoService } from "@/services/deputado.service";
import { criarServicos } from "@/jobs/container";
import { executarJob } from "@/jobs/runner";
import { parseArgs, resolverLegislatura } from "@/utils/cliArgs.util";

const LOTE_PROPOSICOES = Number(process.env.LOTE_PROPOSICOES ?? 50);

export const classificarProposicoes = async (
    proposicaoService: ProposicaoService,
    classificacaoService: ClassificacaoTemaService
): Promise<void> => {
    let totalProcessadas = 0;
    let lote = await proposicaoService.findSemTemas(LOTE_PROPOSICOES, 139);

    while (lote.length > 0) {
        console.log(`[syncTemas] Processando lote de ${lote.length} proposições concorrentemente...`);

        const resultados = await Promise.all(
            lote.map(proposicao =>
                classificacaoService
                    .classificar(proposicao.ementa ?? "", proposicao.keywords ?? "")
                    .then(temas => ({ id: proposicao._id, temas }))
            )
        );
        await proposicaoService.atualizarTemasLote(resultados);

        totalProcessadas += lote.length;
        console.log(`[syncTemas] ${totalProcessadas} proposições classificadas.`);

        lote = await proposicaoService.findSemTemas(LOTE_PROPOSICOES, 139);
    }

    console.log(`[syncTemas] Classificação concluída. Total: ${totalProcessadas} proposições.`);
};

export const agregarTemasPorDeputado = async (
    deputadoService: DeputadoService,
    deputadoRepository: DeputadoRepository,
    idLegislatura: number
): Promise<void> => {
    const deputados = await deputadoRepository.findAllSync(idLegislatura);
    console.log(`[syncTemas] Agregando temas para ${deputados.length} deputados na legislatura ${idLegislatura}...`);

    let totalAtualizados = 0;

    for (const deputado of deputados) {
        await deputadoService.syncTemasProposicoes(deputado._id, [139], idLegislatura);
        totalAtualizados++;

        if (totalAtualizados % 50 === 0) {
            console.log(`[syncTemas] ${totalAtualizados}/${deputados.length} deputados atualizados.`);
        }
    }

    console.log(`[syncTemas] Agregação concluída. Total: ${totalAtualizados} deputados.`);
};

export const syncTemas = async (idLegislatura: number): Promise<void> => {
    console.log(`[syncTemas] Executando para a legislatura ${idLegislatura}...`);
    const { deputadoRepository, deputadoService, proposicaoService } = criarServicos();

    console.log("[syncTemas] Iniciando classificação de temas das proposições via Ollama...");
    await classificarProposicoes(proposicaoService, new ClassificacaoTemaService());

    console.log("[syncTemas] Iniciando agregação de temas por deputado...");
    await agregarTemasPorDeputado(deputadoService, deputadoRepository, idLegislatura);

    console.log("[syncTemas] Sincronização finalizada com sucesso!");
};

if (require.main === module) {
    executarJob("syncTemas", () => syncTemas(resolverLegislatura(parseArgs())));
}
