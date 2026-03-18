const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Hackathon App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });

    return { success: true, messageId: info.messageId };

  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = sendEmail;