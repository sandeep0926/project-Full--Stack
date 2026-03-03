import logger from './logger.js';

let smsClient = null;

const getSmsClient = async () => {
    if (smsClient) return smsClient;

    const accountSid = process.env.SMS_TWILIO_ACCOUNT_SID;
    const authToken = process.env.SMS_TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        logger.warn('SMS client not configured (missing Twilio env vars)');
        return null;
    }

    const twilio = (await import('twilio')).default;
    smsClient = twilio(accountSid, authToken);
    return smsClient;
};

const sendSms = async ({ to, body }) => {
    const client = await getSmsClient();
    if (!client) {
        logger.warn(`SMS skipped (not configured) to ${to}: ${body}`);
        return;
    }

    try {
        const from = process.env.SMS_FROM_NUMBER;
        await client.messages.create({ to, from, body });
        logger.info(`SMS sent to ${to}`);
    } catch (error) {
        logger.error(`SMS send failed: ${error.message}`);
        throw error;
    }
};

export { sendSms };

