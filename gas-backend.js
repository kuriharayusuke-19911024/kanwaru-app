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
  // Googleカレンダー取得
  if (action === 'getGoogleCalendar') {
    var month = e.parameter.month; // "2026-04" 形式
    var calId = e.parameter.calendarId || 'primary';
    return jsonResponse(getGoogleCalendarEvents(month, calId));
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

  // Googleカレンダー連携
  if (action === 'addGoogleCalendar') {
    return jsonResponse(addGoogleCalendarEvent(body.data));
  }
  if (action === 'updateGoogleCalendar') {
    return jsonResponse(updateGoogleCalendarEvent(body.id, body.data));
  }
  if (action === 'deleteGoogleCalendar') {
    return jsonResponse(deleteGoogleCalendarEvent(body.id, body.data && body.data.calendarId));
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
    return jsonResponse(saveRow(ss, 'journal', body.data, ['id','name','tag','content','likes','comments','readBy','createdAt','mood','energy','oneline']));
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

// ============================================
// 打刻忘れ LINE通知（本人のみ通知）
// ============================================
// 【セットアップ手順】
// 1. LINE Developers (https://developers.line.biz/ja/) でMessaging APIチャネルを作成
// 2. 「チャネルアクセストークン（長期）」を取得し、下記 LINE_CHANNEL_TOKEN に設定
// 3. 各メンバーがチャネルを友だち追加した状態にする
// 4. 各メンバーのLINE User IDを取得し、下記 LINE_USER_IDS に設定
//    （User IDは friends endpoint または webhook で取得可能）
// 5. GASエディタで checkClockReminders 関数を時間ベースのトリガーに登録
//    [トリガー] → [トリガーを追加] → 関数: checkClockReminders
//    → イベントのソース: 時間主導型 → タイプ: 分ベースのタイマー → 1分おき

var LINE_CHANNEL_TOKEN = ''; // ← ここに LINE チャネルアクセストークンを貼り付け
var LINE_USER_IDS = {
  '栗原 優介':   '', // ← 栗原優介さんの LINE User ID
  '栗原 直人':   '', // ← 栗原直人さんの LINE User ID
  '秋山 龍の輔': '', // ← 秋山龍の輔さんの LINE User ID
};

// シフト情報（曜日: 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土）
var SHIFTS = {
  '栗原 優介':   { days: [1,2,3,4,5,6],   clockIn: '07:00', clockOut: '18:00' }, // 月〜土
  '栗原 直人':   { days: [1,2,3,4,6],     clockIn: '06:00', clockOut: '16:00' }, // 月火水木土
  '秋山 龍の輔': { days: [1,2,3,4,5],     clockIn: '07:00', clockOut: '17:00' }, // 月〜金
};

var REMIND_IN_AFTER_MIN  = 10; // 出勤打刻漏れを通知する分数（出勤時刻から）
var REMIND_OUT_AFTER_MIN = 15; // 退勤打刻漏れを通知する分数（退勤時刻から）
var REMINDER_MSG = '⚠️ 打刻を忘れていませんか？アプリから打刻してください。https://kanwaru-app.vercel.app';

function checkClockReminders() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var now = new Date();
    var dow = now.getDay();
    var todayStr = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd');
    var nowMin = now.getHours() * 60 + now.getMinutes();

    // clock シートを取得
    var clockSheet = ss.getSheetByName('clock');
    var clockMap = {}; // key: date_member -> { clockIn, clockOut }
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

    // 通知履歴シート（重複通知防止）
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

    // 各メンバーをチェック
    Object.keys(SHIFTS).forEach(function(name) {
      var shift = SHIFTS[name];
      if (shift.days.indexOf(dow) < 0) return;

      var rec = clockMap[todayStr + '_' + name] || { clockIn: '', clockOut: '' };

      // 出勤打刻漏れ
      var inMin = hhmmToMin(shift.clockIn) + REMIND_IN_AFTER_MIN;
      if (nowMin >= inMin && !rec.clockIn) {
        var key = todayStr + '_' + name + '_in';
        if (!notifSet[key]) {
          sendLineMessage(name, REMINDER_MSG);
          notifSheet.appendRow([todayStr, name, 'in', new Date()]);
        }
      }

      // 退勤打刻漏れ（出勤済みかつ退勤未打刻のみ対象）
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
    console.log('LINE送信スキップ: ' + memberName + '（トークンまたはUser ID未設定）');
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
    console.log('LINE送信（' + memberName + '）: ' + res.getResponseCode());
  } catch (err) {
    console.error('LINE送信エラー（' + memberName + '）:', err);
  }
}

// ─── Googleカレンダー連携 ───
// 注意: GASを初めてデプロイする際、カレンダーのアクセス権を許可する必要があります。

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
    // 前後1ヶ月も含めて取得（月をまたぐ予定対応）
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
        title: ev.getTitle() || '(無題)',
        date: dateStr,
        startTime: isAllDay ? '00:00' : pad(s.getHours()) + ':' + pad(s.getMinutes()),
        endTime: isAllDay ? '23:59' : pad(e.getHours()) + ':' + pad(e.getMinutes()),
        memo: ev.getDescription() || '',
        location: ev.getLocation() || '',
        allDay: isAllDay,
        source: 'google',
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
      ev = cal.createAllDayEvent(data.title || '(無題)', new Date(data.date + 'T00:00:00'), opts);
    } else {
      ev = cal.createEvent(data.title || '(無題)', start, end, opts);
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

    if (data.title !== undefined) ev.setTitle(data.title || '(無題)');
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
