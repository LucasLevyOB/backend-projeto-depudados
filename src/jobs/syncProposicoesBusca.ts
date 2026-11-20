import { executarJob } from "@/jobs/runner";
import { IProposicao } from "@/models/proposicao.model";
import { IngestaoRepository } from "@/repositories/ingestao.repository";
import { IProposicaoBusca, rasparBuscaProposicoes } from "@/scrapers/buscaProposicoes";
import { IOpcoesCache } from "@/utils/cacheDownloader.util";
import { parseArgs, resolverAno } from "@/utils/cliArgs.util";
import { dataBrasilia } from "@/utils/data.util";
import { getLegislaturaByAno } from "@/utils/legislatura.util";

/** Prefere o tema automático do portal; na falta dele, o tema editorial. */
const getTemaPortalOuAutomatico = (prop: IProposicaoBusca): string[] => {
    if (prop.temaAutomatico && prop.temaAutomatico.length > 0) {
        return prop.temaAutomatico.map(t => t.tema);
    }
    return prop.temaPortal ?? [];
};

/**
 * Campos enriquecidos pelo portal. `temas` só entra quando o portal traz algum,
 * para não apagar os temas já classificados pelo Ollama.
 */
export const mapearProposicaoBusca = (prop: IProposicaoBusca): Partial<IProposicao> & { _id: number } => {
    const temas = getTemaPortalOuAutomatico(prop);

    return {
        _id: prop.id,
        id: prop.id,
        numero: prop.numero,
        ano: prop.ano,
        ementa: prop.ementa,
        siglaTipo: prop.siglaProposicao || "PL",
        codTipo: prop.codTipoProposicao || 139,
        keywords: prop.indexacao || "",
        titulo: prop.titulo || "",
        ...(temas.length > 0 ? { temas } : {}),
        situacaoAtualBusca: prop.situacaoAtual || prop.situacaoProposicao || "",
        estados: prop.estados || [],
        dataApresentacao: dataBrasilia(prop.dataApresentacao),
        dataDaUltimaTramitacao: dataBrasilia(prop.dataDaUltimaTramitacao),
        dataDaUltimaMovimentacao: dataBrasilia(prop.dataDaUltimaMovimentacao),
        dataOrdenacao: dataBrasilia(prop.dataOrdenacao),
        autores: prop.autores || [],
        txtRegime: prop.txtRegime || "",
        txtApreciacao: prop.txtApreciacao || "",
        linkVideo: prop.linkVideo || "",
        explicacaoEmenta: prop.explicacaoEmenta || "",
        comissaoPreponderante: prop.comissaoPreponderante || "",
        qtdeDeTramitacoes: prop.qtdeDeTramitacoes || 0,
        tipoSituacaoProposicao: prop.tipoSituacaoProposicao || "",
        resultadoItens: prop["resultado-itens"] || [],
        codProposicaoApensadaPai: prop.codProposicaoApensadaPai || null,
    };
};

/** Remove datas ausentes para o `$set` não apagar valores vindos do arquivo oficial. */
const semIndefinidos = <T extends object>(obj: T): T =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;

/**
 * Enriquece os PLs do ano com os dados da busca do portal, para os deputados com mandato
 * na legislatura do ano. O resultado da busca fica em cache em `anos/{ano}/proposicoes-busca.json`.
 */
export const syncProposicoesBusca = async (ano: number, opcoes: IOpcoesCache = {}): Promise<void> => {
    const repo = new IngestaoRepository();
    const idLegislatura = getLegislaturaByAno(ano);
    const deputados = await repo.listarDeputadosComMandato(idLegislatura);

    if (deputados.length === 0) {
        throw new Error(`Nenhum deputado com mandato ${idLegislatura} no banco. Rode o sync:cadastros antes.`);
    }

    console.log(`[syncProposicoesBusca] Ano ${ano}: busca no portal para ${deputados.length} deputados da legislatura ${idLegislatura}.`);
    const proposicoes = await rasparBuscaProposicoes(ano, deputados, opcoes);

    const comTema = proposicoes.filter(p => getTemaPortalOuAutomatico(p).length > 0).length;
    const r = await repo.upsertProposicoes(proposicoes.map(p => semIndefinidos(mapearProposicaoBusca(p))));
    console.log(`[syncProposicoesBusca] ${proposicoes.length} PLs (${comTema} com tema do portal): ${r.inseridos} novos, ${r.atualizados} atualizados.`);
};

if (require.main === module) {
    const args = parseArgs();
    executarJob("syncProposicoesBusca", () => syncProposicoesBusca(resolverAno(args), { force: args.forceDownload }));
}
