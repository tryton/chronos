/*
 * This file is part of Chronos.  The LICENSE file at the top level of
 * this repository contains the full copyright notices and license terms.
 */
const cache_lifetime = 10 * 24 * 60 * 60 * 1000;
const cache_timeout = 60 * 60 * 1000;
const sync_delay_timeout = 5 * 60 * 1000;

function sanitizeURL(url) {
    return url.replace(/([^:]\/)\/+/g, "$1");
}

function dispatch(message, callback) {
    if (message == 'employees') {
        updateEmployees().always(callback);
        return true;
    } else if (message == 'works') {
        updateWorks().always(callback);
        return true;
    } else if (message[0] == 'lines') {
        getLines(message[1]).always(callback);
        return true;
    } else if (message[0] == 'update line') {
        callback(updateLine(message[1], message[2], message[3]));
        return;
    } else if (message[0] == 'delete line') {
        callback(deleteLine(message[1], message[2]));
        return;
    }
}

function updateEmployees() {
    var url = localStorage.getItem('url');
    var db = localStorage.getItem('db');
    var key = localStorage.getItem('key');
    var employees = JSON.parse(localStorage.getItem('employees')) || [];
    var date = new Date(JSON.parse(localStorage.getItem('employees_date')));

    if (!(url && db && key)) {
        return jQuery.when([]);
    }
    if ((navigator.offline) ||
            ((new Date() - date) < cache_timeout)) {
        return jQuery.when(employees);
    }

    var employees_url = sanitizeURL(url + '/' + db + '/timesheet/employees');

    return jQuery.ajax({
        'url': employees_url,
        'headers': {
            'Authorization': 'bearer ' + key
        },
        'contentType': 'application/json',
        'type': 'GET'})
        .then(function(employees) {
            localStorage.setItem('employees', JSON.stringify(employees));
            localStorage.setItem('employees_date', JSON.stringify(new Date()));
            return employees;
        }, function() {
            return employees;
        });
}

function updateWorks() {
    var url = localStorage.getItem('url');
    var db = localStorage.getItem('db');
    var key = localStorage.getItem('key');
    var employee = localStorage.getItem('employee');
    var works = JSON.parse(localStorage.getItem('works')) || [];
    var date = new Date(JSON.parse(localStorage.getItem('works_date')));

    if (!(url && db && key && employee)) {
        return jQuery.when([]);
    }
    if ((navigator.offline) ||
            ((new Date() - date) < cache_timeout)) {
        return jQuery.when(works);
    }

    var works_url = sanitizeURL(
            url + '/' + db + '/timesheet' + '/employee/' + employee +
            '/works');

    return jQuery.ajax({
        'url': works_url,
        'headers': {
            'Authorization': 'bearer ' + key
        },
        'contentType': 'application/json',
        'type': 'GET'})
        .then(function(works) {
            localStorage.setItem('works', JSON.stringify(works));
            localStorage.setItem('works_date', JSON.stringify(new Date()));
            return works;
        }, function() {
            return works;
        });
}

function getLines(date) {
    var url = localStorage.getItem('url');
    var db = localStorage.getItem('db');
    var key = localStorage.getItem('key');
    var employee = localStorage.getItem('employee');

    var lines = JSON.parse(localStorage.getItem('lines')) || {};
    var lines_date = JSON.parse(localStorage.getItem('lines_date')) || {};
    var cache_date = new Date(lines_date[date]);

    if (!(url && db && key && employee)) {
        return jQuery.when([]);
    }
    if ((navigator.offline) ||
           ((new Date() - cache_date) < cache_timeout)) {
        return jQuery.when(lines[date] || []);
    }

    var line_url = sanitizeURL(
            url + '/' + db + '/timesheet/employee/' + employee +
            '/lines/' + date);

    return jQuery.ajax({
        'url': line_url,
        'headers': {
            'Authorization': 'bearer ' + key
        },
        'contentType': 'application/json',
        'type': 'GET'})
        .then(function(lines) {
            var lines_all = JSON.parse(localStorage.getItem('lines')) || {};
            var lines_date = JSON.parse(
                    localStorage.getItem('lines_date')) || {};
            var unsaved = (lines_all[date] || []).filter(function(line) {
                return line.dirty || (line.id < 0);
            });
            lines = jQuery.extend(lines, unsaved);
            lines_all[date] = lines;
            lines_date[date] = new Date();
            localStorage.setItem('lines', JSON.stringify(lines_all));
            localStorage.setItem('lines_date', JSON.stringify(lines_date));
            return lines;
        }, function() {
            return lines[date] || [];
        });
}

