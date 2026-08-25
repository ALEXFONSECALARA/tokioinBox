#!/usr/bin/env node
// v107 — AUDITORIA: este arquivo era uma CÓPIA EXATA de print-agent/print-agent.js, parada na
// raiz do projeto, sem nenhum instalador/rota/link do sistema apontando pra ela (confirmado por
// busca em todo o projeto). O agente de verdade, instalado nos computadores da loja, SEMPRE
// rodou a partir de dentro da pasta print-agent/ (o próprio instalador, print-agent/instalar.ps1,
// exige isso). O risco real dessa duplicata: alguém editar/corrigir um bug bem aqui, achando que
// é "o" arquivo, enquanto a loja continua rodando a cópia de print-agent/ sem a correção — o que
// já pode ter acontecido antes. Por segurança, este arquivo vira só um aviso — se alguém tentar
// rodar "node print-agent.js" direto da raiz por engano, ele falha alto e claro, apontando pro
// lugar certo, em vez de rodar uma cópia potencialmente desatualizada em silêncio.
console.error('\n⚠️  Este não é o Agente de Impressão de verdade.');
console.error('   O arquivo real fica em: print-agent/print-agent.js');
console.error('   Para instalar/rodar o agente, use a pasta print-agent/ (veja print-agent/README.md ou rode print-agent/INSTALAR.bat).\n');
process.exit(1);
