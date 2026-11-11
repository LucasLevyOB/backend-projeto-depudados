import { DeputadoRepository } from "@/repositories/deputado.repository";
import { ClassificacaoTemaService } from "@/services/classificacaoTema.service";
import { ProposicaoService } from "@/services/proposicao.service";
import { DeputadoService } from "@/services/deputado.service";
import { criarServicos } from "@/jobs/container";
import { executarJob } from "@/jobs/runner";
import { parseArgs, resolverLegislatura } from "@/utils/cliArgs.util";
import { getAnosByLegislatura } from "@/utils/legislatura.util";

const LOTE_PROPOSICOES = Number(process.env.LOTE_PROPOSICOES ?? 50);
const COD_TIPO_PL = 139;

/**
 * Classifica via Ollama os PLs sem tema dos anos informados.
 * Falhas não são gravadas (ficam para a próxima execução) e são excluídas da busca nesta execução,
 * para o laço não pegar as mesmas proposições de novo. Se um lote inteiro falhar, o Ollama
 * provavelmente caiu e o job é interrompido.
 */
export const classificarProposicoes = async (
    proposicaoService: ProposicaoService,
    classificacaoService: ClassificacaoTemaService,
    anos: number[]
): Promise<void> => {
    const falhas: number[] = [];
    let totalClassificadas = 0;

    const proximoLote = () => proposicaoService.findSemTemas(LOTE_PROPOSICOES, COD_TIPO_PL, anos, falhas);
    let lote = await proximoLote();

    while (lote.length > 0) {
        console.log(`[syncTemas] Processando lote de ${lote.length} proposições concorrentemente...`);

        const resultados = await Promise.all(
            lote.map(proposicao =>
                classificacaoService
                    .classificar(proposicao.ementa ?? "", proposicao.keywords ?? "")
                    .then(temas => ({ id: proposicao._id, temas }))
            )
        );

        const sucessos = resultados.filter((r): r is { id: number; temas: string[] } => r.temas !== null);
        if (sucessos.length === 0) {
            throw new Error(`Todas as ${lote.length} classificações do lote falharam; verifique o Ollama. ${totalClassificadas} classificadas até aqui.`);
        }

        falhas.push(...resultados.filter(r => r.temas === null).map(r => r.id));
        await proposicaoService.atualizarTemasLote(sucessos);

        totalClassificadas += sucessos.length;
        console.log(`[syncTemas] ${totalClassificadas} proposições classificadas, ${falhas.length} falhas.`);

        lote = await proximoLote();
    }

    console.log(`[syncTemas] Classificação concluída: ${totalClassificadas} classificadas, ${falhas.length} falhas (serão tentadas na próxima execução).`);
};

/** Classifica os PLs sem tema dos anos da legislatura, conferindo antes se o Ollama está no ar. */
export const classificarTemas = async (idLegislatura: number): Promise<void> => {
    const anos = getAnosByLegislatura(idLegislatura);
    const classificacaoService = new ClassificacaoTemaService();
    await classificacaoService.verificarDisponibilidade();

    console.log(`[syncTemas] Classificando PLs sem tema de ${anos.join(", ")} via Ollama...`);
    await classificarProposicoes(criarServicos().proposicaoService, classificacaoService, anos);
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
        await deputadoService.syncTemasProposicoes(deputado._id, [COD_TIPO_PL], idLegislatura);
        totalAtualizados++;

        if (totalAtualizados % 50 === 0) {
            console.log(`[syncTemas] ${totalAtualizados}/${deputados.length} deputados atualizados.`);
        }
    }

    console.log(`[syncTemas] Agregação concluída. Total: ${totalAtualizados} deputados.`);
};

/** Classificação + agregação por deputado (o `syncEstatisticas` também agrega; o `sync:local` só classifica). */
export const syncTemas = async (idLegislatura: number): Promise<void> => {
    console.log(`[syncTemas] Executando para a legislatura ${idLegislatura}...`);
    await classificarTemas(idLegislatura);

    const { deputadoRepository, deputadoService } = criarServicos();
    await agregarTemasPorDeputado(deputadoService, deputadoRepository, idLegislatura);

    console.log("[syncTemas] Sincronização finalizada com sucesso!");
};

if (require.main === module) {
    executarJob("syncTemas", () => syncTemas(resolverLegislatura(parseArgs())));
}
