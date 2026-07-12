export const PESO_PL = 20;
export const PESO_PROPOSICAO = 0.5;
export const FATOR_ESCALA = 100000;
export const SALARIO_BASE_TOTAL = 41 * 46000;

const getMultiplicadorResolutividade = (situacao: string): number => {
    if (!situacao) return 1.0;
    const s = situacao.toLowerCase();

    if (s.includes("transformado em norma jurídica")) return 5.0;
    if (s.includes("aguardando sanção") || s.includes("envio ao senado federal") || s.includes("apreciação pelo senado")) return 3.0;
    if (s.includes("pronta para pauta") || s.includes("deliberação") || s.includes("encaminhamento")) return 2.0;
    if (s.includes("comissão em funcionamento") || s.includes("aguardando parecer") || s.includes("comissão temporária")) return 1.5;

    return 1.0;
};

const getMultiplicadorQualidade = (prop: any): number => {
    const s = (prop.tipoSituacaoProposicao || "").toLowerCase();

    if (s.includes("arquivada") || s.includes("devolvida") || s.includes("retirado")) return 0.0;
    if (s.includes("inconstitucionalidade")) return 0.1;

    if (prop.resultadoItens && Array.isArray(prop.resultadoItens)) {
        const temRejeicao = prop.resultadoItens.some((item: any) =>
            item.descricaoResultado && (
                item.descricaoResultado.toLowerCase().includes("rejeitada") ||
                item.descricaoResultado.toLowerCase().includes("prejudicada") ||
                item.descricaoResultado.toLowerCase().includes("inconstitucional")
            )
        );
        if (temRejeicao) return 0.1;
    }

    if (prop.codProposicaoApensadaPai || s.includes("apensação") || s.includes("tramitando em conjunto")) return 0.3;

    return 1.0;
};

const getMultiplicadorCeleridade = (prop: any): number => {
    if (!prop.dataApresentacao || !prop.qtdeDeTramitacoes) return 1.0;

    const dataApresentacao = new Date(prop.dataApresentacao);
    const dataAtual = new Date();
    const anos = Math.max(0.1, (dataAtual.getTime() - dataApresentacao.getTime()) / (1000 * 60 * 60 * 24 * 365));
    const tramitacoesPorAno = prop.qtdeDeTramitacoes / anos;

    if (tramitacoesPorAno > 10) return 1.2;
    if (tramitacoesPorAno < 1) return 0.8;
    return 1.0;
};

export const calcularScorePorProposicao = (prop: any): number => {
    const mR = getMultiplicadorResolutividade(prop.tipoSituacaoProposicao);
    const mQ = getMultiplicadorQualidade(prop);
    const mC = getMultiplicadorCeleridade(prop);

    return PESO_PL * mR * mQ * mC;
};

/**
 * Calcula o score de eficiência do deputado baseando-se em suas proposições
 * @param proposicoes Lista de proposições do deputado
 * @param totalGastos Total de gastos do deputado
 * @returns Score de eficiência do deputado
 */
export const calcularScoreEficiencia = (
    proposicoes: any[],
    totalGastos: number
): number => {
    let producaoPonderada = 0;

    for (const prop of proposicoes) {
        if (prop.codTipo === 139) { // PL
            producaoPonderada += calcularScorePorProposicao(prop);
        } else {
            producaoPonderada += PESO_PROPOSICAO;
        }
    }

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
