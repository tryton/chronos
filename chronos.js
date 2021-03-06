/*
 * This file is part of Chronos.  The LICENSE file at the top level of
 * this repository contains the full copyright notices and license terms.
 */
var selectEmployee = jQuery(document).find('#selectEmployee');
var employeName = jQuery(document).find('#employee-name');

var divList = jQuery(document).find('#list');
var date = jQuery(document).find('#date');
var buttonPrevious = jQuery(document).find('#previous');
var buttonNext = jQuery(document).find('#next');
var tableLines = jQuery(document).find('#lines');
var bodyLines = tableLines.find('tbody');
var footLines = tableLines.find('tfoot');
var counter = jQuery(document).find('#counter');
var buttons = jQuery(document).find('#buttons');
var buttonStart = jQuery(document).find('#buttonStart');
var buttonAdd = jQuery(document).find('#buttonAdd');
var buttonStop = jQuery(document).find('#buttonStop');

var divForm = jQuery(document).find('#form');
var formDate = jQuery(document).find('#form-date');
var inputId = jQuery(document).find('#inputId');
var inputDuration = jQuery(document).find('#inputDuration');
var selectWork = jQuery(document).find('#selectWork');
var inputDescription = jQuery(document).find('#inputDescription');
var buttonClose = jQuery(document).find('#buttonClose');
var buttonSave = jQuery(document).find('#buttonSave');
var buttonDelete = jQuery(document).find('#buttonDelete');

selectEmployee.change(changeEmployee);
buttonPrevious.click(previousDate);
buttonNext.click(nextDate);
date.click(todayDate);
tableLines.on('click', 'tbody > tr', editLine);
tableLines.on('keypress', 'tbody > tr', function(e) {
    if (e.which == 13) {
        editLine.call(this);
        return false;
    }
});
tableLines.on('focusin', 'tbody > tr', function() {
    jQuery(this).addClass('active');
});
tableLines.on('focusout', 'tbody > tr', function() {
    jQuery(this).removeClass('active');
});
buttonStart.click(start);
buttonAdd.click(add);
buttonStop.click(stop);
divForm.find('form').submit(submit);
inputDuration.change(validateDuration);
buttonClose.click(close);
buttonSave.click(save);
buttonDelete.click(deleteForm);

var sendMessage;
try {
    sendMessage = chrome.runtime.sendMessage;
    if (!~window.location.origin.indexOf("chrome-extension://")) {
        sendMessage = dispatch;
    }
} catch(err) {
    sendMessage = dispatch;
}

initialize();
setInterval(refreshCounter, 1000);

function initialize() {
    initEmployees();
    setDate();
    switchList();

    var url = localStorage.getItem('url');
    var db = localStorage.getItem('db');
    var key = localStorage.getItem('key');

    if (!(url && db && key)) {
        window.location.href = "settings.html";
    }
}

function _returnFalse(func) {
    return function() {
        func.call(arguments);
        return false;
    };
}

function switchList() {
    divList.show();
    divForm.hide();
    refreshCounter();

    var id = inputId.val();
    if (id) {
        divList.find('#' + inputId.val()).focus();
    }
    Mousetrap.unbind(["esc", "ctrl+d"]);
    Mousetrap.bind("=", _returnFalse(todayDate));
    Mousetrap.bind("a", _returnFalse(add));
    Mousetrap.bind("s", _returnFalse(toggleCounter));
    Mousetrap.bind("h", _returnFalse(previousDate));
    Mousetrap.bind("l", _returnFalse(nextDate));
    Mousetrap.bind("j", _returnFalse(previousLine));
    Mousetrap.bind("k", _returnFalse(nextLine));
    Mousetrap.bind("ctrl+d", _returnFalse(deleteList));
}

function refreshCounter() {
    var duration = counterDuration();
    if (duration !== null) {
        counter.show();
        buttons.hide();
        counter.find('time').text(formatDuration(duration, false));
    } else {
        counter.hide();
        buttons.show();
    }
}

function counterDuration() {
    var origin = localStorage.getItem('counter');
    if (origin) {
        return Math.floor((new Date().getTime() - origin) / 1000);
    }
    return null;
}

function switchForm() {
    divList.hide();
    divForm.show();
    inputDuration.focus();
    Mousetrap.unbind(["=", "a", "s", "h", "l", "j", "k", "ctrl+d"]);
    Mousetrap.bind("esc", _returnFalse(close));
    Mousetrap.bind("ctrl+d", _returnFalse(deleteForm));
}

