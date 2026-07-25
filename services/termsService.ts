export const DEFAULT_TERMS_TEXT = `TERMOS DE USO E POLÍTICA DE PRIVACIDADE — SALDO A2
Aviso Importante: Ao criar uma conta, acessar ou utilizar a plataforma Saldo A2, você declara ter lido, compreendido e aceito integralmente os presentes Termos de Uso. Caso não concorde com qualquer uma das disposições abaixo, interrompa o uso do sistema imediatamente.

1. NATUREZA E OBJETO DO SERVIÇO
1.1. O Saldo A2 é uma plataforma digital de gestão financeira pessoal e familiar, disponibilizada como Software como Serviço (SaaS).

1.2. A plataforma destina-se exclusivamente à organização visual, acompanhamento e apoio no planejamento financeiro, não prestando qualquer tipo de consultoria financeira, contábil, jurídica ou de investimentos.

1.3. O Saldo A2 não é uma instituição financeira, não realiza movimentações bancárias em nome do usuário, não efetua custódia de valores e não possui integração direta para efetuar pagamentos ou transferências.

2. LIMITAÇÃO DE RESPONSABILIDADE E AUSÊNCIA DE GARANTIAS
2.1. O serviço é prestado "no estado em que se encontra" (as is) e "conforme disponível" (as available).

2.2. O Saldo A2 não se responsabiliza por:
a) Decisões financeiras, compras, endividamentos ou prejuízos sofridos pelo usuário com base nos dados, gráficos, simulações ou insights gerados pela plataforma.
b) Inexatidão ou erros em lançamentos decorrentes de dados inseridos incorretamente pelo próprio usuário (seja por digitação, envio de imagem para scanner ou comandos de voz).
c) Falhas decorrentes de indisponibilidade temporária de internet do usuário, bugs em navegadores de terceiros ou atualizações de sistemas operacionais.

2.3. As funcionalidades de Inteligência Artificial (A2Bot, leitura de voz e leitor de comprovantes) são ferramentas auxiliares. O usuário reconhece que sistemas de IA podem apresentar inconsistências pontuais e é de responsabilidade exclusiva do usuário conferir a exatidão de cada valor e categoria antes de confirmar o lançamento.

3. PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)
3.1. O Saldo A2 atua como Controlador dos dados pessoais cadastrados e cumpre rigorosamente a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).

3.2. Finalidade: Os dados financeiros e pessoais inseridos (nome, CPF, celular, endereço, receitas, despesas, nomes de contas e categorias) são coletados e processados unicamente para permitir o funcionamento das telas, relatórios e recursos do sistema para o próprio usuário e seu cônjuge/parceiro vinculado.

3.3. Não Comercialização: O Saldo A2 declara expressamente que jamais venderá, alugará ou compartilhará os dados financeiros dos usuários com terceiros para fins publicitários ou comerciais.

3.4. Armazenamento e Criptografia: Os dados são armazenados em infraestrutura de nuvem segura (incluindo serviços como Supabase), utilizando criptografia nas conexões e padrões de segurança de mercado.

3.5. Exclusão de Dados: O usuário pode, a qualquer momento, solicitar a exclusão definitiva de sua conta e de todos os seus registros financeiros armazenados na base de dados por meio da aba de configurações do sistema.

4. DISPONIBILIDADE, MANUTENÇÃO E BACKUPS
4.1. Embora o Saldo A2 utilize rotinas de backup e infraestrutura de alta disponibilidade, o sistema não garante que o serviço será 100% ininterrupto ou livre de falhas.

4.2. Exportação de Dados: É de responsabilidade do usuário realizar periodicamente a exportação de seus relatórios e históricos (via PDF, CSV ou Excel), funcionalidade disponibilizada no painel do sistema.

4.3. O Saldo A2 não será responsabilizado por eventuais perdas acidentais de dados decorrentes de casos fortuito ou força maior, invasões cibernéticas que extrapolem os padrões razoáveis de segurança, ou falhas graves em provedores globais de infraestrutura em nuvem.

5. PAGAMENTO, RENOVAÇÃO E REEMBOLSO
5.1. A assinatura do Saldo A2 é cobrada de forma recorrente (mensal ou anual), de acordo com o plano escolhido no momento da contratação.

5.2. O cancelamento da assinatura pode ser feito pelo usuário a qualquer momento. Ao cancelar, o acesso continuará disponível até o término do período já pago.

5.3. Direito de Arrependimento: Em conformidade com o Artigo 49 do Código de Defesa do Consumidor, o usuário tem o prazo de até 7 (sete) dias corridos após a primeira assinatura para solicitar o cancelamento com reembolso integral do valor pago.

6. DESCONTINUAÇÃO OU ALTERAÇÃO DO SERVIÇO
6.1. O Saldo A2 reserva-se o direito de modificar, suspender ou encerrar a prestação do serviço a qualquer tempo.

6.2. Em caso de encerramento definitivo da plataforma por decisão do desenvolvedor/proprietário:
a) Todos os usuários ativos serão notificados por e-mail e/ou aviso ostensivo no aplicativo com o prazo mínimo de 30 (trinta) dias de antecedência.
b) Durante o período de aviso prévio, a ferramenta de exportação de dados permanecerá 100% funcional para que os usuários baixem todo o seu histórico financeiro.
c) Usuários que possuírem planos anuais vigentes serão reembolsados proporcionalmente pelos meses restantes que não puderem ser utilizados (cálculo pro rata).

7. FORO E LEGISLAÇÃO APLICÁVEL
7.1. Estes Termos são regidos e interpretados de acordo com as leis da República Federativa do Brasil.

7.2. Fica eleito o Foro da Comarca do domicílio do usuário para dirimir quaisquer dúvidas ou litígios decorrentes do presente instrumento.`;

export function getTermsText(): string {
  try {
    const saved = localStorage.getItem('saldo_a2_terms_text');
    if (saved && saved.trim().length > 50) {
      return saved;
    }
  } catch (e) {
    console.warn('Error reading terms from localStorage:', e);
  }
  return DEFAULT_TERMS_TEXT;
}

export function saveTermsText(text: string): void {
  try {
    localStorage.setItem('saldo_a2_terms_text', text);
  } catch (e) {
    console.warn('Error saving terms to localStorage:', e);
  }
}
