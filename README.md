# 🏛️ Depudados - Backend & API REST

> API RESTful para consolidação, enriquecimento com inteligência artificial e disponibilização de dados abertos da Câmara dos Deputados do Brasil.

[![API em Produção](https://img.shields.io/badge/API_Online-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://backend-projeto-depudados.onrender.com)
[![Aplicação Web](https://img.shields.io/badge/Aplicação_Web-depudados.web.app-brightgreen?style=for-the-badge&logo=firebase)](https://depudados.web.app/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Ollama](https://img.shields.io/badge/IA-Ollama_LLM-black?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.com/)

---

## 🌐 Localização em Produção & Ecossistema

- **API REST em Produção:** [https://backend-projeto-depudados.onrender.com](https://backend-projeto-depudados.onrender.com)
- **Frontend em Produção:** [https://depudados.web.app/](https://depudados.web.app/)
- **Repositório Frontend:** [frontend-projeto-deputados](https://github.com/LucasLevyOB/frontend-projeto-deputados)

> **Contexto Acadêmico:** Projeto desenvolvido no âmbito da disciplina de **Programação para Internet e Web (PIW)** do curso de Engenharia de Software da **Universidade Federal do Ceará (UFC)**.

---

## 🛠️ Tecnologias Utilizadas

| Categoria | Tecnologia | Finalidade |
| :--- | :--- | :--- |
| **Ambiente de Execução** | [Node.js](https://nodejs.org/) (v18+) | Runtime JavaScript assíncrono e orientado a eventos |
| **Linguagem** | [TypeScript 6](https://www.typescriptlang.org/) | Tipagem estática rigorosa, contratos de interfaces e segurança em tempo de compilação |
| **Framework Web** | [Express 5](https://expressjs.com/) | Estruturação de middlewares, rotas e controllers RESTful |
| **Banco de Dados** | [MongoDB](https://www.mongodb.com/) | Banco NoSQL orientado a documentos para armazenamento em alta escala |
| **ODM / Modelagem** | [Mongoose 9](https://mongoosejs.com/) | Modelagem de schemas, validação e abstração de consultas no MongoDB |
| **Inteligência Artificial** | [Ollama](https://ollama.com/) (Gemma) | Classificação semântica em lote de proposições legislativas por tema de atuação |
| **Segurança & Config** | [CORS](https://github.com/expressjs/cors) & [Dotenv](https://github.com/motdotla/dotenv) | Controle de origens autorizadas (Firebase/Local) e gerenciamento de variáveis de ambiente |
| **Desenvolvimento & Build** | [ts-node-dev](https://github.com/wclr/ts-node-dev) / [tsc-alias](https://github.com/justkey007/tsc-alias) | Recarregamento a quente (hot reload) e resolução de aliases `@/...` na compilação |

---

## 📐 Práticas de Código e Padrões Arquiteturais

O backend adota padrões consolidados de engenharia de software para assegurar manutenibilidade, alta performance e desacoplamento:

### 1. Arquitetura em Camadas (SOLID / Clean Architecture)
- **Thin Controllers (`src/controllers/`):** Controladores enxutos e estritamente responsáveis pelo ciclo HTTP: recebem a requisição, delegam para a camada de serviços e serializam as respostas ou encaminham erros.
- **Services de Domínio (`src/services/`):** Concentram 100% das regras de negócio, validações e orquestrações. Aplica-se injeção e composição de dependências (por exemplo, `DeputadoService` recebe instâncias de serviços de despesas, proposições e votações para realizar o cruzamento lógico das entidades).
- **Repositories (`src/repositories/`):** Isolam o acesso ao banco de dados e abstraem chamadas do Mongoose (`find`, `aggregate`, `updateOne`, `countDocuments`). O restante do sistema não depende de detalhes de implementação do ODM.

### 2. Padrão de Pré-Agregação (*Materialized Views* no MongoDB)
No MongoDB, consultas analíticas com ordenação global rápida de campos calculados (como cruzamento de despesas, quantidade de proposições e métricas de votações) se tornariam lentas se executadas via `$lookup` em tempo de requisição (*on the fly*).
- **Abordagem adotada:** Scripts agendados / jobs de background realizam os cálculos pesados e consolidam os resultados finais diretamente em campos indexados nos documentos de parlamentares (ex.: objeto `estatisticas` em `Deputado`).
- **Benefício:** A listagem e ordenação paginada da API executa operações nativas e instantâneas de `.find().sort()`, com altíssimo throughput.

### 3. Regra de Negócio: Score de Eficiência Parlamentar
O cálculo de eficiência mensura a relação entre a produção legislativa ponderada e os recursos financeiros utilizados pela cota parlamentar (CEAP):
- **Pesos de Produção Legislativa:**
  - **Projetos de Lei (`codTipo: 139`):** Peso **10** (alta complexidade e impacto legislativo direto).
  - **Outras Proposições (requerimentos, emendas, homenagens):** Peso **1**.
- **Fórmula:**
  $$\text{Produção Ponderada} = (\text{ProjetosDeLei} \times 10) + (\text{DemaisProposições} \times 1)$$
  $$\text{Score de Eficiência} = \left(\frac{\text{Produção Ponderada}}{\text{Gastos Válidos}}\right) \times 100.000$$
- **Tratamento de Exceções:** Para mitigar divisão por zero, caso os gastos computados sejam iguais a zero ou negativos, adota-se o piso de R$ 1,00 para preservação da escala matemática.

### 4. Estilo de Código e Contratos
- **Padronização de Paginação:** Todas as listagens paginadas aderem rigorosamente ao contrato genérico `IPagedResponse<T>` (`data`, `total`, `page`, `limit`, `totalPages`) localizado em `src/types/PagedResponse.ts`.
- **Estilo Funcional e Previsível:** Preferência estrita por `const`, utilização de *arrow functions*, funções puras para transformações de dados e implementação direta/imperativa nas rotinas analíticas dos serviços.

---

## 🤖 Pipeline de Dados & Jobs de Sincronização

A aplicação dispõe de rotinas automatizadas para enriquecimento de dados e inferência semântica com Inteligência Artificial:

```bash
# Sincroniza e consolida estatísticas gerais e calcula score de eficiência dos deputados
npm run sync:estatisticas

# Classifica temas das proposições legislativas via LLM local (Ollama) e agrega aos deputados
npm run sync:temas

# Limpa classificações anteriores de temas para reprocessamento
npm run reset:temas

# Sincroniza e normaliza proposições legislativas para o banco de dados
npm run sync:proposicoes

# Consolida presença e assiduidade parlamentar em sessões e votações
npm run sync:presencas
```

> [!TIP]
> O job `sync:temas` conecta-se a uma instância do **Ollama** configurada no `.env` utilizando um modelo customizado (ex.: `gemma4`), processando as ementas e palavras-chave em lotes concorrentes para categorização temática automática.

---

## 🔌 Principais Endpoints da API REST

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `GET` | `/` | Health check da API |
| `GET` | `/deputados` | Listagem paginada de deputados com filtros (UF, partido, ordenação por gastos/produção/score) |
| `GET` | `/deputados/busca` | Busca textual simplificada por nome de parlamentares |
| `GET` | `/deputados/:id` | Detalhes completos do deputado (biografia, estatísticas agregadas e temas) |
| `GET` | `/deputados/:id/proposicoes` | Listagem paginada das proposições de autoria do parlamentar |
| `GET` | `/deputados/:id/votacoes` | Histórico paginado de votações e posicionamento do parlamentar |
| `GET` | `/despesas` | Consulta paginada dos registros da cota parlamentar |
| `GET` | `/despesas/deputado/:idDeputado` | Detalhamento, agrupamento e séries temporais de despesas do parlamentar |
| `GET` | `/proposicoes` | Consulta e listagem de matérias legislativas |
| `GET` | `/partidos` | Listagem e informações dos partidos políticos registrados |
| `GET` | `/votacoes/comparar` | Comparação lado a lado do alinhamento de votos entre dois parlamentares |

---

## 📂 Estrutura do Projeto

```text
backend-projeto-depudados/
├── .docs/                  # Documentações complementares de arquitetura
│   └── backend-architecture.md
├── src/
│   ├── config/             # Conexão com MongoDB e configurações globais
│   ├── controllers/        # Controladores HTTP (Thin Controllers)
│   ├── jobs/               # Scripts de sincronização de dados e classificação via IA
│   │   ├── syncDeputadosDetalhados.ts
│   │   ├── syncEstatisticas.ts
│   │   ├── syncPresencas.ts
│   │   ├── syncProposicoesBusca.ts
│   │   └── syncTemas.ts
│   ├── middlewares/        # Middlewares Express (validações, tratamento de erros)
│   ├── models/             # Schemas e Models do Mongoose (Deputado, Despesa, etc.)
│   ├── repositories/       # Abstração de persistência e consultas ao banco
│   ├── routes/             # Definição e mapeamento dos endpoints Express
│   ├── services/           # Regras de negócio, cálculos analíticos e injeção de dependência
│   ├── types/              # Contratos de tipos (IPagedResponse<T>, etc.)
│   ├── utils/              # Funções utilitárias auxiliares
│   └── app.ts              # Inicialização do Express, CORS e registro de rotas
├── .env.example            # Modelo de configuração de variáveis de ambiente
├── Modelfile.example       # Exemplo de configuração de System Prompt para o Ollama
├── package.json            # Metadados, scripts e dependências do Node.js
└── tsconfig.json           # Configurações do compilador TypeScript e path aliases
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos

- **Node.js** (versão 18 ou superior)
- **MongoDB** (instância local em execução ou URI do MongoDB Atlas)
- **Ollama** *(opcional)*: necessário apenas para executar o job de classificação de temas por IA (`sync:temas`)

### Passo a Passo

1. **Acesse o diretório do backend:**
   ```bash
   cd backend-projeto-depudados
   ```

2. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do backend baseado no `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Edite o arquivo `.env` com suas credenciais:
   ```env
   PORT=3001
   DATABASE_URL=mongodb://localhost:27017/projeto-deputados
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=gemma4
   ```

3. **Instale as dependências:**
   ```bash
   npm install
   ```

4. **Inicie o servidor em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```
   O servidor estará acessível em: `http://localhost:3001` (com suporte a hot reload via `ts-node-dev`).

---

## 📜 Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento com TypeScript e recarregamento automático.
- `npm run build`: Compila o código TypeScript para JavaScript na pasta `dist/` com resolução de aliases (`tsc-alias`).
- `npm start`: Inicia o servidor compilado em ambiente de produção (`node dist/app.js`).
- `npm run sync:estatisticas`: Executa o job de consolidação de métricas e score de eficiência.
- `npm run sync:temas`: Executa o job de classificação semântica de proposições via IA com Ollama.
- `npm run reset:temas`: Remove temas classificados para reexecução completa do pipeline de IA.
- `npm run sync:proposicoes`: Sincroniza e normaliza as proposições legislativas.
- `npm run sync:presencas`: Sincroniza o histórico de presenças e votações em plenário.