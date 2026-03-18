const sendEmail = require("../utils/mailer");

const sendMailHandler = async (req, res) => {
  try {
    const { email, subject, message } = req.body;

    const result = await sendEmail({
      to: email,
      subject: subject,
      text: message,
      html: `<h3>${message}</h3>`
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ message: "Email sent successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { sendMailHandler };