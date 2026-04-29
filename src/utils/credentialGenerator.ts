/**
 * Utilitário para gerar credenciais aleatórias seguras para Directores, Segurança e Encarregados de Educação
 */

/**
 * Gera uma senha aleatória segura com 12 caracteres
 * Combina maiúsculas, minúsculas, números e símbolos
 */
export const generateRandomPassword = (): string => {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";

  const allChars = uppercase + lowercase + numbers + symbols;
  let password = "";

  // Garantir pelo menos um de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Preencher o resto aleatoriamente
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Embaralhar
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

/**
 * Gera um código de acesso numérico de 6 dígitos para Segurança/QR
 */
export const generateAccessCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Formata uma mensagem com as credenciais para envio por email
 */
export const formatCredentialEmailBody = (
  userType: "director" | "security",
  name: string,
  email: string,
  password: string,
  accessCode?: string,
  schoolName?: string
): string => {
  let body = "";

  if (userType === "director") {
    body = `
Olá ${name},

A sua conta foi registada com sucesso no sistema EduGuard360.

CREDENCIAIS DE ACESSO:
- Email: ${email}
- Senha: ${password}
- Escola: ${schoolName || "N/A"}

Por favor, altere a sua senha no primeiro acesso.

Aceda ao sistema em: https://eduguard360.co.mz/sistema

Atenciosamente,
Equipa EduGuard360
    `;
  } else if (userType === "security") {
    body = `
Olá ${name},

A sua conta foi registada com sucesso no sistema EduGuard360 - Módulo de Segurança.

CREDENCIAIS DE ACESSO:
- Código de Acesso: ${accessCode}
- Escola: ${schoolName || "N/A"}

Use este código para aceder ao Scanner QR.

Aceda ao sistema em: https://eduguard360.co.mz/sistema

Atenciosamente,
Equipa EduGuard360
    `;
  }

  return body;
};

/**
 * Formata um sumário de credenciais para envio ao admin
 */
export const formatNewRegistrationsNotification = (
  registrations: {
    schoolName: string;
    directorName: string;
    directorEmail: string;
    directorPassword: string;
    securityPersons: Array<{
      name: string;
      accessCode: string;
    }>;
  }[]
): string => {
  let body = `
NOTIFICAÇÃO: Novas Escolas Registadas no EduGuard360

${registrations
  .map(
    (reg, idx) => `
${idx + 1}. ${reg.schoolName}

   DIRETOR:
   - Nome: ${reg.directorName}
   - Email: ${reg.directorEmail}
   - Senha Temporária: ${reg.directorPassword}
   
   PESSOAL DE SEGURANÇA (${reg.securityPersons.length}):
${reg.securityPersons
  .map((s) => `   - ${s.name}: Código ${s.accessCode}`)
  .join("\n")}
`
  )
  .join("\n")}

Todos os códigos foram enviados para os respetivos utilizadores.

Atenciosamente,
Sistema EduGuard360
  `;

  return body;
};
