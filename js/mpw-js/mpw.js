/*!by Tom Thorogood <me@tomthorogood.co.uk>*/
/*! This work is licensed under the Creative Commons Attribution 4.0
International License. To view a copy of this license, visit
http://creativecommons.org/licenses/by/4.0/ or see LICENSE. */
class MPW {
    constructor(name, password, version = MPW.VERSION) {
        this.version = version;
        this.name = name;
        if (version >= 0 && version <= MPW.VERSION) {
            this.key = MPW.calculateKey(name, password, version);
        } else {
            this.key = Promise.reject(new Error(`Algorithm version ${version} not implemented`));
        }
    }
    static calculateKey(name, password, version = MPW.VERSION) {
        if (!name || !name.length) {
            return Promise.reject(new Error("Argument name not present"));
        }
        if (!password || !password.length) {
            return Promise.reject(new Error("Argument password not present"));
        }
        try {
            let nameCharLength = name.length;
            password = MPW.txtencoder.encode(password);
            name = MPW.txtencoder.encode(name);
            let NS = MPW.txtencoder.encode(MPW.NS);
            var salt = new Uint8Array(NS.length +
                4 + name.length);
            let saltView = new DataView(salt.buffer, salt.byteOffset, salt.byteLength);
            let i = 0;
            salt.set(NS, i);
            i += NS.length;
            if (version < 3) {
                saltView.setUint32(i, nameCharLength, false);
                i += 4;
            } else {
                saltView.setUint32(i, name.length, false);
                i += 4;
            }
            salt.set(name, i);
            i += name.length;
        } catch (e) {
            return Promise.reject(e);
        }
        let key = window.scrypt(password, salt, 32768, 8, 2, 64);
        return window.crypto.subtle ? key.then(key => window.crypto.subtle.importKey("raw", key, {
            name: "HMAC",
            hash: {
                name: "SHA-256"
            }
        }, false, ["sign"])) : key;
    }
    calculateSeed(site, counter = 1, context = null, NS = MPW.NS) {
        if (!site) {
            return Promise.reject(new Error("Argument site not present"));
        }
        if (counter < 1 || counter > 4294967295) {
            return Promise.reject(new Error("Argument counter out of range"));
        }
        try {
            let siteCharLength = site.length;
            site = MPW.txtencoder.encode(site);
            NS = MPW.txtencoder.encode(NS);
            if (context) {
                context = MPW.txtencoder.encode(context);
            }
            var data = new Uint8Array(NS.length +
                4 + site.length +
                4 +
                (context ? 4 + context.length : 0));
            let dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
            let i = 0;
            data.set(NS, i);
            i += NS.length;
            if (this.version < 2) {
                dataView.setUint32(i, siteCharLength, false);
                i += 4;
            } else {
                dataView.setUint32(i, site.length, false);
                i += 4;
            }
            data.set(site, i);
            i += site.length;
            dataView.setInt32(i, counter, false);
            i += 4;
            if (context) {
                dataView.setUint32(i, context.length, false);
                i += 4;
                data.set(context, i);
                i += context.length;
            }
        } catch (e) {
            return Promise.reject(e);
        }
        if (window.crypto.subtle) {
            return this.key.then(key => window.crypto.subtle.sign({
                name: "HMAC",
                hash: {
                    name: "SHA-256"
                }
            }, key, data)).then(seed => new Uint8Array(seed));
        } else {
            return this.key.then(function(key) {
                data = CryptoJS.lib.WordArray.create(data);
                key = CryptoJS.lib.WordArray.create(key);
                return CryptoJS.HmacSHA256(data, key);
            }).then(function(hash) {
                let seed = new Uint8Array(hash.words.length * 4);
                let seedView = new DataView(seed.buffer, seed.byteOffset, seed.byteLength);
                for (let i = 0; i < hash.words.length; i++) {
                    seedView.setInt32(i * 4, hash.words[i], false);
                }
                return seed;
            });
        }
    }
    generate(site, counter = 1, context = null, template = "long", NS = MPW.NS) {
        if (!(template in MPW.templates)) {
            return Promise.reject(new Error("Argument template invalid"));
        }
        let seed = this.calculateSeed(site, counter, context, NS);
        if (this.version < 1) {
            seed = seed.then(function(seedBytes) {
                var seed = new Uint16Array(seedBytes.length);
                for (var i = 0; i < seed.length; i++) {
                    seed[i] = (seedBytes[i] > 127 ? 0x00ff : 0x0000) | (seedBytes[i] << 8);
                }
                return seed;
            });
        }
        return seed.then(function(seed) {
            template = MPW.templates[template];
            template = template[seed[0] % template.length];
            return template.split("").map(function(c, i) {
                let chars = MPW.passchars[c];
                return chars[seed[i + 1] % chars.length];
            }).join("");
        });
    }
    generatePassword(site, counter = 1, template = "long") {
        return this.generate(site, counter, null, template, MPW.PasswordNS);
    }
    generateLogin(site, counter = 1, template = "name") {
        return this.generate(site, counter, null, template, MPW.LoginNS);
    }
    generateAnswer(site, counter = 1, context = "", template = "phrase") {
        return this.generate(site, counter, context, template, MPW.AnswerNS);
    }
    invalidate() {
        this.key = Promise.reject(new Error("invalid state"));
    }
    static test() {
        return new MPW("user", "password").generate("example.com", 1, null, "long", MPW.NS).then(function(password) {
            console.assert(password === "ZedaFaxcZaso9*", `Self-test failed; expected: ZedaFaxcZaso9*; got: ${password}`);
            return password === "ZedaFaxcZaso9*" ? Promise.resolve() : Promise.reject(new Error(`Self-test failed; expected: ZedaFaxcZaso9*; got: ${password}`));
        });
    }
}
MPW.txtencoder = new TextEncoder;
MPW.VERSION = 3;
MPW.NS = "com.lyndir.masterpassword";
MPW.PasswordNS = "com.lyndir.masterpassword";
MPW.LoginNS = "com.lyndir.masterpassword.login";
MPW.AnswerNS = "com.lyndir.masterpassword.answer";
MPW.templates = {
    maximum: ["anoxxxxxxxxxxxxxxxxx", "axxxxxxxxxxxxxxxxxno"],
    long: ["CvcvnoCvcvCvcv", "CvcvCvcvnoCvcv", "CvcvCvcvCvcvno", "CvccnoCvcvCvcv", "CvccCvcvnoCvcv", "CvccCvcvCvcvno", "CvcvnoCvccCvcv", "CvcvCvccnoCvcv", "CvcvCvccCvcvno", "CvcvnoCvcvCvcc", "CvcvCvcvnoCvcc", "CvcvCvcvCvccno", "CvccnoCvccCvcv", "CvccCvccnoCvcv", "CvccCvccCvcvno", "CvcvnoCvccCvcc", "CvcvCvccnoCvcc", "CvcvCvccCvccno", "CvccnoCvcvCvcc", "CvccCvcvnoCvcc", "CvccCvcvCvccno"],
    medium: ["CvcnoCvc", "CvcCvcno"],
    basic: ["aaanaaan", "aannaaan", "aaannaaa"],
    short: ["Cvcn"],
    pin: ["nnnn"],
    name: ["cvccvcvcv"],
    phrase: ["cvcc cvc cvccvcv cvc", "cvc cvccvcvcv cvcv", "cv cvccv cvc cvcvccv"]
};
MPW.passchars = {
    V: "AEIOU",
    C: "BCDFGHJKLMNPQRSTVWXYZ",
    v: "aeiou",
    c: "bcdfghjklmnpqrstvwxyz",
    A: "AEIOUBCDFGHJKLMNPQRSTVWXYZ",
    a: "AEIOUaeiouBCDFGHJKLMNPQRSTVWXYZbcdfghjklmnpqrstvwxyz",
    n: "0123456789",
    o: "@&%?,=[]_:-+*$#!'^~;()/.",
    x: "AEIOUaeiouBCDFGHJKLMNPQRSTVWXYZbcdfghjklmnpqrstvwxyz0123456789!@#$%^&*()",
    " ": " "
};
