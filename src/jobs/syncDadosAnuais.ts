import fs from "fs";
import { parse } from "csv-parse";
import { caminhoAno } from "@/config/paths";
import { executarJob } from "@/jobs/runner";
import { IDespesa } from "@/models/despesa.model";
import { chaveProposicaoAutor } from "@/repositories/chavesUpsert";
import { IngestaoRepository, IResultadoIngestao } from "@/repositories/ingestao.repository";
import {
    IDespesaCsv,
    IProposicaoArquivo,
    IProposicaoAutorArquivo,
    IVotacaoArquivo,
    IVotoArquivo,
} from "@/types/camara.types";
import { baixarParaCache, baixarZipParaCache, IOpcoesCache, lerDados } from "@/utils/cacheDownloader.util";
import { parseArgs, resolverAno } from "@/utils/cliArgs.util";
import { dataBrasilia } from "@/utils/data.util";

const ARQUIVOS = "https://dadosabertos.camara.leg.br/arquivos";
const LOTE_DESPESAS = 5_000;

const urlArquivo = (pasta: string, ano: number): string => `${ARQUIVOS}/${pasta}/json/${pasta}-${ano}.json`;

const logResultado = (nome: string, total: number, r: IResultadoIngestao): void =>
    console.log(`[syncDadosAnuais] ${nome}: ${total} na fonte, ${r.inseridos} novos, ${r.atualizados} atualizados.`);

// ---------- Despesas (CSV da CEAP) ----------

const numero = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v));

/**
 * Converte a linha do CSV para o formato do model (mesmos nomes do JSON da CEAP).
 * `ideCadastro` é o id do deputado na API; o JSON não traz esse campo, por isso a fonte é o CSV.
 */
export const mapearDespesaCsv = (l: IDespesaCsv): Partial<IDespesa> => ({
    nomeParlamentar: l.txNomeParlamentar,
    cpf: l.cpf,
    numeroCarteiraParlamentar: l.nuCarteiraParlamentar,
    legislatura: numero(l.nuLegislatura),
    siglaUF: l.sgUF,
    siglaPartido: l.sgPartido,
    codigoLegislatura: numero(l.codLegislatura),
    numeroSubCota: numero(l.numSubCota),
    descricao: l.txtDescricao,
    numeroEspecificacaoSubCota: numero(l.numEspecificacaoSubCota),
    descricaoEspecificacao: l.txtDescricaoEspecificacao,
    fornecedor: l.txtFornecedor,
    cnpjCPF: l.txtCNPJCPF,
    numero: l.txtNumero,
    tipoDocumento: l.indTipoDocumento,
    dataEmissao: dataBrasilia(l.datEmissao),
    valorDocumento: l.vlrDocumento,
    valorGlosa: l.vlrGlosa,
    valorLiquido: l.vlrLiquido,
    mes: numero(l.numMes),
    ano: numero(l.numAno),
    parcela: numero(l.numParcela),
    passageiro: l.txtPassageiro,
    trecho: l.txtTrecho,
    lote: l.numLote,
    ressarcimento: l.numRessarcimento,
    datPagamentoRestituicao: l.datPagamentoRestituicao,
    restituicao: l.vlrRestituicao,
    numeroDeputadoID: numero(l.nuDeputadoId),
    idDeputado: numero(l.ideCadastro),
    idDocumento: numero(l.ideDocumento),
    urlDocumento: l.urlDocumento,
});

/** Lê o CSV em streaming e entrega lotes já convertidos, sem carregar o arquivo inteiro em memória. */
async function* lotesDeDespesas(caminho: string): AsyncGenerator<Array<Partial<IDespesa>>> {
    const linhas = fs.createReadStream(caminho).pipe(
        parse({ delimiter: ";", columns: true, bom: true, relax_quotes: true, skip_empty_lines: true })
    );

    let lote: Array<Partial<IDespesa>> = [];
    for await (const linha of linhas as AsyncIterable<IDespesaCsv>) {
        lote.push(mapearDespesaCsv(linha));
        if (lote.length >= LOTE_DESPESAS) {
            yield lote;
            lote = [];
        }
    }
    if (lote.length > 0) yield lote;
}

const syncDespesas = async (repo: IngestaoRepository, ano: number, opcoes: IOpcoesCache): Promise<void> => {
    const csv = await baixarZipParaCache(`https://www.camara.leg.br/cotas/Ano-${ano}.csv.zip`, caminhoAno(ano, "despesas.csv"), opcoes);
    if (!csv) return;

    const { removidas, inseridas } = await repo.substituirDespesasAno(ano, lotesDeDespesas(csv));
    console.log(`[syncDadosAnuais] Despesas ${ano}: ${removidas} removidas, ${inseridas} inseridas.`);
};

// ---------- Proposições e autores ----------

const idDaUri = (uri: string | null): number | null => (uri ? Number(uri.split("/").pop()) : null);

