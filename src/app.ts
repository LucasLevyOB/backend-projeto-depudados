import express from 'express';
import dotenv from 'dotenv';
import connectDB from '@/config/database';
import cors from 'cors';
import deputadoRoute from "@/routes/deputado.route";
import despesaRoute from "@/routes/despesa.route";
import proposicaoRoute from "@/routes/proposicao.route";
import partidoRoute from "@/routes/partido.route";
import votacaoRoute from "@/routes/votacao.route";
import pingRoute from "@/routes/ping.route";

dotenv.config();

connectDB();

const app = express();
const PORT = process.env.PORT;
const productionOrigins = [
    'https://depudados.web.app',
    'https://depudados.firebaseapp.com',
    'https://frontend-projeto-deputados--depudados.us-east4.hosted.app',
    'https://depudados.com.br'
];

const allowedOrigins = process.env.NODE_ENV === 'production'
    ? productionOrigins
    : [...productionOrigins, 'http://localhost:5173', 'http://localhost:8080'];

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado pelo CORS'));
        }
    },
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ mensagem: 'API funcionando perfeitamente!' });
});

app.use("/ping", pingRoute);
app.use("/deputados", deputadoRoute);
app.use("/despesas", despesaRoute);
app.use("/proposicoes", proposicaoRoute);
app.use("/partidos", partidoRoute);
app.use("/votacoes", votacaoRoute);

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
