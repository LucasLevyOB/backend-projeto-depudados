export const LEGISLATURA_PADRAO = Number(process.env.LEGISLATURA_ATUAL ?? 57);

/**
 * Retorna os 4 anos que compõem uma determinada legislatura da Câmara dos Deputados.
 * A 57ª Legislatura iniciou em 2023 (2023..2026), a 58ª inicia em 2027 (2027..2030), etc.
 */
export const getAnosByLegislatura = (idLegislatura: number): number[] => {
    const anoInicial = 2023 + (idLegislatura - 57) * 4;
    return [anoInicial, anoInicial + 1, anoInicial + 2, anoInicial + 3];
};

/**
 * Retorna a legislatura à qual um ano-calendário pertence (2023..2026 = 57, 2027..2030 = 58).
 * Janeiro do ano seguinte ao quarto ano ainda é formalmente da legislatura anterior,
 * mas os arquivos da Câmara são anuais, então o ano inteiro é atribuído à nova legislatura.
 */
export const getLegislaturaByAno = (ano: number): number => 57 + Math.floor((ano - 2023) / 4);

/**
 * Retorna o intervalo de datas (início e fim) oficial da legislatura.
 * Inicia em 01/02 do primeiro ano e encerra em 31/01 do ano subsequente ao quarto ano.
 */
export const getPeriodoDatasByLegislatura = (idLegislatura: number): { inicio: Date; fim: Date } => {
    const anos = getAnosByLegislatura(idLegislatura);
    return {
        inicio: new Date(`${anos[0]}-02-01T00:00:00.000Z`),
        fim: new Date(`${anos[3] + 1}-01-31T23:59:59.999Z`),
    };
};

