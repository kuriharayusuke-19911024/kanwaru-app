// ============================================
// kanwaru-app + compost backend (Google Apps Script)
// ============================================

function deleteTestOrders() {
  var ss = SpreadsheetApp.openById(COMPOST_SS_ID);
  var sheet = ss.getSheetByName(COMPOST_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return;
  var testIds = ['1236aa0d','c00bb4fc','c8d3ce1e','25f1700c','a640cd0d','7cb46127'];
  for (var i = sheet.getLastRow(); i >= 2; i--) {
    var id = String(sheet.getRange(i, 2).getValue());
    if (testIds.indexOf(id) >= 0) sheet.deleteRow(i);
  }
}

const COMPOST_SS_ID = '1J8UWMAzxztYBCxayXRg3fAKrtaf6CfMInJJqQ2bFTQA';
const COMPOST_SHEET = '\u5806\u80A5\u767A\u6CE8';
const NOTIFY_EMAIL = 'tamba.nosho@gmail.com';
const ADMIN_PW = '1108';

function doGet(e) {
  var action = (e.parameter.action || '').toString();

  if (action === 'getOrders') {
    var pw = (e.parameter.pw || '').toString();
    if (pw !== ADMIN_PW) return jsonResponse({ result: 'error', message: '\u8A8D\u8A3C\u30A8\u30E9\u30FC' });
    return jsonResponse(getCompostOrders());
  }
  if (action === 'updateOrderStatus') {
    var pw = (e.parameter.pw || '').toString();
    if (pw !== ADMIN_PW) return jsonResponse({ result: 'error', message: '\u8A8D\u8A3C\u30A8\u30E9\u30FC' });
    return jsonResponse(updateCompostOrderStatus(
      (e.parameter.orderId || '').toString(),
      (e.parameter.status || '\u78BA\u8A8D\u6E08').toString()
    ));
  }

  if (action === 'getStock') {
    var pw = (e.parameter.pw || '').toString();
    if (pw !== ADMIN_PW) return jsonResponse({ result: 'error', message: '\u8A8D\u8A3C\u30A8\u30E9\u30FC' });
    return jsonResponse(getStockData());
  }
  if (action === 'getStockHistory') {
    var pw = (e.parameter.pw || '').toString();
    if (pw !== ADMIN_PW) return jsonResponse({ result: 'error', message: '\u8A8D\u8A3C\u30A8\u30E9\u30FC' });
    return jsonResponse(getStockHistory());
  }
  if (action === 'getStockForecast') {
    var pw = (e.parameter.pw || '').toString();
    if (pw !== ADMIN_PW) return jsonResponse({ result: 'error', message: '\u8A8D\u8A3C\u30A8\u30E9\u30FC' });
    return jsonResponse(getStockForecast());
  }

  if (action === 'getSpreading') {
    var pw = (e.parameter.pw || '').toString();
    if (pw !== ADMIN_PW) return jsonResponse({ result: 'error', message: '\u8A8D\u8A3C\u30A8\u30E9\u30FC' });
    return jsonResponse(getSpreadingData());
  }

  if (action === 'deleteTestOrders') {
    var pw = (e.parameter.pw || '').toString();
    if (pw !== ADMIN_PW) return jsonResponse({ result: 'error', message: '\u8A8D\u8A3C\u30A8\u30E9\u30FC' });
    deleteTestOrders();
    return jsonResponse({ result: 'ok', message: 'test data deleted' });
  }

  if (action === 'getGoogleCalendar') {
    return jsonResponse(getGoogleCalendarEvents(e.parameter.month, e.parameter.calendarId || 'primary'));
  }

  var ss = SpreadsheetApp.openById(COMPOST_SS_ID);
  if (action === 'getSchedule') return jsonResponse(getSheetData(ss, 'schedule'));
  if (action === 'getClock')    return jsonResponse(getSheetData(ss, 'clock'));
  if (action === 'getWork')     return jsonResponse(getSheetData(ss, 'work'));
  if (action === 'getJournal')  return jsonResponse(getSheetData(ss, 'journal'));

  return jsonResponse({ result: 'ok', message: 'backend ready' });
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;

  if (action === 'adminLogin') {
    if (body.password === ADMIN_PW) {
      return jsonResponse({ result: 'ok', message: 'login ok' });
    } else {
      return jsonResponse({ result: 'error', message: 'wrong password' });
    }
  }

  if (action === 'order') {
    return jsonResponse(saveCompostOrder(body));
  }

  if (action === 'updateStock') {
    if (body.password !== ADMIN_PW) return jsonResponse({ result: 'error', message: '\u8A8D\u8A3C\u30A8\u30E9\u30FC' });
    return jsonResponse(updateStock(body));
  }

  if (action === 'saveSpreading') {
    if (body.password !== ADMIN_PW) return jsonResponse({ result: 'error', message: '\u8A8D\u8A3C\u30A8\u30E9\u30FC' });
    return jsonResponse(saveSpreading(body));
  }
  if (action === 'updateSpreadStatus') {
    if (body.password !== ADMIN_PW) return jsonResponse({ result: 'error', message: '\u8A8D\u8A3C\u30A8\u30E9\u30FC' });
    return jsonResponse(updateSpreadStatus(body));
  }
  if (action === 'deleteSpreading') {
    if (body.password !== ADMIN_PW) return jsonResponse({ result: 'error', message: '\u8A8D\u8A3C\u30A8\u30E9\u30FC' });
    return jsonResponse(deleteSpreading(body));
  }

  if (action === 'addGoogleCalendar') {
    return jsonResponse(addGoogleCalendarEvent(body.data));
  }
  if (action === 'updateGoogleCalendar') {
    return jsonResponse(updateGoogleCalendarEvent(body.id, body.data));
  }
  if (action === 'deleteGoogleCalendar') {
    return jsonResponse(deleteGoogleCalendarEvent(body.id, body.data && body.data.calendarId));
  }

  var ss = SpreadsheetApp.openById(COMPOST_SS_ID);

  if (action === 'saveSchedule')   return jsonResponse(saveRow(ss, 'schedule', body.data, ['id','title','date','startTime','endTime','category','member','memo','createdBy','updatedAt']));
  if (action === 'deleteSchedule') return jsonResponse(deleteRow(ss, 'schedule', body.id));
  if (action === 'saveClock')      return jsonResponse(upsertRow(ss, 'clock', body.data, ['date','member','clockIn','clockOut','updatedAt'], function(row) { return row[0] === body.data.date && row[1] === body.data.member; }));
  if (action === 'saveWork')       return jsonResponse(upsertByKey(ss, 'work', body.data, ['date','member','blocks','updatedAt'], function(row) { return row[0] === body.data.date && row[1] === body.data.member; }));
  if (action === 'saveJournal')    return jsonResponse(saveRow(ss, 'journal', body.data, ['id','name','tag','content','likes','comments','readBy','createdAt','mood','energy','oneline']));
  if (action === 'updateJournal')  return jsonResponse(updateRow(ss, 'journal', body.id, body.data));
  if (action === 'deleteJournal')  return jsonResponse(deleteRow(ss, 'journal', body.id));

  return jsonResponse({ result: 'error', message: 'Unknown action: ' + action });
}

// --- Compost Order ---

function saveCompostOrder(data) {
  try {
    var ss = SpreadsheetApp.openById(COMPOST_SS_ID);
    var sheet = ss.getSheetByName(COMPOST_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(COMPOST_SHEET);
      sheet.appendRow([
        '\u53D7\u4ED8\u65E5\u6642','\u6CE8\u6587ID','\u6C0F\u540D','\u96FB\u8A71\u756A\u53F7','\u30E1\u30FC\u30EB',
        '\u5806\u80A5\u7A2E\u985E','\u5408\u8A08\u6570\u91CF(t)','\u5703\u5834\u6570','\u5703\u5834\u8A73\u7D30JSON',
        '\u6563\u5E03\u958B\u59CB\u65E5','\u6563\u5E03\u7D42\u4E86\u65E5','\u5730\u56F3\u30D4\u30F3JSON',
        '\u4F4F\u6240\u30E1\u30E2','\u5099\u8003','\u30B9\u30C6\u30FC\u30BF\u30B9'
      ]);
      sheet.getRange(1, 1, 1, 15).setFontWeight('bold');
    }

    var orderId = Utilities.getUuid().slice(0, 8);
    var submittedAt = data.submittedAt || Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

    sheet.appendRow([
      submittedAt, orderId,
      data.name || '', data.phone || '', data.email || '',
      data.compostType || '\u725B\u3075\u3093\u5806\u80A5',
      data.totalQuantity || '', data.fieldCount || '',
      JSON.stringify(data.fields || []),
      data.dateFrom || '', data.dateTo || '',
      JSON.stringify(data.pins || []),
      data.addressNote || '', data.remarks || '', '\u672A\u78BA\u8A8D'
    ]);

    try { sendCompostNotification(data, orderId, submittedAt); } catch(mailErr) {}

    return { result: 'ok', orderId: orderId, message: 'order accepted' };
  } catch (err) {
    return { result: 'error', message: err.toString() };
  }
}

function getCompostOrders() {
  try {
    var ss = SpreadsheetApp.openById(COMPOST_SS_ID);
    var sheet = ss.getSheetByName(COMPOST_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return { result: 'ok', headers: [], orders: [] };

    var headers = sheet.getRange(1, 1, 1, 15).getValues()[0].map(String);
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 15).getValues();
    var orders = rows.map(function(r) {
      return r.map(function(cell, i) {
        if (cell instanceof Date) return Utilities.formatDate(cell, 'Asia/Tokyo', i === 0 ? 'yyyy/MM/dd HH:mm' : 'yyyy-MM-dd');
        return String(cell);
      });
    });

    return { result: 'ok', headers: headers, orders: orders.reverse() };
  } catch (err) {
    return { result: 'error', message: err.toString() };
  }
}

function updateCompostOrderStatus(orderId, status) {
  try {
    var ss = SpreadsheetApp.openById(COMPOST_SS_ID);
    var sheet = ss.getSheetByName(COMPOST_SHEET);
    if (!sheet) return { result: 'error', message: 'sheet not found' };

    var rows = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === orderId) {
        sheet.getRange(i + 2, 15).setValue(status);
        return { result: 'ok', message: 'status updated' };
      }
    }
    return { result: 'error', message: 'order not found' };
  } catch (err) {
    return { result: 'error', message: err.toString() };
  }
}

