import { DeputadoRepository } from "@/repositories/deputado.repository";
import { ProposicaoAutorRepository } from "@/repositories/proposicaoAutor.repository";
import { ProposicaoRepository } from "@/repositories/proposicao.repository";
import { DespesaRepository } from "@/repositories/despesa.repository";
import { ProposicaoAutorService } from "@/services/proposicaoAutor.service";
import { ProposicaoService } from "@/services/proposicao.service";
import { DespesaService } from "@/services/despesa.service";
import { DeputadoService } from "@/services/deputado.service";
import connectDB from "@/config/database";

async function run() {
    console.log("Conectando ao MongoDB...");
    await connectDB();
    console.log("Conectado com sucesso.");

    const deputadoRepository = new DeputadoRepository();
    const proposicaoAutorRepository = new ProposicaoAutorRepository();
    const proposicaoRepository = new ProposicaoRepository();
    const despesaRepository = new DespesaRepository();

    const proposicaoAutorService = new ProposicaoAutorService(proposicaoAutorRepository);
    const proposicaoService = new ProposicaoService(proposicaoRepository);
    const despesaService = new DespesaService(despesaRepository);

    const deputadoService = new DeputadoService(
        deputadoRepository,
        proposicaoAutorService,
        proposicaoService,
        despesaService
    );

    console.log("Iniciando sincronização de estatísticas dos deputados...");
    await deputadoService.syncAllEstatisticas();

    console.log("Sincronização finalizada com sucesso!");
    process.exit(0);
}

run().catch(err => {
    console.error("Erro durante a sincronização:", err);
    process.exit(1);
});
