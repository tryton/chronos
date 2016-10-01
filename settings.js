/*
 * This file is part of Chronos.  The LICENSE file at the top level of
 * this repository contains the full copyright notices and license terms.
 */
var form = jQuery(document).find('form');
var inputURL = jQuery(document).find('#inputURL');
var inputDB = jQuery(document).find('#inputDB');
var inputUser = jQuery(document).find('#inputUser');
var pKey = jQuery(document).find('#key');
var buttonRegister = jQuery(document).find('#buttonRegister');
var buttonReset = jQuery(document).find('#buttonReset');

form.submit(submit);
buttonRegister.click(register);
buttonReset.click(reset);

initialize();

function initialize() {
    var url = localStorage.getItem('url');
    var db = localStorage.getItem('db');
    var user = localStorage.getItem('user');
    var key = localStorage.getItem('key');

    if (!url && document.location.protocol.startsWith('http')) {
        url = (
                document.location.protocol + '//' + document.location.host);
    }

    inputURL.val(url);
    inputDB.val(db);
    inputUser.val(user);

    var configured = Boolean(url && db && user);

    inputURL.prop('readonly', configured);
    inputDB.prop('readonly', configured);
    inputUser.prop('readonly', configured);
    if (key) {
        pKey.text(key.slice(0, 8) + '...');
    } else {
        pKey.text('');
    }
    buttonRegister.prop('disabled', configured);
    buttonReset.prop('disabled', !configured);
}

function submit(evt) {
    evt.preventDefault();
}

function register() {
    var btn = jQuery(this);
    var url = inputURL.val();
    var db = inputDB.val();
    var user = inputUser.val();

    if (!url || !db || !user) {
        return;
    }

    btn.prop('disabled', true);

    var register_url = (url + '/' + db + '/user/application/')
        .replace(/([^:]\/)\/+/g, "$1");
    var data = {
        'user': user,
        'application': 'timesheet'
    };
    jQuery.ajax({
        'url': register_url,
        'contentType': 'application/json',
        'data': JSON.stringify(data),
        'dataType': 'json',
        'type': 'POST'})
        .done(function(data) {
            localStorage.setItem('url', url);
            localStorage.setItem('db', db);
            localStorage.setItem('user', user);
            localStorage.setItem('key', data);
            window.location.href = "key.html";
        })
        .fail(function() {
            alert('error');
        }).always(function() {
            initialize();
        });
}

function reset() {
    var btn = jQuery(this);
    var url = localStorage.getItem('url');
    var db = localStorage.getItem('db');
    var user = localStorage.getItem('user');
    var key = localStorage.getItem('key');

    btn.prop('disabled', true);

    var reset_url = (url + '/' + db + '/user/application/')
        .replace(/([^:]\/)\/+/g, "$1");
    var data = {
        'user': user,
        'key': key,
        'application': 'timesheet'
    };
    jQuery.ajax({
        'url': reset_url,
        'contentType': 'application/json',
        'data': JSON.stringify(data),
        'dataType': 'json',
        'type': 'DELETE'})
        .always(function() {
            localStorage.clear();
            initialize();
        });
}
