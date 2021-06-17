var ES6 = false;
var esdir = "es5/";
try {
    eval("class $ES6 { constructor() { let b = true; this.b = b; } } var [ES6, esdir] = ((...args) => args)(new $ES6().b, '')");
} catch (e) {}
if (window.crypto && !window.crypto.subtle && window.crypto.webkitSubtle)
    window.crypto.subtle = window.crypto.webkitSubtle;
if ((!window.crypto || !window.crypto.subtle) && window.SubtleCrypto)
    window.crypto = {
        subtle: window.SubtleCrypto
    }
if (!Number.MAX_SAFE_INTEGER)
    Number.MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
window.ArrayBuffer || document.write("<script src=js/typedarray-polyfill.js><\/script>");
window.TextEncoder || document.write("<script src=js/encoding-polyfill.js><\/script>");
window.Promise || document.write("<script src=js/promise-polyfill.js><\/script>");
window.setImmediate || document.write("<script src=js/" + esdir + "setImmediate-polyfill.js><\/script>");
document.write("<script src=js/" + esdir + "mpw-js/pbkdf2.js><\/script>");
document.write("<script src=js/" + esdir + "mpw-js/scrypt.js?1><\/script>");
document.write("<script src=js/" + esdir + "mpw-js/mpw.js?1><\/script>");
