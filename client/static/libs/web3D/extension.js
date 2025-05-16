var w3m_sub = function (s, start, stop) {
    return stop ? w3m_trim(s.substring(start - 1, stop)) : w3m_trim(s.charAt(start - 1))
}
var w3m_trim = function (s) {
    return s.replace(/^\s+/, '').replace(/\s+$/, '')
}
var w3m_isset = function (o) {
    return typeof (o) != 'undefined'
}

// 切分不连续的字符串
var w3m_split_by_undefined = function (dict, start, stop) {
    let part = [];
    let keys = Object.keys(dict).sort(customCompare);
    let currentRange = [start, start];

    for (let i = 1; i < keys.length; i++) {
        const key = keys[i];
        let st = customCompare(key, start);
        let ed = customCompare(key, stop);
        if (st >= 0) {
            if (ed <= 0) {
                let count = customCompare(keys[i], keys[i - 1]);
                if (count === 1) {
                    currentRange[1] = keys[i];
                } else {
                    part.push(currentRange);
                    currentRange = [key, key];
                }
            }
        }
    }
    part.push(currentRange);
    return part;
}

var w3m_split_by_difference = function (dict) {
    // 获取并排序字典的键
    let keys = Object.keys(dict).sort(customCompare);
    // 转换过程
    let result = [];
    let currentRange = [keys[0], keys[0], dict[keys[0]]];
    for (let i = 1; i < keys.length; i++) {
        const key = keys[i];
        if (dict[key] === currentRange[2]) {
            currentRange[1] = key;
        } else {
            result.push(currentRange);
            currentRange = [key, key, dict[key]];
        }
    }
    result.push(currentRange);
    return result;
}

var w3m_capword = function (s) {
    return s.toLowerCase().replace(/\b([\w|']+)\b/g, function (word) {
        return word.replace(word.charAt(0), word.charAt(0).toUpperCase());
    });
}

var w3m_find_first = function (dict) {
    let keys = Object.keys(dict).sort(customCompare);
    return keys[0];
}

var w3m_find_last = function (dict) {
    let keys = Object.keys(dict).sort(customCompare);
    return keys[-1];
}

var findResidueIdIndex = function (residueIdList, targetStr) {
    return residueIdList.findIndex(function (str) {
        return str === targetStr
    });
}

var customCompare = function (a, b) {
    a = a.toString();
    b = b.toString();
    if (a === b) {
        return 0
    }
    const numA = parseInt(a.match(/\d+/) || 0, 10);
    const numB = parseInt(b.match(/\d+/) || 0, 10);
    if (numA !== numB) {
        return numA - numB;
    }
    const strA = a.replace(/\d+/g, '');
    const strB = b.replace(/\d+/g, '');
    const charCode1 = strA.charCodeAt(0);
    const charCode2 = strB.charCodeAt(0);
    return charCode1 - charCode2;
};

var w3m_find_object_first = function (obj) {
    let keys = Object.keys(obj).sort(customCompare);
    return obj[keys[0]];
}

var w3m_find_object_last = function (obj) {
    let keys = Object.keys(obj).sort(customCompare);
    return obj[keys[-1]];
}

var w3m_copy = function (o) {
    return Array.isArray(o) ? o.slice(0) : o;
}
