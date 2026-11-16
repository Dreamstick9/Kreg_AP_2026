function errorHandler(err, req, res, next) {
    console.error(err);

    const status = err.status || err.statusCode || 500;

    if (res.headersSent) {
        return next(err);
    }

    return res.status(status).json({
        error: status >= 500 ? 'Something went wrong' : (err.message || 'Something went wrong')
    });
}

module.exports = errorHandler;
