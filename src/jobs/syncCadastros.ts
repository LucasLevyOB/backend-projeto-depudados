import path from "path";
import { caminhoLegislatura, DADOS_DIR } from "@/config/paths";
import { executarJob } from "@/jobs/runner";
import { IStatus } from "@/models/deputado.model";
import { DeputadoCadastro, IngestaoRepository } from "@/repositories/ingestao.repository";
import {
    IDeputadoArquivo,
    IDeputadoDetalheApi,
    IDeputadoListaApi,
    IPartidoApi,
    IRespostaApi,
    IStatusApi,
} from "@/types/camara.types";
import { baixarParaCache, cacheJson, IOpcoesCache, lerDados } from "@/utils/cacheDownloader.util";
import { parseArgs, resolverLegislatura } from "@/utils/cliArgs.util";
import { fetchJson, mapComConcorrencia } from "@/utils/http.util";
import { LEGISLATURA_PADRAO } from "@/utils/legislatura.util";

const API = "https://dadosabertos.camara.leg.br/api/v2";
const URL_DEPUTADOS_ARQUIVO = "https://dadosabertos.camara.leg.br/arquivos/deputados/json/deputados.json";
const CONCORRENCIA_DETALHES = 5;

const idDaUri = (uri: string): number => Number(uri.split("/").pop());

/** Remove chaves `undefined` para que o `$set` não apague valores existentes. */
const semIndefinidos = <T extends object>(obj: T): T =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;

/** Segue os links `rel=next` da API até a última página. */
const buscarTodasPaginas = async <T>(url: string): Promise<T[]> => {
    const resposta = await fetchJson<IRespostaApi<T[]>>(url);
    const proxima = resposta.links?.find(l => l.rel === "next")?.href;
    return proxima ? [...resposta.dados, ...(await buscarTodasPaginas<T>(proxima))] : resposta.dados;
};

const paraStatus = (s: IStatusApi): IStatus => ({
    situacao: s.situacao,
    condicaoEleitoral: s.condicaoEleitoral,
    siglaPartido: s.siglaPartido,
    siglaUf: s.siglaUf,
    idLegislatura: s.idLegislatura,
    nomeEleitoral: s.nomeEleitoral,
    data: s.data,
    descricaoStatus: s.descricaoStatus,
    gabinete: s.gabinete,
});

/**
 * Busca `/deputados/{id}` de todos os ids. Se algum falhar (mesmo após as novas tentativas),
 * aborta em vez de gravar um cache incompleto que seria reaproveitado nas próximas execuções.
 */
const buscarDetalhes = async (ids: number[]): Promise<IDeputadoDetalheApi[]> => {
    let concluidos = 0;

    const resultados = await mapComConcorrencia(ids, CONCORRENCIA_DETALHES, async id => {
        try {
            const { dados } = await fetchJson<IRespostaApi<IDeputadoDetalheApi>>(`${API}/deputados/${id}`);
            return dados;
        } catch (erro) {
            console.error(`[syncCadastros] Falha ao buscar detalhes do deputado ${id}: ${(erro as Error).message}`);
            return null;
        } finally {
            concluidos++;
            if (concluidos % 100 === 0) console.log(`[syncCadastros] Detalhes: ${concluidos}/${ids.length}`);
        }
    });

    const falhas = ids.filter((_, i) => resultados[i] === null);
    if (falhas.length > 0) {
        throw new Error(`Detalhes não obtidos para ${falhas.length} deputado(s): ${falhas.join(", ")}. Rode novamente.`);
    }

    return resultados.filter((d): d is IDeputadoDetalheApi => d !== null);
};

const montarCadastro = (
    lista: IDeputadoListaApi,
    arquivo: IDeputadoArquivo | undefined,
    detalhe: IDeputadoDetalheApi | undefined
): DeputadoCadastro => semIndefinidos({
    _id: lista.id,
    uri: lista.uri,
    nome: arquivo?.nome ?? lista.nome,
    urlFoto: lista.urlFoto,
    nomeCivil: arquivo?.nomeCivil ?? detalhe?.nomeCivil,
    siglaSexo: arquivo?.siglaSexo ?? detalhe?.sexo,
    idLegislaturaInicial: arquivo?.idLegislaturaInicial,
    idLegislaturaFinal: arquivo?.idLegislaturaFinal,
    urlRedeSocial: arquivo?.urlRedeSocial ?? detalhe?.redeSocial,
    urlWebsite: arquivo?.urlWebsite,
    dataNascimento: arquivo?.dataNascimento ?? detalhe?.dataNascimento,
    dataFalecimento: arquivo?.dataFalecimento ?? detalhe?.dataFalecimento ?? undefined,
    ufNascimento: arquivo?.ufNascimento ?? detalhe?.ufNascimento,
    municipioNascimento: arquivo?.municipioNascimento ?? detalhe?.municipioNascimento,
    cpf: detalhe?.cpf,
    escolaridade: detalhe?.escolaridade ?? undefined,
    // A raiz espelha o status mais recente do deputado, que é o que a API devolve.
    ultimoStatus: detalhe ? paraStatus(detalhe.ultimoStatus) : undefined,
});

