// ============================================
// kanwaru-app 共有バックエンド（Google Apps Script）
// ============================================
// 使い方:
// 1. Google Drive で新しいスプレッドシートを作成
// 2. 拡張機能 → Apps Script を開く
// 3. このコードを全て貼り付けて保存
// 4. デプロイ → 新しいデプロイ → ウェブアプリ → アクセスできるユーザー「全員」→ デプロイ
// 5. 表示されたURLをコピーして、アプリの GAS_URL に設定
// ============================================

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === 'getSchedule') {
    return jsonResponse(getSheetData(ss, 'schedule'));
  }
  if (action === 'getClock') {
    return jsonResponse(getSheetData(ss, 'clock'));
  }
  if (action === 'getWork') {
    return jsonResponse(getSheetData(ss, 'work'));
  }
  if (action === 'getJournal') {
    return jsonResponse(getSheetData(ss, 'journal'));
  }

  return jsonResponse({ result: 'ok', message: 'kanwaru-app backend ready' });
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // スケジュール
  if (action === 'saveSchedule') {
    return jsonResponse(saveRow(ss, 'schedule', body.data, ['id','title','date','startTime','endTime','category','member','memo','createdBy','updatedAt']));
  }
  if (action === 'deleteSchedule') {
    return jsonResponse(deleteRow(ss, 'schedule', body.id));
  }

  // 出退勤
  if (action === 'saveClock') {
    return jsonResponse(upsertRow(ss, 'clock', body.data, ['date','member','clockIn','clockOut','updatedAt'], function(row) {
      return row[0] === body.data.date && row[1] === body.data.member;
    }));
  }

  // 作業記録
  if (action === 'saveWork') {
    return jsonResponse(upsertByKey(ss, 'work', body.data, ['date','member','blocks','updatedAt'], function(row) {
      return row[0] === body.data.date && row[1] === body.data.member;
    }));
  }

  // 日誌
  if (action === 'saveJournal') {
    return jsonResponse(saveRow(ss, 'journal', body.data, ['id','name','tag','content','likes','comments','readBy','createdAt']));
  }
  if (action === 'updateJournal') {
    return jsonResponse(updateRow(ss, 'journal', body.id, body.data));
  }
  if (action === 'deleteJournal') {
    return jsonResponse(deleteRow(ss, 'journal', body.id));
  }

  return jsonResponse({ result: 'error', message: 'Unknown action: ' + action });
}

// ─── ヘルパー関数 ───

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
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
      // JSON文字列をパース
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
  // ヘッダーが無ければ作成
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
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
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  var allData = sheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < allData.length; i++) {
    if (matchFn(allData[i])) {
      var row = headers.map(function(h) {
        var val = data[h];
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      found = true;
      break;
    }
  }
  if (!found) {
    var newRow = headers.map(function(h) {
      var val = data[h];
      if (val === undefined || val === null) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    });
    sheet.appendRow(newRow);
  }
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
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
