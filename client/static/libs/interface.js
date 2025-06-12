import {df} from './core.js';

let isRequestInProgress = false;

function showWaitingAnimation() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideWaitingAnimation() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

df.api = {
    apiRequest: function (url, data, func) {
        if (isRequestInProgress) return;
        isRequestInProgress = true;

        showWaitingAnimation(); // 显示加载动画

        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: data,
        }).then(response => {
            return response.json();
        }).then(responseData => {
            if (typeof func === 'function') {
                func(responseData);
            }
            return responseData;
        }).catch(error => {
            console.error('Docking fetch Error:', error);
        }).finally(() => {
            isRequestInProgress = false;
            hideWaitingAnimation(); // 隐藏加载动画
        });
    }
};

// df.api = {
//     apiRequest: function (url, data, func) {
//         if (isRequestInProgress) return;
//         isRequestInProgress = true;
//
//         showWaitingAnimation();
//         return fetch(url, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: data,
//         }).then(response => {
//             return response.json();
//         }).then(responseData => {
//             if (typeof func === 'function') {
//                 func(responseData);
//                 isRequestInProgress = false;
//             }
//             return responseData;
//         }).catch(error => {
//             isRequestInProgress = false;
//             console.error('Docking fetch Error:', error);
//         }).finally(() => {
//             isRequestInProgress = false;
//             hideWaitingAnimation(); // 隐藏加载动画
//         });
//     },
//
// }