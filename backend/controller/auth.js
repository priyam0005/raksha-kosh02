const User = require("../schema/userSchema");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const AuthController = {
  async Login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user)
        return res
          .status(401)
          .json({ message: "User not found, sign up instead" });

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });

      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, name: user.name },
        process.env.JWT_SECRET_TOKEN,
        { expiresIn: "12h" },
      );

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          totalScans: user.totalScans,
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async Register(req, res) {
    try {
      const { email, name, password } = req.body;

      const userExists = await User.findOne({ email });
      if (userExists)
        return res.status(400).json({ message: "User already exists" });

      const passwordHash = await bcrypt.hash(password, 10);

      const user = new User({ name, email, passwordHash });
      await user.save();

      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

module.exports = AuthController;
