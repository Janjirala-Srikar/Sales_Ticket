const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await userModel.createUser(name, email, hashedPassword);

    res.status(201).json({ message: "User registered successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const createRole = async (req, res) => {
  try {
    const { email, role, passkey } = req.body;

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPasskey = await bcrypt.hash(passkey, 10);

    await userModel.createAccessAccount(user.id, role, hashedPasskey);

    res.json({ message: "Role created successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const roleLogin = async (req, res) => {
  try {
    const { email, passkey } = req.body;

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const accessAccounts = await userModel.getAccessAccountsByUserId(user.id);

    let matchedRole = null;

    for (let acc of accessAccounts) {
      const isMatch = await bcrypt.compare(passkey, acc.passkey);

      if (isMatch) {
        matchedRole = acc.role;
        break;
      }
    }

    if (!matchedRole) {
      return res.status(400).json({ message: "Invalid passkey" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: matchedRole, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      role: matchedRole,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: matchedRole,
      },
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  createRole,
  roleLogin
};
