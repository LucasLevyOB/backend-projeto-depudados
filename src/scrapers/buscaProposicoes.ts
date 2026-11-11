import fs from "fs/promises";
import { caminhoAno } from "@/config/paths";
import { existe, gravarJson, IOpcoesCache, lerJson } from "@/utils/cacheDownloader.util";
import { atrasar, fetchJson, mapComConcorrencia } from "@/utils/http.util";
import { BUSCA_PORTAL_CAMARA } from "@/utils/fontesCamara.util";

/**
 * Port do antigo `fetchDetalhesDeputados/fetchProposicoesBusca.js`.
 * Consulta a busca do portal da Câmara (dados que não existem nos arquivos abertos: temas do portal,
 * situação, tramitações, apensação) por autor e ano, só PLs.
 */

const CONCORRENCIA = 2;
const ATRASO_ENTRE_PAGINAS_MS = 300;
const SALVAR_PROGRESSO_A_CADA = 20;

export interface IAutorBusca {
    ideCadastro?: number;
    nome: string;
    tipoAutor: string;
    siglaPartido?: string;
    siglaUF?: string;
}

/** Subconjunto usado de `_source` da busca do portal (o documento tem dezenas de outros campos). */
export interface IProposicaoBusca {
    id: number;
    numero: number;
    ano: number;
    ementa: string;
    siglaProposicao?: string;
    codTipoProposicao?: number;
    indexacao?: string;
    titulo?: string;
    temaAutomatico?: Array<{ tema: string; ordem: number; probabilidade: number }>;
    temaPortal?: string[];
    situacaoAtual?: string;
    situacaoProposicao?: string;
    estados?: object[];
    dataApresentacao?: string;
    dataDaUltimaTramitacao?: string;
    dataDaUltimaMovimentacao?: string;
    dataOrdenacao?: string;
    autores?: IAutorBusca[];
    txtRegime?: string;
    txtApreciacao?: string;
    linkVideo?: string;
    explicacaoEmenta?: string;
    comissaoPreponderante?: string;
    qtdeDeTramitacoes?: number;
    tipoSituacaoProposicao?: string;
    "resultado-itens"?: object[];
    codProposicaoApensadaPai?: number | null;
}

interface IRespostaBusca {
    hits: {
        total: { value: number };
        hits: Array<{ _source: IProposicaoBusca }>;
    };
}

export interface IDeputadoBusca {
    _id: number;
    nome: string;
}

type Progresso = Record<string, IProposicaoBusca[]>;

const buscarPagina = async (nomeAutor: string, ano: number, pagina: number): Promise<IRespostaBusca> =>
    fetchJson<IRespostaBusca>(BUSCA_PORTAL_CAMARA, {
        init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                // "relevancia" com q="*" não é estável entre páginas: repete itens e pula outros
                // (Amom Mandel, 2026: 565 PLs, só 405 únicos). Ordenar por data traz todos.
                order: "data",
                pagina,
                q: "*",
                ano: String(ano),
                autores_nome: nomeAutor,
                tiposDeProposicao: "PL",
            }),
        },
    });

/**
 * Todas as páginas de PLs do deputado no ano. A busca é por nome, que pode casar com homônimos
 * ou nomes parecidos, então só ficam as proposições em que o `ideCadastro` do autor é o do deputado.
 */
export const buscarProposicoesDoDeputado = async (deputado: IDeputadoBusca, ano: number): Promise<IProposicaoBusca[]> => {
    const encontradas: IProposicaoBusca[] = [];
    let total = 0;

    for (let pagina = 1; ; pagina++) {
        const { hits } = await buscarPagina(deputado.nome, ano, pagina);
        total = hits.total.value;
        encontradas.push(...hits.hits.map(h => h._source));
        if (hits.hits.length === 0 || encontradas.length >= total) break;
        await atrasar(ATRASO_ENTRE_PAGINAS_MS);
    }

    const unicas = [...new Map(encontradas.map(p => [p.id, p])).values()];
    if (unicas.length < total) {
        console.warn(`[buscaProposicoes] ${deputado.nome} (${ano}): portal informou ${total}, vieram ${unicas.length} únicos.`);
    }

    return unicas.filter(p => p.autores?.some(a => a.ideCadastro === deputado._id));
};

const lerProgresso = async (caminho: string, force: boolean): Promise<Progresso> => {
    if (force) return {};
    return lerJson<Progresso>(caminho).catch(() => ({}));
};

/**
 * Executa a busca para todos os deputados e grava `anos/{ano}/proposicoes-busca.json`
 * (lista única, sem repetição de proposições com vários autores).
 * O progresso parcial é salvo periodicamente: se a execução cair, a próxima retoma de onde parou.
 */
export const rasparBuscaProposicoes = async (
    ano: number,
    deputados: IDeputadoBusca[],
    opcoes: IOpcoesCache = {}
): Promise<IProposicaoBusca[]> => {
    const destino = caminhoAno(ano, "proposicoes-busca.json");
    if (!opcoes.force && await existe(destino)) {
        console.log(`[cache] Reutilizando ${destino}`);
        return lerJson<IProposicaoBusca[]>(destino);
    }

    const caminhoProgresso = caminhoAno(ano, "proposicoes-busca.parcial.json");
    const progresso = await lerProgresso(caminhoProgresso, opcoes.force ?? false);
    const pendentes = deputados.filter(d => !(String(d._id) in progresso));

    console.log(`[buscaProposicoes] ${ano}: ${deputados.length - pendentes.length} deputados já no progresso, ${pendentes.length} pendentes.`);

    // Gravações em série, para duas tarefas concorrentes não disputarem o mesmo arquivo temporário.
    let gravacao = Promise.resolve();
    const salvarProgresso = () => { gravacao = gravacao.then(() => gravarJson(caminhoProgresso, progresso)); return gravacao; };

    let concluidos = 0;
    await mapComConcorrencia(pendentes, CONCORRENCIA, async deputado => {
        progresso[String(deputado._id)] = await buscarProposicoesDoDeputado(deputado, ano);
        concluidos++;
        if (concluidos % SALVAR_PROGRESSO_A_CADA === 0) {
            console.log(`[buscaProposicoes] ${ano}: ${concluidos}/${pendentes.length} deputados.`);
            await salvarProgresso();
        }
    });
    await salvarProgresso();

    const semResultado = deputados.filter(d => (progresso[String(d._id)] ?? []).length === 0).length;
    const unicas = [...new Map(Object.values(progresso).flat().map(p => [p.id, p])).values()];
    console.log(`[buscaProposicoes] ${ano}: ${unicas.length} PLs únicos; ${semResultado} deputados sem PL encontrado no portal.`);

    // Só descarta o progresso depois que o arquivo final estiver gravado.
    await gravarJson(destino, unicas);
    await fs.rm(caminhoProgresso, { force: true });
    return unicas;
};