function sendCompostNotification(data, orderId, submittedAt) {
  var fields = data.fields || [];
  var fieldDetail = '';
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    fieldDetail += '  field' + (i+1) + ': ' + (f.quantity||f.qty||'') + 't / ' + (f.usage||'') + ' / ' + (f.service||'') + '\n';
  }

  var body = 'New Order: ' + orderId + '\n'
    + 'Date: ' + submittedAt + '\n'
    + 'Name: ' + (data.name||'') + '\n'
    + 'Phone: ' + (data.phone||'') + '\n'
    + 'Email: ' + (data.email||'') + '\n'
    + 'Type: ' + (data.compostType||'') + '\n'
    + 'Qty: ' + (data.totalQuantity||'') + '\n'
    + fieldDetail;

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: 'Order: ' + (data.name||'') + ' ' + (data.totalQuantity||''),
    body: body
  });
}

// --- Stock ---

function getStockData() {
  try {
    var ss = SpreadsheetApp.openById(COMPOST_SS_ID);
    var sheet = ss.getSheetByName('\u5728\u5EAB\u7BA1\u7406');
    if (!sheet) {
      sheet = ss.insertSheet('\u5728\u5EAB\u7BA1\u7406');
      sheet.appendRow(['\u73FE\u5728\u5EAB(t)']);
      sheet.getRange(2, 1).setValue(0);
    }
    var current = sheet.getRange(2, 1).getValue() || 0;
    return { result: 'ok', current: current };
  } catch (err) { return { result: 'error', message: err.toString() }; }
}

