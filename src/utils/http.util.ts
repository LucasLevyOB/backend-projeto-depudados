export class HttpError extends Error {
    constructor(readonly status: number, readonly url: string) {
        super(`HTTP ${status} em ${url}`);
        this.name = "HttpError";
    }
}

export interface IOpcoesFetch {
    init?: RequestInit;
    tentativas?: number;
    timeoutMs?: number;
    atrasoBaseMs?: number;
}

export const atrasar = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** 429 e 5xx são transitórios; os demais 4xx (ex.: 404) não adianta repetir. */
const deveRepetir = (erro: unknown): boolean =>
    !(erro instanceof HttpError) || erro.status === 429 || erro.status >= 500;

/**
 * `fetch` com timeout e novas tentativas com backoff exponencial.
 * Lança `HttpError` para respostas não-OK.
 */
export const fetchComRetry = async (url: string, opcoes: IOpcoesFetch = {}): Promise<Response> => {
    const { init, tentativas = 4, timeoutMs = 60_000, atrasoBaseMs = 1_000 } = opcoes;

    for (let tentativa = 1; ; tentativa++) {
        try {
            const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
            if (!res.ok) throw new HttpError(res.status, url);
            return res;
        } catch (erro) {
            if (tentativa >= tentativas || !deveRepetir(erro)) throw erro;
            const espera = atrasoBaseMs * 2 ** (tentativa - 1);
            console.warn(`[http] Falha em ${url} (tentativa ${tentativa}/${tentativas}): ${(erro as Error).message}. Nova tentativa em ${espera}ms.`);
            await atrasar(espera);
        }
    }
};

export const fetchJson = async <T>(url: string, opcoes: IOpcoesFetch = {}): Promise<T> => {
    const res = await fetchComRetry(url, {
        ...opcoes,
        init: { ...opcoes.init, headers: { accept: "application/json", ...opcoes.init?.headers } },
    });
    return (await res.json()) as T;
};

/**
 * Executa `fn` para cada item com no máximo `limite` chamadas simultâneas,
 * preservando a ordem dos resultados.
 */
export const mapComConcorrencia = async <T, R>(
    itens: readonly T[],
    limite: number,
    fn: (item: T, indice: number) => Promise<R>
): Promise<R[]> => {
    const resultados = new Array<R>(itens.length);
    let proximo = 0;

    const worker = async (): Promise<void> => {
        while (proximo < itens.length) {
            const indice = proximo++;
            resultados[indice] = await fn(itens[indice], indice);
        }
    };

    await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, worker));
    return resultados;
};
