import { caminhoAno } from "@/config/paths";
import { baixarParaCache, IOpcoesCache } from "./cacheDownloader.util";

export const API_CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
export const ARQUIVOS_CAMARA = "https://dadosabertos.camara.leg.br/arquivos";
export const BUSCA_PORTAL_CAMARA = "https://www.camara.leg.br/busca-api/api/v1/busca/proposicoes/_search";

/** Ex.: `urlArquivoAnual("votacoes", 2026)` → `.../arquivos/votacoes/json/votacoes-2026.json`. */
export const urlArquivoAnual = (pasta: string, ano: number): string => `${ARQUIVOS_CAMARA}/${pasta}/json/${pasta}-${ano}.json`;

export const urlDespesasCsv = (ano: number): string => `https://www.camara.leg.br/cotas/Ano-${ano}.csv.zip`;

/** Garante eventos e presenças do ano no cache. Retorna `null` nos caminhos de arquivos ainda não publicados. */
export const obterEventosEPresencas = async (
    ano: number,
    opcoes: IOpcoesCache = {}
): Promise<{ eventos: string | null; presencas: string | null }> => ({
    eventos: await baixarParaCache(urlArquivoAnual("eventos", ano), caminhoAno(ano, "eventos.json"), opcoes),
    presencas: await baixarParaCache(urlArquivoAnual("eventosPresencaDeputados", ano), caminhoAno(ano, "presencas.json"), opcoes),
});