function updateStock(body) {
  try {
    var ss = SpreadsheetApp.openById(COMPOST_SS_ID);
    var sheet = ss.getSheetByName('\u5728\u5EAB\u7BA1\u7406');
    if (!sheet) {
      sheet = ss.insertSheet('\u5728\u5EAB\u7BA1\u7406');
      sheet.appendRow(['\u73FE\u5728\u5EAB(t)']);
      sheet.getRange(2, 1).setValue(0);
    }
    var current = parseFloat(sheet.getRange(2, 1).getValue()) || 0;
    var qty = parseFloat(body.quantity) || 0;
    if (body.type === '\u5165\u5EAB') current += qty;
    else current = Math.max(0, current - qty);
    sheet.getRange(2, 1).setValue(current);

    var hist = ss.getSheetByName('\u5728\u5EAB\u5C65\u6B74');
    if (!hist) {
      hist = ss.insertSheet('\u5728\u5EAB\u5C65\u6B74');
      hist.appendRow(['\u65E5\u6642', '\u7A2E\u5225', '\u6570\u91CF', '\u7406\u7531', '\u30E1\u30E2', '\u6B8B\u9AD8']);
      hist.getRange(1, 1, 1, 6).setFontWeight('bold');
    }
    hist.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
      body.type, qty, body.reason || '', body.memo || '', current
    ]);

    return { result: 'ok', current: current };
  } catch (err) { return { result: 'error', message: err.toString() }; }
}

