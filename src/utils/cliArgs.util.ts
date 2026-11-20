import { LEGISLATURA_PADRAO, getLegislaturaByAno } from "./legislatura.util";

export interface IOpcoesCli {
    ano?: number;
    legislatura?: number;
    forceDownload: boolean;
    apply: boolean;
    skip: string[];
}

const lerValor = (argv: string[], nome: string): string | undefined =>
    argv.find(a => a.startsWith(`--${nome}=`))?.split("=")[1];

const lerNumero = (argv: string[], nome: string): number | undefined => {
    const valor = lerValor(argv, nome);
    if (valor === undefined) return undefined;
    const numero = Number(valor);
    return Number.isNaN(numero) ? undefined : numero;
};

/**
 * Lê os argumentos comuns dos jobs:
 * `--ano=2026`, `--legislatura=57`, `--force-download`, `--apply`, `--skip=busca,temas`.
 */
export const parseArgs = (argv: string[] = process.argv.slice(2)): IOpcoesCli => ({
    ano: lerNumero(argv, "ano"),
    legislatura: lerNumero(argv, "legislatura"),
    forceDownload: argv.includes("--force-download"),
    apply: argv.includes("--apply"),
    skip: (lerValor(argv, "skip") ?? "").split(",").map(s => s.trim()).filter(Boolean),
});

/**
 * Prioridade: `--legislatura` > legislatura derivada de `--ano` > `LEGISLATURA_ATUAL`/57.
 */
export const resolverLegislatura = (opcoes: IOpcoesCli): number =>
    opcoes.legislatura ?? (opcoes.ano !== undefined ? getLegislaturaByAno(opcoes.ano) : LEGISLATURA_PADRAO);

export const resolverAno = (opcoes: IOpcoesCli): number => opcoes.ano ?? new Date().getFullYear();