function updateLine(date, id, values) {
    var lines_all = JSON.parse(localStorage.getItem('lines')) || {};
    var lines = lines_all[date] || [];
    var line;
    values.dirty = true;
    var min = 0;
    for (var i = 0; i < lines.length; i++) {
        line = lines[i];
        if (line.id === id) {
            jQuery.extend(line, values);
            break;
        }
        min = Math.min(min, line.id);
    }
    if (!id) {
        line = {'id': --min};
        lines.push(jQuery.extend(line, values));
    }
    lines_all[date] = lines;
    localStorage.setItem('lines', JSON.stringify(lines_all));

    syncLines();
}

function deleteLine(date, id) {
    var lines_all = JSON.parse(localStorage.getItem('lines')) || {};
    var lines = lines_all[date] || [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.id === id) {
            if (line.id < 0) {
                lines.splice(i, 1);
            } else {
                line.deleted = true;
            }
            break;
        }
    }
    lines_all[date] = lines;
    localStorage.setItem('lines', JSON.stringify(lines_all));

    syncLines();
}

var promises = [];

function syncLines() {
    var url = localStorage.getItem('url');
    var db = localStorage.getItem('db');
    var key = localStorage.getItem('key');
    var employee = localStorage.getItem('employee');

    if (!(url && db && key) || navigator.offline ||
        !jQuery.isEmptyObject(promises)) {
        return;
    }

    url = sanitizeURL(url + '/' + db + '/timesheet/line');

    var lines_all = JSON.parse(localStorage.getItem('lines')) || {};
    for (var date in lines_all) {
        var lines = lines_all[date];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.deleted) {
                promises.push(delete_(date, line.id));
            } else if (line.dirty) {
                var values = {
                    'employee': employee,
                    'date': date,
                    'work': line.work,
                    'duration': line.duration,
                    'description': line.description
                };
                line.dirty = false;
                if (line.id < 0) {
                    promises.push(create(date, line.id, values));
                }  else {
                    promises.push(update(date, line.id, values));
                }
            }
        }
        if (jQuery.isEmptyObject(promises) &&
                (Math.abs(new Date() - new Date(date)) > cache_lifetime)) {
            clear(date);
        }
    }
    localStorage.setItem('lines', JSON.stringify(lines_all));
    jQuery.when.apply(jQuery, promises).always(function() {
        promises.splice(0, promises.length);
    });

    function delete_(date, id) {
        return jQuery.ajax({
            'url': url + '/' + id,
            'headers': {
                'Authorization': 'bearer ' + key
            },
            'contentType': 'application/json',
            'type': 'DELETE'})
            .done(function() {
                store(date, id);
            });
    }

    function create(date, id, values) {
        return jQuery.ajax({
            'url': url,
            'headers': {
                'Authorization': 'bearer ' + key
            },
            'contentType': 'application/json',
            'data': JSON.stringify(values),
            'type': 'POST'})
            .then(function(line) {
                store(date, id, line);
            });
    }

    function update(date, id, values) {
        return jQuery.ajax({
            'url': url + '/' + id,
            'headers': {
                'Authorization': 'bearer ' + key
            },
            'contentType': 'application/json',
            'data': JSON.stringify(values),
            'type': 'PUT'})
            .then(function(line) {
                store(date, id, line);
            });
    }

    function store(date, id, line) {
        var lines_all = JSON.parse(localStorage.getItem('lines')) || {};
        var lines = lines_all[date] || [];
        for (var i = 0; i < lines.length; i++) {
            var cur = lines[i];
            if (cur.id == id) {
                if (line) {
                    if (line.dirty) {
                        cur.id = line.id;
                    } else {
                        lines.splice(i, 1, line);
                    }
                } else {
                    lines.splice(i, 1);
                }
                break;
            }
        }
        lines_all[date] = lines;
        localStorage.setItem('lines', JSON.stringify(lines_all));
    }

    function clear(date) {
        var lines = JSON.parse(localStorage.getItem('lines')) || {};
        var lines_date = JSON.parse(localStorage.getItem('lines_date')) || {};
        delete lines[date];
        delete lines_date[date];
        localStorage.setItem('lines', JSON.stringify(lines));
        localStorage.setItem('lines_date', JSON.stringify(lines_date));
    }
}

try {
    chrome;
} catch(err) {
    function sync() {
        syncLines();
        window.setTimeout(sync, sync_delay_timeout);
    }
    sync();
}
