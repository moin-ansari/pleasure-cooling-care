import User from "@/models/user.model";
import nodemailer from "nodemailer";
import bcryptjs from "bcryptjs";

export const sendEmail = async ({ email, emailType, userId }: any) => {
  try {
    const hashedToken = await bcryptjs.hash(userId.toString(), 10);
    
    if (emailType === "VERIFY") {
      await User.findByIdAndUpdate(userId, {
        $set: {
          verifyToken: hashedToken,
          verifyTokenExpiry: Date.now() + 3600000,
        }
      });
    } else if (emailType === "RESET") {
      await User.findByIdAndUpdate(userId, {
        $set: {
          forgotPasswordToken: hashedToken,
          forgotPasswordTokenExpiry: Date.now() + 3600000,
        }
      });
    }

    const transport = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: "fdce09ebcf9884",
        pass: "ffe96b27f8ac7a",
      },
    });
    
    const VERIFICATION_URL = `http://localhost:3000/verifyEmail?token=${hashedToken}`;
    const mailOption = {
      from: "ahmadparvej58@gmail.com", // sender address
      to: email, // list of receivers
      subject:
        emailType === "VERIFY" ? "Veirfy your email" : "Reset your password", // Subject line
      html: `<html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #007bff;
            color: #fff;
            text-decoration: none;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Welcome to Our Website!</h2>
          <p>
            Thank you for signing up! To verify your email address, please click the
            button below.
          </p>
          <a href="${VERIFICATION_URL}" class="button">Verify Email</a>
          <p>
            If you didn't sign up for an account, you can safely ignore this email.
          </p>
        </div>
      </body>
      </html>
      `, // html body
    };

    const mailResponse = await transport.sendMail(mailOption);
    return mailResponse;
  } catch (error: any) {
    throw new Error("catch: " + error.message);
  }
};