function getStockHistory() {
  try {
    var ss = SpreadsheetApp.openById(COMPOST_SS_ID);
    var sheet = ss.getSheetByName('\u5728\u5EAB\u5C65\u6B74');
    if (!sheet || sheet.getLastRow() < 2) return { result: 'ok', history: [] };
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    var history = rows.map(function(r) {
      return [
        r[0] instanceof Date ? Utilities.formatDate(r[0], 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') : String(r[0]),
        String(r[1]), r[2], String(r[3]), String(r[4]), r[5]
      ];
    });
    return { result: 'ok', history: history };
  } catch (err) { return { result: 'error', message: err.toString() }; }
}

function getStockForecast() {
  try {
    var ss = SpreadsheetApp.openById(COMPOST_SS_ID);
    var stockSheet = ss.getSheetByName('\u5728\u5EAB\u7BA1\u7406');
    var current = stockSheet ? (parseFloat(stockSheet.getRange(2, 1).getValue()) || 0) : 0;
    var orderSheet = ss.getSheetByName(COMPOST_SHEET);
    var plannedOut = 0;
    if (orderSheet && orderSheet.getLastRow() >= 2) {
      var rows = orderSheet.getRange(2, 1, orderSheet.getLastRow() - 1, 15).getValues();
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][14]) !== '\u78BA\u8A8D\u6E08') {
          plannedOut += parseFloat(String(rows[i][6]).replace('\u30C8\u30F3','')) || 0;
        }
      }
    }
    return { result: 'ok', current: current, plannedOut: plannedOut, forecast: current - plannedOut };
  } catch (err) { return { result: 'error', message: err.toString() }; }
}

// --- Spreading ---

function getSpreadingData() {
  try {
    var ss = SpreadsheetApp.openById(COMPOST_SS_ID);
    var sheet = ss.getSheetByName('\u6563\u5E03\u8A08\u753B');
    if (!sheet || sheet.getLastRow() < 2) return { result: 'ok', plans: [] };
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
    var plans = rows.map(function(r) {
      return [
        r[0] instanceof Date ? Utilities.formatDate(r[0], 'Asia/Tokyo', 'yyyy/MM/dd') : String(r[0]),
        r[1] instanceof Date ? Utilities.formatDate(r[1], 'Asia/Tokyo', 'yyyy-MM-dd') : String(r[1]),
        r[2] instanceof Date ? Utilities.formatDate(r[2], 'Asia/Tokyo', 'yyyy-MM-dd') : String(r[2]),
        r[3], String(r[4]), String(r[5]), String(r[6]), String(r[7])
      ];
    });
    return { result: 'ok', plans: plans };
  } catch (err) { return { result: 'error', message: err.toString() }; }
}

function saveSpreading(body) {
  try {
    var ss = SpreadsheetApp.openById(COMPOST_SS_ID);
    var sheet = ss.getSheetByName('\u6563\u5E03\u8A08\u753B');
    if (!sheet) {
      sheet = ss.insertSheet('\u6563\u5E03\u8A08\u753B');
      sheet.appendRow(['\u767B\u9332\u65E5', '\u958B\u59CB\u65E5', '\u7D42\u4E86\u65E5', '\u6570\u91CF', '\u5703\u5834', '\u62C5\u5F53', '\u30E1\u30E2', '\u72B6\u614B']);
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    }
    sheet.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd'),
      body.dateFrom || '', body.dateTo || '',
      parseFloat(body.quantity) || 0,
      body.location || '', body.person || '', body.memo || '', '\u4E88\u5B9A'
    ]);
    return { result: 'ok' };
  } catch (err) { return { result: 'error', message: err.toString() }; }
}

