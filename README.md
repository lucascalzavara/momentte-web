# Momentte.Web

Landing page da Momentte, seguindo a base do Alicerce.Web: Lit, TypeScript e Vite, com app-root, páginas e componentes separados.

## Executar

```sh
npm install
npm run dev
```

Preview local: http://localhost:5174. Para gerar a distribuição: `npm run build`.

## Escopo

Nove seções, navegação responsiva, FAQ expansível e demonstração local de seleção e envio de fotos para um telão. Os logos originais estão em public/brand. Imagens ilustrativas via Unsplash e fontes via Google Fonts dependem de internet.

Login, cadastro, renovação da sessão, eventos e planos estão integrados à Momentte.Api. A área `/conta` permite organizar/editar eventos, escolher ativação gratuita/assinatura/compra, configurar logo/cor antes de iniciar, enviar fotos, abrir telão autenticado, encerrar e baixar mídias no prazo. Os valores da landing page refletem R$30 avulso e R$99/mês com 8 ativações; excedentes R$20 após a franquia do ciclo vigente.

Pagamentos usam checkout hospedado do Mercado Pago; retornar do checkout não libera recursos. Use Atualizar pagamentos para consultar a confirmação no servidor. Execute o SQL de planos e configure credenciais/URLs HTTPS na API conforme `Momentte.Api/docs/plans-and-payments.md`. Sem configuração, o checkout fica desabilitado. Convites e QR estão implementados: `/e/{codigo}` permite ingresso autenticado, envio de imagem, texto ou foto com legenda e acompanhamento dos próprios envios. “Organizo” e “Participo” separam os papéis. `/telao/{id}` exige a conta do organizador e exibe somente conteúdos aprovados. Downloads são liberados após encerrar.

## Autenticação

- `/login`: POST `/api/v1/auth/login`.
- `/cadastro`: POST `/api/v1/auth/register` com nome, e-mail e senha. A confirmação de senha é validada apenas no frontend.
- `/conta`: confirmação de acesso com nome/e-mail e opção de sair; requer sessão válida.

Copie `.env.example` para `.env` se precisar alterar o endereço da API. Em desenvolvimento o Vite encaminha `/api` para `VITE_API_BASE_URL` (padrão `https://localhost:7051`). A aceitação do certificado local pelo proxy se limita ao servidor de desenvolvimento. Em produção a variável deve apontar à URL pública HTTPS da API, com CORS permitindo a origem do frontend; sem a variável, `/api` usa a mesma origem.

Configure a Momentte.Api e execute seu `scripts/init.sql` antes de cadastrar usuários. Inicie ambos os projetos para testar o fluxo real. O host de produção deve encaminhar rotas do frontend (`/login`, `/cadastro`, `/conta`, `/e/{codigo}`, `/telao/{id}`) para `index.html`.

A sessão usa `sessionStorage` nesta aba, com fallback em memória caso o armazenamento esteja bloqueado. Somente tokens/dados de usuário são persistidos; senhas nunca são salvas. Cadastro e login retornam `refreshToken` e `refreshExpiresAt`, além do JWT. A sessão se renova em `/api/v1/auth/refresh-token` um minuto antes da expiração do JWT (para tokens de duração muito curta, na metade da duração). Renova também ao voltar à aba ou recuperar conexão, se necessário, e ao restaurar uma sessão com JWT expirado e refresh ainda válido.

Chamadas simultâneas compartilham uma única promessa de refresh. Falhas de conexão/servidor preservam o refresh para tentar novamente em um minuto; 400/401 encerram a sessão. Sair limpa o armazenamento imediatamente e chama `/api/v1/auth/revoke-token`; respostas tardias de refresh não restauram a sessão. Sem conexão, somente logout local é garantido. O JWT já emitido permanece válido até sua expiração. Sessões antigas sem refresh exigem novo login após esta atualização.

Para futuros endpoints protegidos, use `authenticatedPost` de `src/api/http.ts`: envia Bearer, renova se necessário e repete uma única vez após 401. Chamadas de login/cadastro/refresh/revogação usam `post`, sem loop de renovação. Não há recuperação de senha nesta etapa. Antes de testar com banco existente, execute `Momentte.Api/scripts/002_refresh_tokens.sql`.

Verificações locais de endpoints/payloads, erros HTTP, refresh automático/concorrente, falhas de rede, restauração, logout durante refresh e repetição após 401: `node tests/auth-checks.mjs`. Usam respostas simuladas e não criam usuários no banco.

Teste dos QR e retorno ao convite: `node tests/event-checks.mjs`. Aplique manualmente o SQL 004 na API antes de utilizar os novos fluxos.

## Telas durante o evento

No detalhe de um evento ativo, use **Abrir moderação** para acessar `/moderacao/{id}`. A tela é exclusiva do organizador, atualiza a cada 5 segundos e oferece filtros de pendentes, aprovados e rejeitados, miniaturas privadas e aprovação/rejeição por envio. Com moderação desativada, os envios são aprovados automaticamente. Os contadores abrangem até 200 registros retornados pela API.

Convidados usam o link ou QR `/e/{codigo}`. Após entrar, podem selecionar uma imagem, escrever um texto ou combinar foto e legenda conforme a configuração. Antes do envio há uma revisão; o histórico mostra miniaturas e status dos próprios conteúdos e atualiza a cada 20 segundos. As telas de moderação e telão preservam o destino após login. O telão consulta somente aprovados a cada 5 segundos.

Estas telas reutilizam os endpoints existentes e não exigem um novo SQL além do 004. Validação visual realizada com a fixture local (sem PostgreSQL ou cobranças reais).
