module.exports.wrapToPromise = (func, ...args) =>
  new Promise((resolve, reject) => {
    const cb = (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    };
    let result = null;
    try {
      result = func(...args, cb);
    } catch (error) {
      return reject(error);
    }
    if (result !== undefined) {
      return resolve(result);
    }
  });

module.exports.eachLimit = function (arr, limit, iterator, callback) {
  let index = 0;
  let active = 0;
  let done = false;
  const next = (error) => {
    if (done) {
      return;
    }
    if (error) {
      done = true;
      return callback(error);
    }
    if (index === arr.length && active === 0) {
      done = true;
      return callback();
    }
    while (active < limit && index < arr.length) {
      active++;
      iterator(arr[index++], (err) => {
        active--;
        next(err);
      });
    }
  };
  next();
};
