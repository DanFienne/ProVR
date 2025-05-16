import {df} from './core.js';

let isRequestInProgress = false;

df.api = {
    apiRequest: function (url, data, func) {
        if (isRequestInProgress) return;
        isRequestInProgress = true;

        // showWaitingAnimation();
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
                isRequestInProgress = false;
            }
            return responseData;
        }).catch(error => {
            isRequestInProgress = false;
            console.error('Docking fetch Error:', error);
        }).finally({
            // hideWaitingAnimation(); // 隐藏等待动画
        });
    },

}