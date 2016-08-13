const passwordHash = require('password-hash');

const {capitalize} = require('../helpers/stringHelpers');
const {userExists, isFalseClaim} = require('../helpers/userHelpers');

const {tokenForUser, requireAuth, requireSignin} = require('../auth');

const express = require('express');
const router = express.Router();

const pool = require('../pool');

router.get('/session', requireAuth, function (req, res) {
  res.send(req.user)
})

router.post('/login', requireSignin, function (req, res) {
  const userId = req.user.id;
  res.send({
    result: "success",
    username: req.user.username,
    userId: userId,
    userType: req.user.userType,
    token: tokenForUser(userId)
  })
})

router.post('/signup', function (req, res) {
  const isTeacher = req.body.isTeacher;
  const username = req.body.username;
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const email = req.body.email;
  const password = req.body.password;
  const realName = capitalize(firstname) + ' ' + capitalize(lastname);
  pool.query('SELECT * FROM users WHERE username = ?', username, (err, rows) => {
    if (!err) {
      if (userExists(rows)) {
        res.json({
          result: "That username already exists"
        });
      } else {
        if (isFalseClaim(email, isTeacher)) {
          res.json({
            result: "That email is not registered as a teacher's email in our database"
          });
        } else {
          saveUserData();
        }
      }
    } else {
      console.log(err);
      res.status(500).send({
        error: err
      });
    }
  });

  function saveUserData() {
    const hashedPass = passwordHash.generate(password);
    const userType = isTeacher ? "teacher" : "user";
    const usernameLowered = username.toLowerCase();
    const post = {
      username: usernameLowered,
      realName,
      email,
      password: hashedPass,
      userType,
      joinDate: Math.floor(Date.now()/1000)
    }
    pool.query('INSERT INTO users SET?', post, function (err, result) {
      if (!err) {
        res.json({
          result: "success",
          username: usernameLowered,
          userType,
          userId: result.insertId,
          token: tokenForUser(result.insertId)
        });
      } else {
        console.error(err);
        res.status(500).send({
          error: err
        });
      }
    });
  }
});

module.exports = router;