function updateSpreadStatus(body) {
  try {
    var ss = SpreadsheetApp.openById(COMPOST_SS_ID);
    var sheet = ss.getSheetByName('\u6563\u5E03\u8A08\u753B');
    if (!sheet) return { result: 'error', message: 'sheet not found' };
    var rowIndex = parseInt(body.rowIndex);
    if (isNaN(rowIndex)) return { result: 'error', message: 'invalid row' };
    sheet.getRange(rowIndex + 2, 8).setValue('\u5B8C\u4E86');
    return { result: 'ok' };
  } catch (err) { return { result: 'error', message: err.toString() }; }
}

function deleteSpreading(body) {
  try {
    var ss = SpreadsheetApp.openById(COMPOST_SS_ID);
    var sheet = ss.getSheetByName('\u6563\u5E03\u8A08\u753B');
    if (!sheet) return { result: 'error', message: 'sheet not found' };
    var rowIndex = parseInt(body.rowIndex);
    if (isNaN(rowIndex)) return { result: 'error', message: 'invalid row' };
    sheet.deleteRow(rowIndex + 2);
    return { result: 'ok' };
  } catch (err) { return { result: 'error', message: err.toString() }; }
}

// --- Helper functions ---

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function getSheetData(ss, sheetName) {
  var sheet = getOrCreateSheet(ss, sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { result: 'ok', data: [] };
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
        try { val = JSON.parse(val); } catch(e) {}
      }
      obj[headers[j]] = val;
    }
    rows.push(obj);
  }
  return { result: 'ok', data: rows };
}

function saveRow(ss, sheetName, data, headers) {
  var sheet = getOrCreateSheet(ss, sheetName);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  var row = headers.map(function(h) {
    var val = data[h];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });
  sheet.appendRow(row);
  return { result: 'ok' };
}

function upsertRow(ss, sheetName, data, headers, matchFn) {
  var sheet = getOrCreateSheet(ss, sheetName);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  var allData = sheet.getDataRange().getValues();
  for (var i = 1; i < allData.length; i++) {
    if (matchFn(allData[i])) {
      var row = headers.map(function(h) {
        var val = data[h]; if (val === undefined || val === null) return '';
        if (typeof val === 'object') return JSON.stringify(val); return val;
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      return { result: 'ok' };
    }
  }
  var newRow = headers.map(function(h) {
    var val = data[h]; if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val); return val;
  });
  sheet.appendRow(newRow);
  return { result: 'ok' };
}

function upsertByKey(ss, sheetName, data, headers, matchFn) {
  return upsertRow(ss, sheetName, data, headers, matchFn);
}

function deleteRow(ss, sheetName, id) {
  var sheet = getOrCreateSheet(ss, sheetName);
  var allData = sheet.getDataRange().getValues();
  for (var i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { result: 'ok' };
    }
  }
  return { result: 'error', message: 'Not found' };
}

function updateRow(ss, sheetName, id, updates) {
  var sheet = getOrCreateSheet(ss, sheetName);
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === String(id)) {
      for (var key in updates) {
        var colIdx = headers.indexOf(key);
        if (colIdx >= 0) {
          var val = updates[key];
          if (typeof val === 'object') val = JSON.stringify(val);
          sheet.getRange(i + 1, colIdx + 1).setValue(val);
        }
      }
      return { result: 'ok' };
    }
  }
  return { result: 'error', message: 'Not found' };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// --- Google Calendar ---

function getGoogleCalendarEvents(monthStr, calendarId) {
  try {
    var cal = (calendarId && calendarId !== 'primary')
      ? CalendarApp.getCalendarById(calendarId)
      : CalendarApp.getDefaultCalendar();
    if (!cal) return { result: 'error', message: 'Calendar not found' };

    var now = new Date();
    var y, m;
    if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
      y = parseInt(monthStr.slice(0, 4), 10);
      m = parseInt(monthStr.slice(5, 7), 10) - 1;
    } else {
      y = now.getFullYear();
      m = now.getMonth();
    }
    var start = new Date(y, m - 1, 1);
    var end = new Date(y, m + 2, 0, 23, 59, 59);

    var events = cal.getEvents(start, end);
    var rows = events.map(function(ev) {
      var s = ev.getStartTime();
      var e = ev.getEndTime();
      var isAllDay = ev.isAllDayEvent();
      var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
      var dateStr = s.getFullYear() + '-' + pad(s.getMonth() + 1) + '-' + pad(s.getDate());
      return {
        id: ev.getId(),
        title: ev.getTitle() || '(untitled)',
        date: dateStr,
        startTime: isAllDay ? '00:00' : pad(s.getHours()) + ':' + pad(s.getMinutes()),
        endTime: isAllDay ? '23:59' : pad(e.getHours()) + ':' + pad(e.getMinutes()),
        memo: ev.getDescription() || '',
        location: ev.getLocation() || '',
        allDay: isAllDay,
        source: 'google'
      };
    });
    return { result: 'ok', data: rows };
  } catch (err) {
    return { result: 'error', message: String(err) };
  }
}