function initEmployees() {
    sendMessage('employees', function(employees) {
        selectEmployee.children().remove();
        jQuery.each(employees, function() {
            selectEmployee.append(
                    jQuery('<option/>').val(this.id).text(this.name));
        });
        var employee = getEmployee();
        if (employee) {
            selectEmployee.val(employee);
        } else if (employees.length === 1) {
            selectEmployee.val(employees[0]);
        }
        setEmployee();
    });
}

function setEmployee() {
    localStorage.setItem('employee', selectEmployee.val());
    var name = selectEmployee.find('option:selected').text();
    employeName.text(name);
}

function getEmployee() {
    return localStorage.getItem('employee');
}

function changeEmployee() {
    var lines = JSON.parse(localStorage.getItem('lines')) || {};
    for (var date in lines) {
        for (var i = 0; i < lines[date].length; i++) {
            var line = lines[date][i];
            if (line.deleted || line.dirty) {
                selectEmployee.val(getEmployee());
                return;
            }
        }
    }
    jQuery.each(['works', 'works_date', 'lines', 'lines_date'], function() {
        localStorage.removeItem(this);
    });
    setEmployee();
    fillLines();
    setWorks();
}

function setDate(current) {
    current = current || new Date();
    var year = current.getFullYear();
    var month = current.getMonth() + 1;
    var day = current.getDate();
    date.attr('datetime', year + "-" +
            (month < 10 ? "0" + month : month) + "-" +
            (day < 10 ? "0" + day : day));
    date.text(current.toLocaleDateString());
    date.data('date', current);
    fillLines();
    setWorks();
}

function currentDate() {
    return date.data('date');
}

function previousDate() {
    var current = currentDate();
    current.setDate(current.getDate() - 1);
    setDate(current);
}

function nextDate() {
    var current = currentDate();
    current.setDate(current.getDate() + 1);
    setDate(current);
}

function todayDate() {
    setDate();
}

function fillLines() {
    bodyLines.children().remove();
    var datetime = date.attr('datetime');
    var message = ['lines', datetime];
    sendMessage(message, function(lines) {
        if (datetime !== date.attr('datetime')) {
            return;
        }
        var total = 0;
        jQuery.each(lines, function() {
            if (this.deleted) {
                return;
            }
            var tr = jQuery('<tr/>', {
                'id': this.id,
                'tabindex': 0,
            }).appendTo(bodyLines);
            var duration = jQuery('<td/>', {
                'headers': 'duration',
            }).appendTo(tr);
            var time = jQuery('<time/>').appendTo(duration);
            var work = jQuery('<td/>', {
                'class': 'work',
                'headers': 'work',
            }).appendTo(tr);
            var description = jQuery('<td/>', {
                'class': 'description',
                'headers': 'description',
            }).appendTo(tr);
            if (this.uuid) {
                tr.data('uuid', this.uuid);
            }

            var duration_formated = formatDuration(this.duration);
            time.text(duration_formated);
            time.attr('datetime', duration_formated);
            work.text(this['work.name']);
            work.attr('work', this.work);
            description.text(this.description);
            total += this.duration;
        });
        var total_formated = formatDuration(total);
        footLines.find('time').text(total_formated)
            .attr('datetime', total_formated);
    });
}

function formatDuration(duration, strip) {
    if (strip === undefined) strip = true;
    var hours = parseInt(duration / 3600);
    var minutes = parseInt(duration / 60) % 60;
    var seconds = duration % 60;

    var result = ((hours < 10 ? "0" + hours : hours) + ":" +
            (minutes < 10 ? "0" + minutes : minutes));
    if (seconds || !strip) {
        result += ":" + (seconds < 10 ? "0" + seconds : seconds);
    }
    return result;
}

function parseDuration(text) {
    var duration = Number(text);
    if (!duration) {
        var matches = text.match(/(\d*)(:(\d*)(:(\d*)(.(\d+))?)?)?/);
        if (matches) {
            duration = parseInt(matches[1] || 0) * 60 * 60;  // hours
            duration += parseInt(matches[3] || 0) * 60;  // minutes
            duration += parseInt(matches[5] || 0);  // seconds
            duration += parseFloat(matches[6] || 0);  // milliseconds
        } else {
            duration = 0;
        }
    }
    return duration;
}

