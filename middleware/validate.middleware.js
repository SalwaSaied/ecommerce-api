// Usage in routes: router.post('/login', validate(loginSchema), authController.login)
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // collect all errors, not just the first
      stripUnknown: true, // remove fields not defined in the schema
    });

    if (error) {
      const messages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages,
      });
    }

    req.body = value; // use the sanitized/validated value going forward
    next();
  };
};

module.exports = validate;
