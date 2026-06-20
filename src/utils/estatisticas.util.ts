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

/**
 * Agrupa as proposições por ano, mês e tipo.
 * @param proposicoes Lista de proposições
 * @returns Resumo agrupado
 */
export const agruparResumoProposicoes = (proposicoes: any[]) => {
    const resumoMap = new Map<number, any>();

    for (const prop of proposicoes) {
        if (!prop.dataApresentacao) continue;
        const date = new Date(prop.dataApresentacao);
        const ano = date.getFullYear();
        const mes = date.getMonth() + 1;

        if (!resumoMap.has(ano)) {
            const mesesInit = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, projetosDeLei: 0, outrasProposicoes: 0 }));
            resumoMap.set(ano, { ano, total: 0, meses: mesesInit, tipos: [] });
        }

        const resumoAno = resumoMap.get(ano);
        const resumoMes = resumoAno.meses.find((m: any) => m.mes === mes);

        if (prop.codTipo === 139) {
            resumoMes.projetosDeLei++;
        } else {
            resumoMes.outrasProposicoes++;
        }

        resumoAno.total++;

        const siglaTipo = prop.siglaTipo || "Outros";
        const descricaoTipo = prop.descricaoTipo || "Outros";
        const tipoExistente = resumoAno.tipos.find((t: any) => t.siglaTipo === siglaTipo);
        if (tipoExistente) {
            tipoExistente.quantidade++;
        } else {
            resumoAno.tipos.push({ siglaTipo, descricaoTipo, quantidade: 1 });
        }
    }

    return Array.from(resumoMap.values());
};
