import fs from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import { fetchComRetry, HttpError } from "./http.util";

export interface IOpcoesCache {
    /** Ignora o cache e baixa novamente da Câmara. */
    force?: boolean;
}

const existe = async (caminho: string): Promise<boolean> =>
    fs.access(caminho).then(() => true, () => false);

/** Grava em `<destino>.tmp` e renomeia, para o cache nunca guardar um arquivo pela metade. */
export const gravarAtomico = async (destino: string, conteudo: string | Buffer): Promise<void> => {
    await fs.mkdir(path.dirname(destino), { recursive: true });
    const temporario = `${destino}.tmp`;
    await fs.writeFile(temporario, conteudo);
    await fs.rename(temporario, destino);
};

export const gravarJson = async (destino: string, dados: unknown): Promise<void> =>
    gravarAtomico(destino, JSON.stringify(dados));

/**
 * Baixa `url` para `destino`, reaproveitando o arquivo se já estiver em cache.
 * Retorna `null` quando a Câmara responde 404 (ex.: ano ainda não publicado).
 */
export const baixarParaCache = async (
    url: string,
    destino: string,
    { force = false }: IOpcoesCache = {}
): Promise<string | null> => {
    if (!force && await existe(destino)) {
        console.log(`[cache] Reutilizando ${destino}`);
        return destino;
    }

    console.log(`[cache] Baixando ${url}`);
    try {
        const res = await fetchComRetry(url, { timeoutMs: 10 * 60_000 });
        await gravarAtomico(destino, Buffer.from(await res.arrayBuffer()));
        return destino;
    } catch (erro) {
        if (erro instanceof HttpError && erro.status === 404) {
            console.warn(`[cache] Arquivo não publicado (404): ${url}`);
            return null;
        }
        throw erro;
    }
};

/**
 * Baixa um `.zip` e extrai sua primeira entrada (ou `nomeEntrada`) para `destino`.
 * O `.zip` não é mantido: o cache é o arquivo extraído.
 */
export const baixarZipParaCache = async (
    url: string,
    destino: string,
    opcoes: IOpcoesCache & { nomeEntrada?: string } = {}
): Promise<string | null> => {
    if (!opcoes.force && await existe(destino)) {
        console.log(`[cache] Reutilizando ${destino}`);
        return destino;
    }

    const caminhoZip = await baixarParaCache(url, `${destino}.zip`, { force: true });
    if (!caminhoZip) return null;

    const zip = new AdmZip(caminhoZip);
    const entrada = opcoes.nomeEntrada
        ? zip.getEntry(opcoes.nomeEntrada)
        : zip.getEntries().find(e => !e.isDirectory);

    if (!entrada) throw new Error(`Zip sem a entrada esperada: ${url}`);

    await gravarAtomico(destino, entrada.getData());
    await fs.rm(caminhoZip, { force: true });
    return destino;
};

export const lerJson = async <T>(caminho: string): Promise<T> =>
    JSON.parse(await fs.readFile(caminho, "utf8")) as T;

/**
 * Lê um arquivo de dados da Câmara. Aceita o envelope oficial `{ "dados": [...] }`
 * e também arrays puros (formato dos arquivos exportados manualmente antes do pipeline).
 */
export const lerDados = async <T>(caminho: string): Promise<T[]> => {
    const conteudo = await lerJson<T[] | { dados: T[] }>(caminho);
    return Array.isArray(conteudo) ? conteudo : conteudo.dados;
};
