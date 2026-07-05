// Wraps async controller functions so any thrown error / rejected promise
// is automatically forwarded to the global error handler via next(err).
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
