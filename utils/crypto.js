const CryptoJS = require('../miniprogram_npm/crypto-js/index')

// 生成随机IV
function generateIV() {
    // 生成16字节的随机数组
    const length = 16
    const array = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
        array[i] = Math.floor(Math.random() * 256)
    }
    return CryptoJS.lib.WordArray.create(array)
}

// AES 加密函数
function encrypt(text, key) {
    try {
        // 确保文本是UTF-8编码
        const utf8Text = CryptoJS.enc.Utf8.parse(text)
        // 将密钥转换为16位
        const keyHex = CryptoJS.enc.Utf8.parse(padKey(key))
        // 生成随机IV
        const iv = generateIV()

        // 加密
        const encrypted = CryptoJS.AES.encrypt(utf8Text, keyHex, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        })

        // 将IV和密文组合
        const combined = CryptoJS.lib.WordArray.create()
        combined.concat(iv)
        combined.concat(encrypted.ciphertext)

        // 转换为Base64字符串
        return CryptoJS.enc.Base64.stringify(combined)
    } catch (e) {
        throw new Error('加密失败：' + e.message)
    }
}

// AES 解密函数
function decrypt(ciphertext, key) {
    try {
        // 将密钥转换为16位
        const keyHex = CryptoJS.enc.Utf8.parse(padKey(key))

        // 解析Base64
        const ciphertextBytes = CryptoJS.enc.Base64.parse(ciphertext)

        // 分离IV和密文
        const iv = CryptoJS.lib.WordArray.create(ciphertextBytes.words.slice(0, 4))
        const encryptedContent = CryptoJS.lib.WordArray.create(ciphertextBytes.words.slice(4))

        // 解密
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: encryptedContent },
            keyHex,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        )

        // 转换为UTF-8字符串
        const utf8Text = decrypted.toString(CryptoJS.enc.Utf8)
        if (!utf8Text) {
            throw new Error('解密结果为空')
        }
        return utf8Text
    } catch (e) {
        throw new Error('解密失败，请确认密文和密钥是否正确')
    }
}

// 确保密钥长度为16字节
function padKey(key) {
    if (!key) {
        throw new Error('密钥不能为空')
    }
    // 将密钥转换为UTF-8字符串
    const utf8Key = unescape(encodeURIComponent(key))
    if (utf8Key.length < 16) {
        return utf8Key.padEnd(16, '0')
    }
    return utf8Key.slice(0, 16)
}

module.exports = {
    encrypt,
    decrypt
} 