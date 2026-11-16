const prisma = require('../config/db');

function createMonitor(userId, body) {
    const {
        name,
        url,
        intervalSec = 60,
        isActive = true,
        isPublic = false
    } = body;

    return prisma.monitor.create({
        data: {
            userId,
            name,
            url,
            intervalSec,
            isActive,
            isPublic
        }
    });
}

async function getMonitors(userId, page, limit) {
    const where = { userId };

    const skip = (page - 1) * limit;

    const monitors = await prisma.monitor.findMany({
        where,
        orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' }
        ],
        skip,
        take: limit
    });

    const total = await prisma.monitor.count({
        where
    });

    return {
        monitors,
        total
    };
}
async function updateMonitor(userId, id, body) {
    const allowedFields = [
        'name',
        'url',
        'intervalSec',
        'isActive',
        'isPublic'
    ];

    const data = {};

    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            data[field] = body[field];
        }
    }

    return prisma.monitor.update({
        where: {
            id: id,
            userId: userId
        },
        data: data
    });
}
module.exports = {
    createMonitor,
    getMonitors,
    updateMonitor
};