/** Só os campos do arquivo oficial: os enriquecidos pela busca do portal e os `temas` não são tocados. */
const mapearProposicao = (p: IProposicaoArquivo) => ({
    _id: p.id,
    id: p.id,
    uri: p.uri,
    siglaTipo: p.siglaTipo,
    numero: p.numero,
    ano: p.ano,
    codTipo: p.codTipo,
    descricaoTipo: p.descricaoTipo,
    ementa: p.ementa,
    ementaDetalhada: p.ementaDetalhada,
    keywords: p.keywords,
    dataApresentacao: dataBrasilia(p.dataApresentacao),
    uriOrgaoNumerador: p.uriOrgaoNumerador,
    uriPropAnterior: p.uriPropAnterior ?? undefined,
    uriPropPrincipal: p.uriPropPrincipal ?? undefined,
    uriPropPosterior: p.uriPropPosterior ?? undefined,
    urlInteiroTeor: p.urlInteiroTeor,
    ultimoStatus: p.ultimoStatus,
    idPropPrincipal: idDaUri(p.uriPropPrincipal),
});

const syncProposicoes = async (repo: IngestaoRepository, ano: number, opcoes: IOpcoesCache): Promise<void> => {
    const arquivo = await baixarParaCache(urlArquivo("proposicoes", ano), caminhoAno(ano, "proposicoes.json"), opcoes);
    if (!arquivo) return;

    const proposicoes = await lerDados<IProposicaoArquivo>(arquivo);
    logResultado(`Proposições ${ano}`, proposicoes.length, await repo.upsertProposicoes(proposicoes.map(mapearProposicao)));
};

/**
 * O arquivo às vezes lista o mesmo autor duas vezes na mesma proposição, só com `ordemAssinatura` diferente.
 * Fica uma linha por chave (a de menor ordem), senão as duplicatas se sobrescrevem a cada execução.
 */
export const deduplicarAutores = (autores: IProposicaoAutorArquivo[]): IProposicaoAutorArquivo[] => {
    const porChave = autores.reduce((mapa, autor) => {
        const chave = JSON.stringify(chaveProposicaoAutor(autor));
        const atual = mapa.get(chave);
        if (!atual || Number(autor.ordemAssinatura) < Number(atual.ordemAssinatura)) mapa.set(chave, autor);
        return mapa;
    }, new Map<string, IProposicaoAutorArquivo>());
    return [...porChave.values()];
};

const syncAutores = async (repo: IngestaoRepository, ano: number, opcoes: IOpcoesCache): Promise<void> => {
    const arquivo = await baixarParaCache(urlArquivo("proposicoesAutores", ano), caminhoAno(ano, "proposicoesAutores.json"), opcoes);
    if (!arquivo) return;

    const autores = deduplicarAutores(await lerDados<IProposicaoAutorArquivo>(arquivo));
    logResultado(`Autores ${ano}`, autores.length, await repo.upsertProposicoesAutores(autores));
};

// ---------- Votações e votos ----------

const mapearVotacao = (v: IVotacaoArquivo) => ({
    ...v,
    _id: v.id,
    aprovacao: v.aprovacao ?? undefined,
    data: dataBrasilia(v.data),
    dataHoraRegistro: dataBrasilia(v.dataHoraRegistro),
});

const syncVotacoes = async (repo: IngestaoRepository, ano: number, opcoes: IOpcoesCache): Promise<void> => {
    const arquivo = await baixarParaCache(urlArquivo("votacoes", ano), caminhoAno(ano, "votacoes.json"), opcoes);
    if (!arquivo) return;

    const votacoes = await lerDados<IVotacaoArquivo>(arquivo);
    logResultado(`Votações ${ano}`, votacoes.length, await repo.upsertVotacoes(votacoes.map(mapearVotacao)));
};

const mapearVoto = (v: IVotoArquivo) => ({
    ...v,
    dataHoraVoto: dataBrasilia(v.dataHoraVoto),
    deputado_: { ...v.deputado_, id: String(v.deputado_.id), idLegislatura: String(v.deputado_.idLegislatura) },
});

const syncVotos = async (repo: IngestaoRepository, ano: number, opcoes: IOpcoesCache): Promise<void> => {
    const arquivo = await baixarParaCache(urlArquivo("votacoesVotos", ano), caminhoAno(ano, "votacoesVotos.json"), opcoes);
    if (!arquivo) return;

    const votos = await lerDados<IVotoArquivo>(arquivo);
    logResultado(`Votos ${ano}`, votos.length, await repo.upsertVotosDeputados(votos.map(mapearVoto)));
};

// ---------- Eventos e presenças (só cache; consumidos pelo syncPresencas) ----------

export const baixarEventosEPresencas = async (ano: number, opcoes: IOpcoesCache = {}): Promise<void> => {
    await baixarParaCache(urlArquivo("eventos", ano), caminhoAno(ano, "eventos.json"), opcoes);
    await baixarParaCache(urlArquivo("eventosPresencaDeputados", ano), caminhoAno(ano, "presencas.json"), opcoes);
};

export const syncDadosAnuais = async (ano: number, opcoes: IOpcoesCache = {}): Promise<void> => {
    console.log(`[syncDadosAnuais] Ano ${ano}${opcoes.force ? " (forçando download)" : ""}.`);
    const repo = new IngestaoRepository();

    await syncDespesas(repo, ano, opcoes);
    await syncProposicoes(repo, ano, opcoes);
    await syncAutores(repo, ano, opcoes);
    await syncVotacoes(repo, ano, opcoes);
    await syncVotos(repo, ano, opcoes);
    await baixarEventosEPresencas(ano, opcoes);
};

if (require.main === module) {
    const args = parseArgs();
    executarJob("syncDadosAnuais", () => syncDadosAnuais(resolverAno(args), { force: args.forceDownload }));
}
