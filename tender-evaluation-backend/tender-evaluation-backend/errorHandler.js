export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error',
      details: err.message 
    });
  }
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: 'Something went wrong' 
  });
}; 