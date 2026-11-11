import { Deputado } from "@/models/deputado.model";
import { executarJob } from "@/jobs/runner";
import { LEGISLATURA_PADRAO } from "@/utils/legislatura.util";

export const migrateMandatos = async (idLegislatura: number): Promise<void> => {
    console.log(`[migrateMandatos] Iniciando migração de mandatos para a legislatura ${idLegislatura}...`);

    // Busca deputados que ainda não possuem o mandato correspondente registrado
    const deputados = await Deputado.find({
        "mandatos.idLegislatura": { $ne: idLegislatura }
    }).select({
        _id: 1,
        ultimoStatus: 1,
        estatisticas: 1,
        resumoPresencas: 1
    }).lean();

    if (deputados.length === 0) {
        console.log(`[migrateMandatos] Nenhum deputado pendente de migração para a legislatura ${idLegislatura}.`);
        return;
    }

    console.log(`[migrateMandatos] Processando ${deputados.length} deputados...`);

    const bulkOps = deputados.map(d => ({
        updateOne: {
            filter: { _id: d._id },
            update: {
                $push: {
                    mandatos: {
                        idLegislatura,
                        ultimoStatus: d.ultimoStatus ?? {
                            situacao: "Exercício",
                            condicaoEleitoral: "Titular",
                            siglaPartido: "",
                            siglaUf: "",
                            idLegislatura,
                            nomeEleitoral: "",
                            data: new Date().toISOString(),
                            descricaoStatus: null
                        },
                        estatisticas: d.estatisticas ?? {
                            gastosDespesas: 0,
                            projetosDeLei: 0,
                            totalProposicoes: 0,
                            scoreEficiencia: 0,
                            custoPorProjetoLei: null,
                            custoPorProposicao: null,
                            temasProposicoes: []
                        },
                        resumoPresencas: d.resumoPresencas ?? {
                            totalSessoes: 0,
                            presencas: 0,
                            ausencias: 0,
                            percentualPresenca: 0
                        }
                    }
                }
            }
        }
    }));

    const result = await Deputado.bulkWrite(bulkOps as any);
    console.log(`[migrateMandatos] Migração concluída: ${result.modifiedCount} deputados atualizados.`);
};

if (require.main === module) {
    executarJob("migrateMandatos", () => migrateMandatos(Number(process.env.LEGISLATURA_MIGRACAO ?? LEGISLATURA_PADRAO)));
}
