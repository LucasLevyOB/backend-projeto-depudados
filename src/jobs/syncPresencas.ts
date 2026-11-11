import * as fs from 'fs';
import * as path from 'path';
import { DADOS_DIR } from '@/config/paths';
import { Deputado } from '@/models/deputado.model';
import { executarJob } from '@/jobs/runner';
import { parseArgs, resolverLegislatura } from '@/utils/cliArgs.util';
import { LEGISLATURA_PADRAO, getPeriodoDatasByLegislatura } from '@/utils/legislatura.util';

const EVENTOS_DIR = path.join(DADOS_DIR, 'eventos');
const PRESENCAS_DIR = path.join(DADOS_DIR, 'presencas');

export const syncPresencas = async (idLegislatura: number): Promise<void> => {
    const { inicio: inicioPeriodo, fim: fimPeriodo } = getPeriodoDatasByLegislatura(idLegislatura);

    console.log(`[syncPresencas] Iniciando sincronização de presenças para a legislatura ${idLegislatura} (${inicioPeriodo.toISOString().slice(0, 10)} até ${fimPeriodo.toISOString().slice(0, 10)})...`);

    // 1. Coletar IDs de eventos válidos no período da legislatura
    console.log("Lendo arquivos de eventos...");
    const eventosValidos = new Map<number, Date>();
    
    if (!fs.existsSync(EVENTOS_DIR)) {
        throw new Error(`Diretório de eventos não encontrado: ${EVENTOS_DIR}`);
    }

    const arquivosEventos = fs.readdirSync(EVENTOS_DIR).filter(f => f.endsWith('.json'));
    
    for (const arquivo of arquivosEventos) {
        const caminho = path.join(EVENTOS_DIR, arquivo);
        const conteudo = fs.readFileSync(caminho, 'utf-8');
        const eventos = JSON.parse(conteudo);

        for (const evento of eventos) {
            if (evento.situacao !== 'Cancelada' && evento.descricaoTipo === 'Sessão Deliberativa') {
                const idEvento = evento.id || evento._id;
                const dataInicio = new Date(evento.dataHoraInicio);
                
                if (
                    idEvento &&
                    !isNaN(dataInicio.getTime()) &&
                    dataInicio >= inicioPeriodo &&
                    dataInicio <= fimPeriodo
                ) {
                    eventosValidos.set(idEvento, dataInicio);
                }
            }
        }
    }

    const totalEventosGlobais = eventosValidos.size;
    console.log(`Encontrados ${totalEventosGlobais} eventos válidos no período da legislatura ${idLegislatura}.`);

    // 2. Contabilizar presenças por deputado
    console.log("Lendo arquivos de presenças...");
    const presencasPorDeputado = new Map<number, number>();

    if (!fs.existsSync(PRESENCAS_DIR)) {
        throw new Error(`Diretório de presenças não encontrado: ${PRESENCAS_DIR}`);
    }

    const arquivosPresencas = fs.readdirSync(PRESENCAS_DIR).filter(f => f.endsWith('.json'));

    for (const arquivo of arquivosPresencas) {
        const caminho = path.join(PRESENCAS_DIR, arquivo);
        const conteudo = fs.readFileSync(caminho, 'utf-8');
        const presencas = JSON.parse(conteudo);

        for (const presenca of presencas) {
            if (eventosValidos.has(presenca.idEvento)) {
                const idDeputado = presenca.idDeputado;
                const totalAtual = presencasPorDeputado.get(idDeputado) || 0;
                presencasPorDeputado.set(idDeputado, totalAtual + 1);
            }
        }
    }

    console.log(`Contabilizadas presenças para ${presencasPorDeputado.size} deputados diferentes.`);

    // 3. Atualizar no banco de dados
    console.log("Atualizando dados no banco...");
    
    // Obter os deputados, seus mandatos e ultimoStatus
    const todosDeputados = await Deputado.find({}, { _id: 1, ultimoStatus: 1, mandatos: 1 });
    
    const bulkOps = todosDeputados.map(deputado => {
        const idDeputado = deputado._id;
        const mandato = deputado.mandatos?.find(m => m.idLegislatura === idLegislatura);
        const statusMandato = mandato?.ultimoStatus ?? deputado.ultimoStatus;
        
        let sessoesAptas = 0;
        
        if (statusMandato && statusMandato.situacao && statusMandato.data) {
            const dataStatus = new Date(statusMandato.data);
            const situacao = statusMandato.situacao;

            for (const dataEvento of eventosValidos.values()) {
                if (situacao === 'Exercício') {
                    if (dataEvento >= dataStatus) {
                        sessoesAptas++;
                    }
                } else {
                    if (dataEvento <= dataStatus) {
                        sessoesAptas++;
                    }
                }
            }
        } else {
            sessoesAptas = totalEventosGlobais;
        }

        const totalPresencas = presencasPorDeputado.get(idDeputado) || 0;
        
        // Garante que sessoesAptas seja no mínimo igual a totalPresencas para evitar % > 100
        const sessoesBase = Math.max(sessoesAptas, totalPresencas);
        const totalAusencias = sessoesBase - totalPresencas;
        
        const percentual = sessoesBase > 0 
            ? Math.min(100, (totalPresencas / sessoesBase) * 100) 
            : 0;

        const resumoPresencas = {
            totalSessoes: sessoesBase,
            presencas: totalPresencas,
            ausencias: totalAusencias,
            percentualPresenca: parseFloat(percentual.toFixed(2))
        };

        if (mandato) {
            return {
                updateOne: {
                    filter: { _id: idDeputado, "mandatos.idLegislatura": idLegislatura },
                    update: {
                        $set: {
                            "mandatos.$.resumoPresencas": resumoPresencas,
                            ...(idLegislatura === LEGISLATURA_PADRAO ? { resumoPresencas } : {})
                        }
                    }
                }
            };
        } else {
            return {
                updateOne: {
                    filter: { _id: idDeputado },
                    update: {
                        $push: {
                            mandatos: {
                                idLegislatura,
                                ultimoStatus: statusMandato ?? {},
                                estatisticas: {
                                    gastosDespesas: 0,
                                    projetosDeLei: 0,
                                    totalProposicoes: 0,
                                    scoreEficiencia: 0,
                                    custoPorProjetoLei: null,
                                    custoPorProposicao: null,
                                    temasProposicoes: []
                                },
                                resumoPresencas
                            }
                        },
                        ...(idLegislatura === LEGISLATURA_PADRAO ? { $set: { resumoPresencas } } : {})
                    }
                }
            };
        }
    });

    if (bulkOps.length > 0) {
        const result = await Deputado.bulkWrite(bulkOps as any);
        console.log(`Atualização concluída: ${result.modifiedCount} deputados modificados.`);
    } else {
        console.log("Nenhum deputado encontrado no banco para atualizar.");
    }

    console.log("Sincronização de presenças finalizada com sucesso!");
};

if (require.main === module) {
    executarJob("syncPresencas", () => syncPresencas(resolverLegislatura(parseArgs())));
}
