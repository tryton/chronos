/*
 * This file is part of Chronos.  The LICENSE file at the top level of
 * this repository contains the full copyright notices and license terms.
 */
const sync_delay = 1;
const sync_period = 5;

function dispatchMessage(message, sender, sendResponse) {
    return dispatch(message, sendResponse);
}

chrome.runtime.onMessage.addListener(dispatchMessage);

function dispatchAlarm(alarm) {
    runWithLock(lock, syncLines);
}

chrome.alarms.onAlarm.addListener(dispatchAlarm);
chrome.alarms.create('sync-lines', {
    'delayInMinutes': sync_delay,
    'periodInMinutes': sync_period
});
