Usar o MongoDB Atlas para o banco de dados
- Plano Flex (necessário devido ao tamanho do banco exceder o limite de 512 MB do plano M0).
- Suporte a maior volume de dados, escalabilidade elástica e TLS/SSL obrigatório.
- Para segurança, seguir as diretrizes de [seguranca-conexao-com-banco.md](./seguranca-conexao-com-banco.md).

Usar o Render.com para o backend (Web Service)
- Executa a aplicação Express nativamente via `npm run build` e `npm run start` (sem necessidade de adaptação para serverless).
- A conexão com o MongoDB é estabelecida uma única vez na inicialização do servidor e reaproveitada em todas as requisições.
- Ponto de atenção (Plano Free): O Render hiberna o serviço após 15 minutos sem requisições. O primeiro acesso após inatividade leva cerca de 50 segundos para despertar.
- Configurar as variáveis de ambiente (`DATABASE_URL`, `PORT`, etc.) diretamente na aba "Environment" do serviço no Render.
- Ajustar o CORS no Express para permitir tanto o ambiente local quanto o domínio do frontend em produção.

Usar o Firebase Hosting para o frontend
- Hospedagem estática gratuita para o build do Vite (`dist/`).
- Configurar `firebase.json` com rewrites para `/index.html` garantindo o funcionamento do `react-router-dom`.
- Domínio customizado: `depudados.com.br` (registrado via Registro.br e apontado para o Firebase Hosting).