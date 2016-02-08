/**
 * Created by rubenschmidt on 08.02.2016.
 */
var express = require('express'),
    router = express.Router(),
    passport = require('passport');
User = require('../models/user.js');


router.post('/register', function(req, res) {
    console.log(req.body);
    User.register(new User({ username: req.body.username }), req.body.password, function(err, account) {
        if (err) {
            return res.status(500).json({err: err});
        }
        passport.authenticate('local')(req, res, function () {
            return res.status(200).json({status: 'Brukeren er registrert!'});
        });
    });
});

router.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            return res.status(500).json({err: err});
        }
        if (!user) {
            return res.status(401).json({err: info});
        }
        req.logIn(user, function(err) {
            if (err) {
                return res.status(500).json({err: 'Klarte ikke å logge inn bruker'});
            }
            res.status(200).json({status: 'Du er logget inn!'});
        });
    })(req, res, next);
});

router.get('/logout', function(req, res) {
    req.logout();
    res.status(200).json({status: 'Hadebra!'});
});

module.exports = router;