interface IUriMongo {
    protocolo: string;
    host: string;
    banco: string;
}

const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Interpreta uma URI do MongoDB. Retorna `undefined` para URIs inválidas ou com vários hosts. */
export const lerUriMongo = (uri: string | undefined): IUriMongo | undefined => {
    try {
        const url = new URL(uri ?? "");
        return { protocolo: url.protocol, host: url.hostname, banco: url.pathname.replace(/^\//, "") };
    } catch {
        return undefined;
    }
};

/**
 * O pipeline pesado roda só no banco local; produção recebe os dados validados pelo `promote:atlas`.
 * Recusa qualquer URI que não aponte para esta máquina (incluindo `mongodb+srv`).
 */
export const garantirBancoLocal = (uri: string | undefined): void => {
    const lida = lerUriMongo(uri);
    if (!lida || lida.protocolo !== "mongodb:" || !HOSTS_LOCAIS.has(lida.host)) {
        throw new Error("DATABASE_URL não aponta para um MongoDB local. O pipeline só roda no banco local; para produção use o promote:atlas.");
    }
};

/** Mesmo host e mesmo banco (ou, se alguma URI não puder ser interpretada, o mesmo texto). */
export const mesmoBanco = (a: string, b: string): boolean => {
    const [ua, ub] = [lerUriMongo(a), lerUriMongo(b)];
    return ua && ub ? ua.host === ub.host && ua.banco === ub.banco : a === b;
};
