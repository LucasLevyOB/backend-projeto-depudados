import { DeputadoRepository } from "@/repositories/deputado.repository";
import { ProposicaoAutorRepository } from "@/repositories/proposicaoAutor.repository";
import { ProposicaoRepository } from "@/repositories/proposicao.repository";
import { DespesaRepository } from "@/repositories/despesa.repository";
import { ClassificacaoTemaService } from "@/services/classificacaoTema.service";
import { ProposicaoAutorService } from "@/services/proposicaoAutor.service";
import { ProposicaoService } from "@/services/proposicao.service";
import { DespesaService } from "@/services/despesa.service";
import { DeputadoService } from "@/services/deputado.service";
import connectDB from "@/config/database";

const LOTE_PROPOSICOES = Number(process.env.LOTE_PROPOSICOES ?? 50);

const classificarProposicoes = async (
    proposicaoService: ProposicaoService,
    classificacaoService: ClassificacaoTemaService
): Promise<void> => {
    let totalProcessadas = 0;
    let lote = await proposicaoService.findSemTemas(LOTE_PROPOSICOES, 139);

    while (lote.length > 0) {
        console.log(`[syncTemas] Processando lote de ${lote.length} proposições concorrentemente...`);

        const promessasClassificacao = [];
        for (const proposicao of lote) {
            const promessa = classificacaoService.classificar(
                proposicao.ementa ?? "",
                proposicao.keywords ?? ""
            ).then((temas) => ({ id: proposicao._id, temas }));
            promessasClassificacao.push(promessa);
        }

        const resultados = await Promise.all(promessasClassificacao);
        await proposicaoService.atualizarTemasLote(resultados);

        totalProcessadas += lote.length;
        console.log(`[syncTemas] ${totalProcessadas} proposições classificadas.`);

        lote = await proposicaoService.findSemTemas(LOTE_PROPOSICOES, 139);
    }

    console.log(`[syncTemas] Classificação concluída. Total: ${totalProcessadas} proposições.`);
};

const agregarTemasPorDeputado = async (deputadoService: DeputadoService, deputadoRepository: DeputadoRepository): Promise<void> => {
    const deputados = await deputadoRepository.findAllSync();
    console.log(`[syncTemas] Agregando temas para ${deputados.length} deputados...`);

    let totalAtualizados = 0;

    for (const deputado of deputados) {
        await deputadoService.syncTemasProposicoes(deputado._id, [139]);
        totalAtualizados++;

        if (totalAtualizados % 50 === 0) {
            console.log(`[syncTemas] ${totalAtualizados}/${deputados.length} deputados atualizados.`);
        }
    }

    console.log(`[syncTemas] Agregação concluída. Total: ${totalAtualizados} deputados.`);
};

async function run() {
    console.log("[syncTemas] Conectando ao MongoDB...");
    await connectDB();
    console.log("[syncTemas] Conectado com sucesso.");

    const deputadoRepository = new DeputadoRepository();
    const proposicaoAutorRepository = new ProposicaoAutorRepository();
    const proposicaoRepository = new ProposicaoRepository();
    const despesaRepository = new DespesaRepository();

    const classificacaoService = new ClassificacaoTemaService();
    const proposicaoAutorService = new ProposicaoAutorService(proposicaoAutorRepository);
    const proposicaoService = new ProposicaoService(proposicaoRepository);
    const despesaService = new DespesaService(despesaRepository);

    const deputadoService = new DeputadoService(
        deputadoRepository,
        proposicaoAutorService,
        proposicaoService,
        despesaService
    );

    console.log("[syncTemas] Iniciando classificação de temas das proposições via Ollama...");
    await classificarProposicoes(proposicaoService, classificacaoService);

    console.log("[syncTemas] Iniciando agregação de temas por deputado...");
    await agregarTemasPorDeputado(deputadoService, deputadoRepository);

    console.log("[syncTemas] Sincronização de temas concluída com sucesso!");
    process.exit(0);
}

run().catch(err => {
    console.error("[syncTemas] Erro durante a sincronização:", err);
    process.exit(1);
});
