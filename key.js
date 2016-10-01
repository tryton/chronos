/*
 * This file is part of Chronos.  The LICENSE file at the top level of
 * this repository contains the full copyright notices and license terms.
 */
var pKey = jQuery(document).find('#key');

initialize();

function initialize() {
    var key = localStorage.getItem('key');
    pKey.text(key.slice(0, 8) + '...');
}
