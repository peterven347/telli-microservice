import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.configService.get("EMAIL_USER"),
                pass: "majw rcnp pgok meqd"
            },
        });
    }

    async sendMail(to: string, subject: string, text: string, html?: string) {
        try {
            const info = await this.transporter.sendMail({
                from: `"Telli" <${process.env.EMAIL_USER}>`,
                replyTo: "peterolanrewaju22+resoucepro@gmail.com",
                to,
                subject,
                html
            });
            // return info;
        } catch (err) {
            throw new Error("MAIL_DELIVERY_FAILED");
        }
    }
}
