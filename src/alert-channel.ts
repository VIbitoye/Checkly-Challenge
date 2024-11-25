// alert-channel.ts
import { EmailAlertChannel } from 'checkly/constructs';

export function createEmailAlertChannel(email: string) {
  return new EmailAlertChannel('email-alert-channel', {
    address: email,
    sendFailure: true,
    sendRecovery: true,
    sendDegraded: false,
  });
}
