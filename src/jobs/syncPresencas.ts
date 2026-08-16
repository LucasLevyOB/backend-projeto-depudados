import * as fs from 'fs';
import * as path from 'path';
import connectDB from '@/config/database';
import { Deputado } from '@/models/deputado.model';

const EVENTOS_DIR = path.resolve(__dirname, '../../../dados/eventos');
const PRESENCAS_DIR = path.resolve(__dirname, '../../../dados/presencas');

async function run() {
    console.log("Iniciando sincronização de presenças dos deputados com heurística de data...");

    // 1. Coletar IDs de eventos válidos
    console.log("Lendo arquivos de eventos...");
    const eventosValidos = new Map<number, Date>();
    
    if (!fs.existsSync(EVENTOS_DIR)) {
        console.error(`Diretório de eventos não encontrado: ${EVENTOS_DIR}`);
        process.exit(1);
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
                
                if (idEvento && !isNaN(dataInicio.getTime())) {
                    eventosValidos.set(idEvento, dataInicio);
                }
            }
        }
    }

    const totalEventosGlobais = eventosValidos.size;
    console.log(`Encontrados ${totalEventosGlobais} eventos válidos (Sessão Deliberativa não cancelada).`);

    // 2. Contabilizar presenças por deputado
    console.log("Lendo arquivos de presenças...");
    const presencasPorDeputado = new Map<number, number>();

    if (!fs.existsSync(PRESENCAS_DIR)) {
        console.error(`Diretório de presenças não encontrado: ${PRESENCAS_DIR}`);
        process.exit(1);
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
    console.log("Conectando ao MongoDB...");
    await connectDB();
    console.log("Conectado com sucesso.");

    console.log("Atualizando dados no banco...");
    
    // Obter os deputados e seus ultimoStatus
    const todosDeputados = await Deputado.find({}, { _id: 1, ultimoStatus: 1 });
    
    const bulkOps = todosDeputados.map(deputado => {
        const idDeputado = deputado._id;
        
        let sessoesAptas = 0;
        
        if (deputado.ultimoStatus && deputado.ultimoStatus.situacao && deputado.ultimoStatus.data) {
            const dataStatus = new Date(deputado.ultimoStatus.data);
            const situacao = deputado.ultimoStatus.situacao;

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

        return {
            updateOne: {
                filter: { _id: idDeputado },
                update: {
                    $set: {
                        "resumoPresencas.totalSessoes": sessoesBase,
                        "resumoPresencas.presencas": totalPresencas,
                        "resumoPresencas.ausencias": totalAusencias,
                        "resumoPresencas.percentualPresenca": parseFloat(percentual.toFixed(2))
                    }
                }
            }
        };
    });

    if (bulkOps.length > 0) {
        const result = await Deputado.bulkWrite(bulkOps);
        console.log(`Atualização concluída: ${result.modifiedCount} deputados modificados.`);
    } else {
        console.log("Nenhum deputado encontrado no banco para atualizar.");
    }

    console.log("Sincronização de presenças finalizada com sucesso!");
    process.exit(0);
}

run().catch(err => {
    console.error("Erro durante a sincronização de presenças:", err);
    process.exit(1);
});