function validateDuration() {
    var input = jQuery(this);
    var duration = parseDuration(input.val());
    var text = '';
    if (duration) {
        text = formatDuration(duration);
    }
    input.val(text);
}


function setWorks() {
    var current = new Date(date.attr('datetime')).setHours(0, 0, 0, 0);
    sendMessage('works', function(works) {
        selectWork.children().remove();
        // Add an empty option to prevent bootstrap-select
        // from setting the first one
        selectWork.append('<option/>');
        jQuery.each(works, function() {
            if ((!this.start ||
                (new Date(this.start).setHours(0, 0, 0, 0) <= current)) &
                (!this.end ||
                    (new Date(this.end).setHours(0, 0, 0, 0) >= current))) {
                selectWork.append(
                        jQuery('<option/>').val(this.id).text(this.name));
            }
        });
        selectWork.selectpicker('refresh');
    });
}

function editLine() {
    var tr = jQuery(this);
    var id = tr.attr('id');
    var duration = tr.find('time').attr('datetime');
    var work = tr.find('.work').attr('work');
    var description = tr.find('.description').text();
    setForm(id, duration, work, description, tr.data('uuid'));
    switchForm();
}

function previousLine() {
    selectLine('previous');
}

function nextLine() {
    selectLine('next');
}

function selectLine(direction) {
    var line = divList.find('tbody > tr:focus');
    if (line.length) {
        if (direction === 'previous') {
            line = line.next('tr');
        } else {
            line = line.prev('tr');
        }
    } else {
        line = divList.find('tbody > tr:first');
    }
    if (line.length) {
        line.focus();
        var body = jQuery('body');
        window.scrollTo(0, line.offset().top -
            (body.height() / 2) +
            parseInt(body.css('padding-top')));
    }
}

function start() {
    localStorage.setItem('counter', new Date().valueOf());
    refreshCounter();
}

function add(duration) {
    if (typeof duration != 'string') {
        duration = null;
    }
    setForm(null, duration);
    switchForm();
}

function stop() {
    var duration = counterDuration();
    localStorage.removeItem('counter');
    add(formatDuration(duration));
}

function toggleCounter() {
    if (counterDuration() !== null) {
        stop();
    } else {
        start();
    }
}

function setForm(id, duration, work, description, uuid) {
    formDate.text(date.text());
    formDate.attr('datetime', date.attr('datetime'));
    inputId.val(id);
    inputId.data('uuid', uuid);
    inputDuration.val(duration);
    selectWork.selectpicker('val', work || '');
    inputDescription.val(description);
}

function submit(evt) {
    evt.preventDefault();
}

function close() {
    if (!buttonClose.prop('disabled')) {
        switchList();
    }
}

function disable() {
    divForm.find('input,select,button,a').prop('disabled', true);
}

function enable() {
    divForm.find('input,select,button,a').prop('disabled', false);
}


function save(evt) {
    buttonSave.button('saving');
    disable();
    inputDuration.parent().removeClass('has-error');
    selectWork.parent().removeClass('has-error');

    var date = formDate.attr('datetime');
    var id = parseInt(inputId.val());
    var uuid = inputId.data('uuid');
    var duration = parseDuration(inputDuration.val());
    var work = parseInt(selectWork.val());
    var work_name = selectWork.find('option:selected').text();
    var description = inputDescription.val();
    if (!(duration && work)) {
        if (!duration) {
            inputDuration.parent().addClass('has-error');
        }
        if (!work) {
            selectWork.parent().addClass('has-error');
        }
        buttonSave.button('reset');
        enable();
        return;
    }
    var values = {
        'duration': duration,
        'work': work,
        'work.name': work_name,
        'description': description,
        'uuid': uuid,
    };
    sendMessage(['update line', date, id, values], function() {
        fillLines();
        switchList();
        buttonSave.button('reset');
        enable();
    });
}

function deleteForm() {
    delete_(parseInt(inputId.val()), formDate.attr('datetime'));
}

function deleteList() {
    var line = divList.find('tbody > tr:focus');
    if (line.length) {
        delete_(parseInt(line.attr('id')), date.attr('datetime'));
    }
}

function delete_(id, date) {
    buttonDelete.button('deleting');
    disable();
    sendMessage(['delete line', date, id], function() {
        fillLines();
        switchList();
        buttonDelete.button('reset');
        enable();
    });
}
