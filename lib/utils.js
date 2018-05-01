module.exports.wrapToPromise = (func, ...args) => new Promise((resolve, reject) => {
  const cb = (error, result) => {
    if (error) {
      return reject(error);
    }
    resolve(result);
  }
  let = null;
  try {
    result = func(...args, cb);
  } catch (error) {
    return reject(error);
  }
  if (result !== undefined) {
    return resolve(result);
  }
});