const syncPartidos = async (repo: IngestaoRepository, idLegislatura: number, opcoes: IOpcoesCache): Promise<void> => {
    const partidos = await cacheJson(
        caminhoLegislatura(idLegislatura, "partidos.json"),
        () => buscarTodasPaginas<IPartidoApi>(`${API}/partidos?idLegislatura=${idLegislatura}&itens=100`),
        opcoes
    );

    const r = await repo.upsertPartidos(
        partidos.map(p => ({ id: String(p.id), sigla: p.sigla, nome: p.nome, uri: p.uri }))
    );
    console.log(`[syncCadastros] Partidos: ${partidos.length} na fonte, ${r.inseridos} novos, ${r.atualizados} atualizados.`);
};

const syncDeputados = async (repo: IngestaoRepository, idLegislatura: number, opcoes: IOpcoesCache): Promise<void> => {
    const listaBruta = await cacheJson(
        caminhoLegislatura(idLegislatura, "deputados-base.json"),
        () => buscarTodasPaginas<IDeputadoListaApi>(`${API}/deputados?idLegislatura=${idLegislatura}&itens=1000`),
        opcoes
    );
    // A listagem pode repetir o mesmo deputado (ex.: troca de partido); fica a última ocorrência.
    const lista = [...new Map(listaBruta.map(d => [d.id, d])).values()];
    console.log(`[syncCadastros] ${lista.length} deputados na legislatura ${idLegislatura}.`);

    const caminhoArquivo = await baixarParaCache(URL_DEPUTADOS_ARQUIVO, path.join(DADOS_DIR, "deputados.json"), opcoes);
    const arquivo = caminhoArquivo ? await lerDados<IDeputadoArquivo>(caminhoArquivo) : [];
    const arquivoPorId = new Map(arquivo.map(d => [idDaUri(d.uri), d]));

    const detalhes = await cacheJson(
        caminhoLegislatura(idLegislatura, "deputados-detalhados.json"),
        () => buscarDetalhes(lista.map(d => d.id)),
        opcoes
    );
    const detalhePorId = new Map(detalhes.map(d => [d.id, d]));

    const cadastro = await repo.upsertDeputadosCadastro(
        lista.map(d => montarCadastro(d, arquivoPorId.get(d.id), detalhePorId.get(d.id)))
    );
    console.log(`[syncCadastros] Deputados: ${cadastro.inseridos} novos, ${cadastro.atualizados} atualizados.`);

    // O status da API é o atual. Numa legislatura já encerrada ele pertence à seguinte,
    // então só vale para o mandato quando `idLegislatura` coincide.
    const statusDaLegislatura = (d: IDeputadoListaApi): IStatus | undefined => {
        const status = detalhePorId.get(d.id)?.ultimoStatus;
        return status?.idLegislatura === idLegislatura ? paraStatus(status) : undefined;
    };

    const novos = await repo.garantirMandatos(
        idLegislatura,
        lista.map(d => ({
            idDeputado: d.id,
            ultimoStatus: statusDaLegislatura(d) ?? {
                idLegislatura,
                siglaPartido: d.siglaPartido,
                siglaUf: d.siglaUf,
                nomeEleitoral: d.nome,
            },
        }))
    );

    const comStatus = lista
        .map(d => ({ idDeputado: d.id, ultimoStatus: statusDaLegislatura(d) }))
        .filter((i): i is { idDeputado: number; ultimoStatus: IStatus } => i.ultimoStatus !== undefined);
    const status = await repo.atualizarStatusMandatos(idLegislatura, comStatus);

    console.log(`[syncCadastros] Mandatos ${idLegislatura}: ${novos.atualizados} criados, ${status.atualizados} com status atualizado (${comStatus.length} com status desta legislatura).`);
};

export const syncCadastros = async (idLegislatura: number, opcoes: IOpcoesCache = {}): Promise<void> => {
    console.log(`[syncCadastros] Legislatura ${idLegislatura}${idLegislatura === LEGISLATURA_PADRAO ? " (padrão)" : ""}.`);
    const repo = new IngestaoRepository();

    await syncPartidos(repo, idLegislatura, opcoes);
    await syncDeputados(repo, idLegislatura, opcoes);
};

if (require.main === module) {
    const args = parseArgs();
    executarJob("syncCadastros", () => syncCadastros(resolverLegislatura(args), { force: args.forceDownload }));
}
