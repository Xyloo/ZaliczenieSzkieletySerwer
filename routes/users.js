const router = require("express").Router()
const { User, validate } = require("../models/user")
const { auth } = require("../middleware/auth")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { Recipe } = require("../models/recipe")
const { Comment } = require("../models/comment")

router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // Walidacja danych rejestracji
        const { error } = validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Sprawdzenie, czy użytkownik o podanym emailu już istnieje
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists.' });
        }

        // Tworzenie nowego użytkownika
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword
        });

        const user = await newUser.save();
        const token = jwt.sign({ _id: user._id }, process.env.JWTPRIVATEKEY, { expiresIn: '7d' });
        res.json({ token });
    } catch (err) {
        console.error('Błąd rejestracji:', err.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Sprawdzenie poprawności danych logowania
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        // Porównanie hasła
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        // Generowanie tokenu JWT
        const token = jwt.sign({ _id: user._id }, process.env.JWTPRIVATEKEY, { expiresIn: '7d' });

        // Zwracanie odpowiedzi z tokenem JWT
        res.json({ token });
    } catch (err) {
        console.error('Błąd logowania:', err.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.get('/user/profile', auth, async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId).populate('favorites');
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json(user);
    } catch (err) {
        console.error('Błąd pobierania profilu użytkownika:', err.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

router.put('/user/profile', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { firstName, lastName, email } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { firstName, lastName, email },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json(updatedUser);
    } catch (err) {
        console.error('Błąd aktualizacji profilu użytkownika:', err.message);
        res.status(400).json({ error: err.message });
    }
});

router.delete('/user/profile', auth, async (req, res) => {
    try {
        const userId = req.user._id;

        await Recipe.deleteMany({ createdBy: userId });
        await Comment.deleteMany({ createdBy: userId });
        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.sendStatus(204);
    } catch (err) {
        console.error('Błąd usuwania profilu użytkownika:', err.message);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router
