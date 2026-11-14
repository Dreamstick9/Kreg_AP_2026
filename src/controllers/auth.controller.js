
const authService = require('../services/auth.service');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'All fields are required'
            });
        }

        if (!email.includes('@')) {
            return res.status(400).json({
                error: 'Invalid email'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters'
            });
        }

        const result = await authService.registerUser(name, email, password);

        return res.status(201).json({
            data: result
        });

    } catch (error) {
        return res.status(error.statusCode || 500).json({
            error: error.message || 'Server error'
        });
    }
};

module.exports = { register };
