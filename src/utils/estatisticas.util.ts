export const PESO_PL = 20;
export const PESO_PROPOSICAO = 1;
export const FATOR_ESCALA = 100000;
export const SALARIO_BASE_TOTAL = 41 * 46000;

/**
 * Calcula o score de eficiência do deputado
 * @param totalProjetos Total de projetos de lei do deputado
 * @param totalProposicoes Total de proposições do deputado
 * @param totalGastos Total de gastos do deputado
 * @returns Score de eficiência do deputado
 */
export const calcularScoreEficiencia = (
    totalProjetos: number,
    totalProposicoes: number,
    totalGastos: number
): number => {
    const outrasProposicoes = totalProposicoes - totalProjetos;
    const producaoPonderada = (totalProjetos * PESO_PL) + (outrasProposicoes * PESO_PROPOSICAO);
    const gastosValidos = totalGastos > 0 ? totalGastos + SALARIO_BASE_TOTAL : SALARIO_BASE_TOTAL;

    return Math.round((producaoPonderada / gastosValidos) * FATOR_ESCALA);
};

/**
 * Calcula o custo por produção
 * @param total Total de produção
 * @param gastos Total de gastos
 * @returns Custo por produção
 */
export const calcularCustoPorProducao = (total: number, gastos: number): number | null => {
    return total > 0 ? (gastos / total) : null;
};
