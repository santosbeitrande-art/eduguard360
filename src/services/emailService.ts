import {
  generateRandomPassword,
  generateAccessCode,
  formatCredentialEmailBody,
  formatNewRegistrationsNotification,
} from "@/utils/credentialGenerator";

const formSubmitBase = 'https://formsubmit.co/ajax';
const formSubmitVerifiedRecipient = 'admin@eduguard360.co.mz';

const formatGuardianNotification = (
  guardianName: string,
  studentName: string,
  schoolName: string,
  entryType: 'entrada' | 'saida',
  entryTime: string
): string => {
  const movement = entryType === 'entrada' ? 'entrou' : 'saiu';
  return `Olá ${guardianName},

Informamos que o aluno ${studentName} ${movement} na escola ${schoolName} às ${entryTime}.

Detalhes da ocorrência:
- Movimento: ${entryType === 'entrada' ? 'Entrada' : 'Saída'}
- Hora: ${entryTime}
- Escola: ${schoolName}

Se precisar de apoio, aceda à sua área de pais em: https://eduguard360.co.mz/sistema/pais

Atenciosamente,
Equipa EduGuard360
`;
};

/**
 * Serviço para enviar credenciais automáticamente por email
 */
export class EmailService {
  /**
   * Envia credenciais de director para email
   */
  static async sendDirectorCredentials(
    email: string,
    name: string,
    password: string,
    schoolName: string
  ): Promise<boolean> {
    try {
      const body = formatCredentialEmailBody(
        "director",
        name,
        email,
        password,
        undefined,
        schoolName
      );

      const response = await fetch(
        "https://formsubmit.co/ajax/admin@eduguard360.co.mz",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            _subject: `[EduGuard360] Credenciais de Acesso - Director: ${name}`,
            _captcha: "false",
            email: email,
            name: name,
            credentials: password,
            schoolName: schoolName,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error("Erro ao enviar credenciais de director:", error);
      return false;
    }
  }

  /**
   * Envia código de acesso para segurança por email
   */
  static async sendSecurityAccessCode(
    email: string,
    name: string,
    accessCode: string,
    schoolName: string
  ): Promise<boolean> {
    try {
      const body = formatCredentialEmailBody(
        "security",
        name,
        email,
        "",
        accessCode,
        schoolName
      );

      const response = await fetch(
        "https://formsubmit.co/ajax/admin@eduguard360.co.mz",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            _subject: `[EduGuard360] Código de Acesso - Segurança: ${name}`,
            _captcha: "false",
            email: email,
            name: name,
            accessCode: accessCode,
            schoolName: schoolName,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error("Erro ao enviar código de segurança:", error);
      return false;
    }
  }

  /**
   * Notifica o admin sobre novas escolas registadas
   */
  static async notifyAdminNewRegistrations(
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
  ): Promise<boolean> {
    try {
      const body = formatNewRegistrationsNotification(registrations);

      const response = await fetch(
        "https://formsubmit.co/ajax/admin@eduguard360.co.mz",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            _subject: `[EduGuard360] Notificação: ${registrations.length} Nova(s) Escola(s) Registada(s)`,
            _captcha: "false",
            message: body,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error("Erro ao notificar admin:", error);
      return false;
    }
  }

  /**
   * Envia um alerta de entrada/saída para o encarregado de educação
   */
  static async sendGuardianEntryExitAlert(
    guardianEmail: string,
    guardianName: string,
    studentName: string,
    schoolName: string,
    entryType: 'entrada' | 'saida',
    entryTime: string
  ): Promise<boolean> {
    try {
      const message = formatGuardianNotification(
        guardianName,
        studentName,
        schoolName,
        entryType,
        entryTime
      );

      // Usa destinatário verificado no FormSubmit e envia cópia para o encarregado.
      const response = await fetch(
        `${formSubmitBase}/${encodeURIComponent(formSubmitVerifiedRecipient)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            _subject: `[EduGuard360] ${studentName} ${entryType === 'entrada' ? 'entrou' : 'saiu'} da escola`,
            _captcha: 'false',
            _cc: guardianEmail,
            _replyto: guardianEmail,
            email: guardianEmail,
            name: guardianName,
            studentName,
            schoolName,
            movement: entryType === 'entrada' ? 'Entrada' : 'Saída',
            time: entryTime,
            message,
          }),
        }
      );

      if (!response.ok) {
        const responseText = await response.text().catch(() => '');
        console.warn('FormSubmit respondeu com erro no alerta ao encarregado:', response.status, responseText);
      }

      return response.ok;
    } catch (error) {
      console.error('Erro ao enviar alerta ao encarregado:', error);
      return false;
    }
  }

  /**
   * Envia link de acesso para encarregado de educação após ser associado a um aluno
   */
  static async sendParentAccessLink(
    email: string,
    parentName: string,
    childName: string,
    schoolName: string
  ): Promise<boolean> {
    try {
      const response = await fetch(
        "https://formsubmit.co/ajax/admin@eduguard360.co.mz",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            _subject: `[EduGuard360] Bem-vindo à Plataforma de Segurança Escolar`,
            _captcha: "false",
            parentEmail: email,
            parentName: parentName,
            childName: childName,
            schoolName: schoolName,
            message: `
Olá ${parentName},

O seu educando ${childName} foi registado na escola ${schoolName} no sistema EduGuard360.

A partir de agora, receberá notificações em tempo real quando ${childName} entra ou sai da escola.

Aceda à sua conta em: https://eduguard360.co.mz/sistema

Use o seu email (${email}) para fazer login.

Atenciosamente,
Equipa EduGuard360
            `,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error("Erro ao enviar link para encarregado:", error);
      return false;
    }
  }
}
