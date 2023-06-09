const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetchuser = require("../middleware/fetchuser");

const JWT_SECRET = "Anshuman";

// ROUTE 1: create a User using: POST "/api/auth/createuser". No login required.

router.post(
  "/createuser",
  [
    body("email", "Enter a valid email").isEmail(),
    body("name", "Enter a valid name").isLength({ min: 3 }),
    body("password", "Password must be atleast 5 characters").isLength({
      min: 5,
    }),
  ],
  async (req, res) => {
    try {
      let success = false;
      //If there are errors, return bad request and the errors.
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        success = false;
        return res.status(400).json({ success, errors: errors.array() });
      }

      //check weather the user with this email exits already.
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        success = false;
        return res
          .status(400)
          .json({ success, error: "Sorry a user with this email exists" });
      }

      const salt = await bcrypt.genSalt(10);
      const secPass = await bcrypt.hash(req.body.password, salt);

      //Create a new user.
      user = await User.create({
        name: req.body.name,
        password: secPass,
        email: req.body.email,
      });

      const payload = {
        user: {
          id: user.id,
        },
      };

      success = true;
      const authToken = jwt.sign(payload, JWT_SECRET);
      res.json({ success, authToken });
    } catch (err) {
      console.log(err);
      res.status(500).send("Some error occured");
    }
  }
);

//ROUTE 2: Authenticate a user using POST "/api/auth/login" . No login required.

router.post(
  "/login",
  [
    body("email", "Enter a valid email").isEmail(),
    body("password", "Password cannot be blank").exists(),
  ],
  async (req, res) => {
    let success = false;

    //If there are errors, return bad request and the errors.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      success = false;
      return res.status(400).json({ success, errors: errors.array() });
    }

    //these are the data given by the user while logging in.
    const email = req.body.email;
    const password = req.body.password;

    try {
      let user = await User.findOne({ email: email });
      if (!user) {
        success = false;
        return res.status(400).json({
          success,
          error: "Please try to login with correct credentials.",
        });
      }
      //Ther given method take two functions (password String given by the user, the hash string previously generated by the backend)
      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        success = false;
        return res.status(400).json({
          success,
          error: "Please try to login with correct credentials.",
        });
      } else {
        success = true;
        const payload = {
          user: {
            id: user.id,
          },
        };

        const authToken = jwt.sign(payload, JWT_SECRET);
        res.json({ success, authToken });
      }
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal Server Error.");
    }
  }
);

// ROUTE 3: Get logged in user Details: POST "/api/auth/getuser". login Required

router.post("/getuser", fetchuser, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    res.send(user);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Internal Server Error");
  }
});
module.exports = router;
