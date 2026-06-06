import express from 'express';
import dotenv from 'dotenv';
import connectDB from '@/config/database';
import cors from 'cors';
import deputadoRoute from "@/routes/deputado.route";
import despesaRoute from "@/routes/despesa.route";
import proposicaoRoute from "@/routes/proposicao.route";

dotenv.config();

connectDB();

const app = express();
const PORT = process.env.PORT;
const corsOptions = {
    origin: 'http://localhost:5173',
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ mensagem: 'API funcionando perfeitamente!' });
});

app.use("/deputados", deputadoRoute);
app.use("/despesas", despesaRoute);
app.use("/proposicoes", proposicaoRoute);

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
