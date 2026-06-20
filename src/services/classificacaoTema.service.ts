import dotenv from "dotenv";
dotenv.config();

const OLLAMA_URL = process.env.OLLAMA_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

const TEMAS_VALIDOS = [
    "Saúde",
    "Educação",
    "Segurança Pública",
    "Economia e Finanças",
    "Agronegócio",
    "Meio Ambiente",
    "Infraestrutura e Transporte",
    "Direitos Humanos e Minorias",
    "Trabalhista e Previdência",
    "Ciência e Tecnologia",
    "Cultura e Esporte",
    "Justiça e Legislação",
    "Direito Penal",
    "Política Externa",
    "Administração Pública",
    "Tributário e Fiscal",
    "Defesa Nacional",
    "Habitação e Urbanismo",
    "Energia",
    "Família e Direito Civil",
    "Outros",
];

export type TemaLegislativo = typeof TEMAS_VALIDOS[number];

const buildPrompt = (ementa: string, keywords: string): string => {
    const textoKeywords = keywords?.trim() ? `\nPalavras-chave: ${keywords}` : "";

    return `Ementa: ${ementa}${textoKeywords}`;
};

const parseTemas = (resposta: string): TemaLegislativo[] => {
    console.log('Resposta: ', resposta);
    // Converte a resposta para minúsculas para facilitar a busca
    const respostaLower = resposta.toLowerCase();

    // Filtra os temas válidos verificando se eles aparecem em qualquer lugar da resposta do modelo
    const temasEncontrados = TEMAS_VALIDOS.filter(tema =>
        respostaLower.includes(tema.toLowerCase())
    );

    console.log('Temas encontrados: ', temasEncontrados);

    return temasEncontrados.length > 0 ? temasEncontrados : ["Outros"];
};

const chamarOllama = async (prompt: string): Promise<string> => {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt,
            stream: false
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama retornou status ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as { response: string };
    return data.response.trim();
};

export class ClassificacaoTemaService {
    private readonly maxRetries: number;
    private readonly retryDelayMs: number;

    constructor(maxRetries = 3, retryDelayMs = 2000) {
        this.maxRetries = maxRetries;
        this.retryDelayMs = retryDelayMs;
    }

    async classificar(ementa: string, keywords: string = ""): Promise<TemaLegislativo[]> {
        const prompt = buildPrompt(ementa, keywords);

        for (let tentativa = 1; tentativa <= this.maxRetries; tentativa++) {
            try {
                const resposta = await chamarOllama(prompt);
                return parseTemas(resposta);
            } catch (err) {
                const isUltimaTentativa = tentativa === this.maxRetries;

                if (isUltimaTentativa) {
                    console.error(`[ClassificacaoTema] Falhou após ${this.maxRetries} tentativas:`, err);
                    return ["Outros"];
                }

                console.warn(`[ClassificacaoTema] Tentativa ${tentativa} falhou, tentando novamente em ${this.retryDelayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));
            }
        }

        return ["Outros"];
    }

    getTemasList(): readonly string[] {
        return TEMAS_VALIDOS;
    }
}
