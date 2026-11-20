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

/** Composição manual das dependências usadas pelos jobs (equivalente ao que as rotas fazem). */
export const criarServicos = () => {
    const deputadoRepository = new DeputadoRepository();
    const proposicaoService = new ProposicaoService(new ProposicaoRepository());

    const deputadoService = new DeputadoService(
        deputadoRepository,
        new ProposicaoAutorService(new ProposicaoAutorRepository()),
        proposicaoService,
        new DespesaService(new DespesaRepository()),
        new VotoDeputadoService(new VotoDeputadoRepository()),
        new VotacaoService(new VotacaoRepository())
    );

    return { deputadoRepository, deputadoService, proposicaoService };
};