function addGoogleCalendarEvent(data) {
  try {
    var cal = (data.calendarId && data.calendarId !== 'primary')
      ? CalendarApp.getCalendarById(data.calendarId)
      : CalendarApp.getDefaultCalendar();
    if (!cal) return { result: 'error', message: 'Calendar not found' };

    var start = new Date(data.date + 'T' + (data.startTime || '09:00') + ':00');
    var end = new Date(data.date + 'T' + (data.endTime || '10:00') + ':00');
    var opts = {};
    if (data.memo) opts.description = data.memo;
    if (data.location) opts.location = data.location;

    var ev;
    if (data.allDay) {
      ev = cal.createAllDayEvent(data.title || '(untitled)', new Date(data.date + 'T00:00:00'), opts);
    } else {
      ev = cal.createEvent(data.title || '(untitled)', start, end, opts);
    }
    return { result: 'ok', data: { id: ev.getId() } };
  } catch (err) {
    return { result: 'error', message: String(err) };
  }
}

function updateGoogleCalendarEvent(id, data) {
  try {
    var cal = (data.calendarId && data.calendarId !== 'primary')
      ? CalendarApp.getCalendarById(data.calendarId)
      : CalendarApp.getDefaultCalendar();
    if (!cal) return { result: 'error', message: 'Calendar not found' };

    var ev = cal.getEventById(id);
    if (!ev) return { result: 'error', message: 'Event not found' };

    if (data.title !== undefined) ev.setTitle(data.title || '(untitled)');
    if (data.memo !== undefined) ev.setDescription(data.memo || '');
    if (data.location !== undefined) ev.setLocation(data.location || '');
    if (data.date && data.startTime && data.endTime) {
      var start = new Date(data.date + 'T' + data.startTime + ':00');
      var end = new Date(data.date + 'T' + data.endTime + ':00');
      ev.setTime(start, end);
    }
    return { result: 'ok' };
  } catch (err) {
    return { result: 'error', message: String(err) };
  }
}

function deleteGoogleCalendarEvent(id, calendarId) {
  try {
    var cal = (calendarId && calendarId !== 'primary')
      ? CalendarApp.getCalendarById(calendarId)
      : CalendarApp.getDefaultCalendar();
    if (!cal) return { result: 'error', message: 'Calendar not found' };

    var ev = cal.getEventById(id);
    if (!ev) return { result: 'error', message: 'Event not found' };
    ev.deleteEvent();
    return { result: 'ok' };
  } catch (err) {
    return { result: 'error', message: String(err) };
  }
}

function approveCalendarAccess() {
  var cal = CalendarApp.getDefaultCalendar();
  Logger.log('calendar: ' + cal.getName());
  var now = new Date();
  var events = cal.getEventsForDay(now);
  Logger.log('events today: ' + events.length);
}

// --- Clock Reminder (LINE) ---

var LINE_CHANNEL_TOKEN = '';
var LINE_USER_IDS = {
  '\u6817\u539F \u512A\u4ECB':   '',
  '\u6817\u539F \u76F4\u4EBA':   '',
  '\u79CB\u5C71 \u9F8D\u306E\u8F14': '',
};

var SHIFTS = {
  '\u6817\u539F \u512A\u4ECB':   { days: [1,2,3,4,5,6],   clockIn: '07:00', clockOut: '18:00' },
  '\u6817\u539F \u76F4\u4EBA':   { days: [1,2,3,4,6],     clockIn: '06:00', clockOut: '16:00' },
  '\u79CB\u5C71 \u9F8D\u306E\u8F14': { days: [1,2,3,4,5],     clockIn: '07:00', clockOut: '17:00' },
};

