function validateMonitor(req, res, next) {
    const { name, url, intervalSec, isActive, isPublic } = req.body;
    const isPost = req.method === 'POST';

    if (isPost && name === undefined) {
        return res.status(400).json({
            error: 'name: is required'
        });
    }

    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length < 1 || name.length > 100) {
            return res.status(400).json({
                error: 'name: must be 1 to 100 characters'
            });
        }
    }

    if (isPost && url === undefined) {
        return res.status(400).json({
            error: 'url: is required'
        });
    }

    if (url !== undefined) {
        if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
            return res.status(400).json({
                error: 'url: must start with http:// or https://'
            });
        }

        try {
            new URL(url);
        } catch (error) {
            return res.status(400).json({
                error: 'url: invalid URL'
            });
        }
    }

    if (intervalSec !== undefined) {
        if (!Number.isInteger(intervalSec) || intervalSec < 10 || intervalSec > 3600) {
            return res.status(400).json({
                error: 'intervalSec: must be an integer from 10 to 3600'
            });
        }
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
        return res.status(400).json({
            error: 'isActive: must be a boolean'
        });
    }

    if (isPublic !== undefined && typeof isPublic !== 'boolean') {
        return res.status(400).json({
            error: 'isPublic: must be a boolean'
        });
    }

    next();
}

module.exports = validateMonitor;