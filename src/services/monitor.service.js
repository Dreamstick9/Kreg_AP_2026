const prisma = require('../config/db');

// Assumes Monitor.id is an Int. If it's a String/UUID, remove the
// Number() conversion and change isValidId to match.
const isValidId = (v) => /^\d+$/.test(String(v));

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function createMonitor(userId, body) {
  const { name, url, intervalSec = 60, isPublic = false } = body;

  return prisma.monitor.create({
    data: { userId, name, url, intervalSec, isPublic }
  });
}

function getMonitors(userId) {
  return prisma.monitor.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

// Every lookup filters on userId, so another user's monitor looks like it
// doesn't exist. These return null / false when nothing matches and the
// controller turns that into a 404.

async function getMonitor(userId, id) {
  if (!isValidId(id)) return null;

  return prisma.monitor.findFirst({
    where: { id: Number(id), userId }
  });
}

async function updateMonitor(userId, id, body = {}) {
  if (!isValidId(id)) return null;

  const data = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      throw badRequest('name must be a non-empty string');
    }
    data.name = body.name.trim();
  }

  if (body.url !== undefined) {
    let valid = false;
    try {
      const u = new URL(body.url);
      valid = u.protocol === 'http:' || u.protocol === 'https:';
    } catch (_) {}
    if (!valid) throw badRequest('url must be a valid http(s) URL');
    data.url = body.url;
  }

  if (body.intervalSec !== undefined) {
    if (!Number.isInteger(body.intervalSec) || body.intervalSec < 10) {
      throw badRequest('intervalSec must be an integer >= 10');
    }
    data.intervalSec = body.intervalSec;
  }

  if (body.isPublic !== undefined) {
    if (typeof body.isPublic !== 'boolean') throw badRequest('isPublic must be a boolean');
    data.isPublic = body.isPublic;
  }

  if (Object.keys(data).length === 0) throw badRequest('No updatable fields provided');

  // Ownership check first, then update by id.
  const existing = await prisma.monitor.findFirst({
    where: { id: Number(id), userId },
    select: { id: true }
  });
  if (!existing) return null;

  return prisma.monitor.update({
    where: { id: existing.id },
    data
  });
}

// Check results are removed by onDelete: Cascade in schema.prisma.
async function deleteMonitor(userId, id) {
  if (!isValidId(id)) return false;

  const { count } = await prisma.monitor.deleteMany({
    where: { id: Number(id), userId }
  });
  return count > 0;
}

module.exports = { createMonitor, getMonitors, getMonitor, updateMonitor, deleteMonitor };