var REMIND_IN_AFTER_MIN  = 10;
var REMIND_OUT_AFTER_MIN = 15;
var REMINDER_MSG = '\u26A0\uFE0F \u6253\u523B\u3092\u5FD8\u308C\u3066\u3044\u307E\u305B\u3093\u304B\uFF1F\u30A2\u30D7\u30EA\u304B\u3089\u6253\u523B\u3057\u3066\u304F\u3060\u3055\u3044\u3002https://kanwaru-app.vercel.app';

function checkClockReminders() {
  try {
    var ss = SpreadsheetApp.openById(COMPOST_SS_ID);
    if (!ss) return;
    var now = new Date();
    var dow = now.getDay();
    var todayStr = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd');
    var nowMin = now.getHours() * 60 + now.getMinutes();

    var clockSheet = ss.getSheetByName('clock');
    var clockMap = {};
    if (clockSheet && clockSheet.getLastRow() >= 2) {
      var data = clockSheet.getDataRange().getValues();
      var headers = data[0];
      var idxDate   = headers.indexOf('date');
      var idxMember = headers.indexOf('member');
      var idxIn     = headers.indexOf('clockIn');
      var idxOut    = headers.indexOf('clockOut');
      for (var i = 1; i < data.length; i++) {
        var r = data[i];
        if (!r[idxDate] || !r[idxMember]) continue;
        var dateStr = (r[idxDate] instanceof Date)
          ? Utilities.formatDate(r[idxDate], 'Asia/Tokyo', 'yyyy-MM-dd')
          : String(r[idxDate]);
        clockMap[dateStr + '_' + r[idxMember]] = {
          clockIn: String(r[idxIn] || ''),
          clockOut: String(r[idxOut] || ''),
        };
      }
    }

    var notifSheet = ss.getSheetByName('clock_reminder_log');
    if (!notifSheet) {
      notifSheet = ss.insertSheet('clock_reminder_log');
      notifSheet.appendRow(['date', 'member', 'type', 'notifiedAt']);
    }
    var notifData = notifSheet.getDataRange().getValues();
    var notifSet = {};
    for (var j = 1; j < notifData.length; j++) {
      var nr = notifData[j];
      var dateStr2 = (nr[0] instanceof Date)
        ? Utilities.formatDate(nr[0], 'Asia/Tokyo', 'yyyy-MM-dd')
        : String(nr[0]);
      notifSet[dateStr2 + '_' + nr[1] + '_' + nr[2]] = true;
    }

    Object.keys(SHIFTS).forEach(function(name) {
      var shift = SHIFTS[name];
      if (shift.days.indexOf(dow) < 0) return;

      var rec = clockMap[todayStr + '_' + name] || { clockIn: '', clockOut: '' };

      var inMin = hhmmToMin(shift.clockIn) + REMIND_IN_AFTER_MIN;
      if (nowMin >= inMin && !rec.clockIn) {
        var key = todayStr + '_' + name + '_in';
        if (!notifSet[key]) {
          sendLineMessage(name, REMINDER_MSG);
          notifSheet.appendRow([todayStr, name, 'in', new Date()]);
        }
      }

      var outMin = hhmmToMin(shift.clockOut) + REMIND_OUT_AFTER_MIN;
      if (nowMin >= outMin && rec.clockIn && !rec.clockOut) {
        var key2 = todayStr + '_' + name + '_out';
        if (!notifSet[key2]) {
          sendLineMessage(name, REMINDER_MSG);
          notifSheet.appendRow([todayStr, name, 'out', new Date()]);
        }
      }
    });
  } catch (err) {
    console.error('checkClockReminders error:', err);
  }
}

function hhmmToMin(hhmm) {
  if (!hhmm) return 0;
  var parts = String(hhmm).split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function sendLineMessage(memberName, message) {
  var userId = LINE_USER_IDS[memberName];
  if (!userId || !LINE_CHANNEL_TOKEN) {
    console.log('LINE skip: ' + memberName);
    return;
  }
  try {
    var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + LINE_CHANNEL_TOKEN,
      },
      payload: JSON.stringify({
        to: userId,
        messages: [{ type: 'text', text: message }],
      }),
      muteHttpExceptions: true,
    });
    console.log('LINE sent (' + memberName + '): ' + res.getResponseCode());
  } catch (err) {
    console.error('LINE error (' + memberName + '):', err);
  }
}
