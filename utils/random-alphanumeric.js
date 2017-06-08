define(function () {
  'use strict';

  /**
   * Generates a random string of n characters, using the "chars" specified.
   * @param {number} n The length of the final random  string.
   * @param {string} [chars] The characters to use in order to generate the string.
   *                         Default value: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.
   * @returns {string} The final random string.
   */
  function randomAlphanumeric(n, chars) {
    var result, i;

    // Default values, if arguments omitted.
    n = n || 0;
    chars = chars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result = '';

    for (i = n; i > 0; --i) {
      result += chars[Math.round(Math.random() * (chars.length - 1))];
    }

    return result;
  }

  return randomAlphanumeric;
});
