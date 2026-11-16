const monitorService = require('../services/monitor.service');

async function createMonitor(req, res, next) {
    try {
        const monitor = await monitorService.createMonitor(
            req.user.id,
            req.body
        );

        return res.status(201).json({
            data: monitor
        });
    } catch (error) {
        next(error);
    }
}

async function getMonitors(req, res, next) {
    try {
        const page = req.query.page === undefined
            ? 1
            : Number(req.query.page);

        const requestedLimit = req.query.limit === undefined
            ? 10
            : Number(req.query.limit);

        if (!Number.isSafeInteger(page) || page < 1) {
            return res.status(400).json({
                error: 'page: must be a positive integer'
            });
        }

        if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
            return res.status(400).json({
                error: 'limit: must be a positive integer'
            });
        }

        const limit = Math.min(requestedLimit, 50);

        const { monitors, total } = await monitorService.getMonitors(
            req.user.id,
            page,
            limit
        );

        return res.status(200).json({
            data: monitors,
            page,
            limit,
            total
        });
    } catch (error) {
        next(error);
    }
}
async function updateMonitor(req, res, next) {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(404).json({
                error: 'Monitor not found'
            });
        }

        const monitor = await monitorService.updateMonitor(
            req.user.id,
            id,
            req.body
        );

        return res.status(200).json({
            data: monitor
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({
                error: 'Monitor not found'
            });
        }

        next(error);
    }
}
module.exports = {
    createMonitor,
    getMonitors,
    updateMonitor
};