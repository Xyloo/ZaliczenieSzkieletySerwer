const router = require("express").Router()
const { User, validate } = require("../models/user")
const auth = require("../middleware/auth")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { Recipe } = require("../models/recipe")

router.post('/register', (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    console.log(req.body)

    // Walidacja danych rejestracji
    const { error } = validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    console.log("past validation")

    // Sprawdzenie, czy użytkownik o podanym emailu już istnieje
    User.findOne({ email })
        .then((existingUser) => {
            if (existingUser) {
                return res.status(400).json({ error: 'Email already exists.' });
            }

            // Tworzenie nowego użytkownika
            bcrypt.hash(password, 10)
                .then((hashedPassword) => {
                    const newUser = new User({
                        firstName,
                        lastName,
                        email,
                        password: hashedPassword
                    });

                    newUser.save()
                        .then((user) => {
                            const token = jwt.sign({ _id: user._id }, process.env.JWT_PRIVATE_KEY, { expiresIn: '7d' });
                            res.json({ token });
                        })
                        .catch((err) => {
                            res.status(500).json({ error: err.message });
                        });
                })
                .catch((err) => {
                    res.status(500).json({ error: err.message });
                });
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Sprawdzenie poprawności danych logowania
    User.findOne({ email })
        .then((user) => {
            if (!user) {
                return res.status(400).json({ error: 'Invalid email or password.' });
            }

            // Porównanie hasła
            bcrypt.compare(password, user.password)
                .then((isMatch) => {
                    if (!isMatch) {
                        return res.status(400).json({ error: 'Invalid email or password.' });
                    }

                    // Generowanie tokenu JWT
                    const token = jwt.sign({ _id: user._id }, process.env.JWT_PRIVATE_KEY, { expiresIn: '7d' });

                    // Zwracanie odpowiedzi z tokenem JWT
                    res.json({ token });
                })
                .catch((err) => {
                    res.status(500).json({ error: err.message });
                });
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});

router.get('/user/profile', auth, (req, res) => {
    const userId = req.user._id;

    User.findById(userId)
        .then((user) => {
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
            res.json(user);
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});

router.put('/user/profile', auth, (req, res) => {
    const userId = req.user._id;
    const { firstName, lastName, email } = req.body;

    User.findByIdAndUpdate(
        userId,
        { firstName, lastName, email },
        { new: true }
    )
        .then((user) => {
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
            res.json(user);
        })
        .catch((err) => {
            res.status(400).json({ error: err.message });
        });
});

router.delete('/user/profile', auth, (req, res) => {
    const userId = req.user._id;

    // Usunięcie powiązanych przepisów
    Recipe.deleteMany({ userId })
        .then(() => {
            // Usunięcie powiązanych komentarzy
            return Comment.deleteMany({ userId });
        })
        .then(() => {
            // Usunięcie konta użytkownika
            return User.findByIdAndDelete(userId);
        })
        .then((user) => {
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
            res.sendStatus(204);
        })
        .catch((err) => {
            res.status(400).json({ error: err.message });
        });
});


module.exports = router
