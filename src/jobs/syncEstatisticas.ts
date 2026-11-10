import { DeputadoRepository } from "@/repositories/deputado.repository";
import { ProposicaoAutorRepository } from "@/repositories/proposicaoAutor.repository";
import { ProposicaoRepository } from "@/repositories/proposicao.repository";
import { DespesaRepository } from "@/repositories/despesa.repository";
import { VotoDeputadoRepository } from "@/repositories/votoDeputado.repository";
import { VotacaoRepository } from "@/repositories/votacao.repository";
import { ProposicaoAutorService } from "@/services/proposicaoAutor.service";
import { ProposicaoService } from "@/services/proposicao.service";
import { DespesaService } from "@/services/despesa.service";
import { VotoDeputadoService } from "@/services/votoDeputado.service";
import { VotacaoService } from "@/services/votacao.service";
import { DeputadoService } from "@/services/deputado.service";
import connectDB from "@/config/database";
import { LEGISLATURA_PADRAO } from "@/utils/legislatura.util";

const getLegislaturaArg = (): number => {
    const arg = process.argv.find(a => a.startsWith('--legislatura='));
    if (arg) {
        const val = Number(arg.split('=')[1]);
        if (!isNaN(val)) return val;
    }
    return Number(process.env.LEGISLATURA_ATUAL ?? LEGISLATURA_PADRAO);
};

async function run() {
    const idLegislatura = getLegislaturaArg();
    console.log(`[syncEstatisticas] Executando para a legislatura ${idLegislatura}...`);

    console.log("Conectando ao MongoDB...");
    await connectDB();
    console.log("Conectado com sucesso.");

    const deputadoRepository = new DeputadoRepository();
    const proposicaoAutorRepository = new ProposicaoAutorRepository();
    const proposicaoRepository = new ProposicaoRepository();
    const despesaRepository = new DespesaRepository();
    const votoDeputadoRepository = new VotoDeputadoRepository();
    const votacaoRepository = new VotacaoRepository();

    const proposicaoAutorService = new ProposicaoAutorService(proposicaoAutorRepository);
    const proposicaoService = new ProposicaoService(proposicaoRepository);
    const despesaService = new DespesaService(despesaRepository);
    const votoDeputadoService = new VotoDeputadoService(votoDeputadoRepository);
    const votacaoService = new VotacaoService(votacaoRepository);

    const deputadoService = new DeputadoService(
        deputadoRepository,
        proposicaoAutorService,
        proposicaoService,
        despesaService,
        votoDeputadoService,
        votacaoService
    );

    console.log(`Iniciando sincronização de estatísticas dos deputados para a legislatura ${idLegislatura}...`);
    await deputadoService.syncAllEstatisticas(idLegislatura);

    console.log("Sincronização finalizada com sucesso!");
    process.exit(0);
}

run().catch(err => {
    console.error("Erro durante a sincronização:", err);
    process.exit(1);
});
