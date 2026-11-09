/* Tải video TikTok/Douyin qua HimTik API trên Render.
   Chỉ gọi API tải video, không chạm dữ liệu đơn hàng.
   Toàn bộ logic nằm trong IIFE để không đụng tên biến toàn cục của app.js. */
(function () {
'use strict';
var DL_API = 'https://himtik-downloader.onrender.com';
var form = $('dlForm'), input = $('dlUrl'), message = $('dlMessage');
var result = $('dlResult'), actions = $('dlActions');
var inspectButton = $('dlInspect'), inspectLabel = $('dlInspectLabel');
var pasteButton = $('dlPaste'), resetButton = $('dlReset');
var jobStatus = $('dlJobStatus'), jobText = $('dlJobText'), fileReady = $('dlFileReady');
var videoButton = $('dlVideo'), audioButton = $('dlAudio');
var activeUrl = '', busy = false, pollTimer = null;
if (!form) return;

function setMessage(text, type) {
  if (!message) return;
  message.hidden = !text;
  message.textContent = text || '';
  message.classList.toggle('dl-info', type === 'info');
}
function setBusy(loading) {
  busy = loading;
  if (inspectButton) inspectButton.disabled = loading;
  if (inspectLabel) inspectLabel.textContent = loading ? 'Đang tìm nội dung...' : 'Kiểm tra';
}
function validateLink(text) {
  var match = text.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) throw new Error('Hãy dán liên kết video TikTok hoặc Douyin.');
  var url;
  try { url = new URL(match[0].replace(/[.,;!?)]*$/, '')); }
  catch (e) { throw new Error('Liên kết không hợp lệ.'); }
  if (!/^(https?):$/.test(url.protocol) || !/(^|\.)(tiktok\.com|douyin\.com|iesdouyin\.com)$/i.test(url.hostname)) {
    throw new Error('Chỉ nhận liên kết TikTok hoặc Douyin.');
  }
  return text;
}
async function api(path, body) {
  var response;
  try {
    response = await fetch(DL_API + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    });
  } catch (e) {
    throw new Error('Không kết nối được máy chủ tải video. Hãy kiểm tra mạng rồi thử lại.');
  }
  var data = await response.json().catch(function () { return {}; });
  if (!response.ok) throw new Error(data.error || 'Máy chủ gặp lỗi. Vui lòng thử lại.');
  return data;
}
function showResult(data) {
  setText('dlTitleText', data.title || 'Bài đăng TikTok');
  setText('dlCreator', data.creator || 'TikTok');
  setText('dlOrigin', data.source || 'TikTok');
  var duration = $('dlDuration');
  if (duration) {
    if (Number.isFinite(data.duration) && data.duration > 0) {
      var seconds = Math.round(data.duration);
      duration.textContent = '⏱ ' + Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    } else {
      duration.textContent = 'Bài đăng công khai';
    }
  }
  var thumb = $('dlThumb'), placeholder = $('dlThumbPlaceholder');
  if (thumb && placeholder) {
    thumb.hidden = true;
    placeholder.hidden = false;
    if (data.thumbnail && /^https:\/\//i.test(data.thumbnail)) {
      thumb.onload = function () { thumb.hidden = false; placeholder.hidden = true; };
      thumb.onerror = function () { thumb.hidden = true; placeholder.hidden = false; };
      thumb.src = data.thumbnail;
    }
  }
  if (jobStatus) jobStatus.hidden = true;
  if (fileReady) fileReady.hidden = true;
  if (result) result.hidden = false;
  if (actions) actions.hidden = false;
  if (result) result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
form.addEventListener('submit', async function (e) {
  e.preventDefault();
  if (busy) return;
  setMessage('');
  if (result) result.hidden = true;
  if (actions) actions.hidden = true;
  if (pollTimer) clearTimeout(pollTimer);
  var text = input.value.trim();
  try { validateLink(text); } catch (err) { setMessage(err.message); return; }
  setBusy(true);
  try {
    var data = await api('/api/inspect', { url: text });
    activeUrl = text;
    showResult(data);
  } catch (err) { setMessage(err.message); }
  finally { setBusy(false); }
});
if (pasteButton) pasteButton.addEventListener('click', async function () {
  try {
    var value = await navigator.clipboard.readText();
    input.value = value;
    input.focus();
    setMessage('');
  } catch (e) {
    input.focus();
    setMessage('Trình duyệt chưa cho phép đọc bộ nhớ tạm. Nhấn giữ ô nhập rồi chọn “Dán”.', 'info');
  }
});
if (resetButton) resetButton.addEventListener('click', function () {
  if (result) result.hidden = true;
  if (actions) actions.hidden = true;
  if (jobStatus) jobStatus.hidden = true;
  if (fileReady) fileReady.hidden = true;
  if (pollTimer) clearTimeout(pollTimer);
  setMessage('');
});
function setDownloadBusy(value) {
  if (videoButton) videoButton.disabled = value;
  if (audioButton) audioButton.disabled = value;
  if (jobStatus) jobStatus.hidden = !value;
}
async function startDownload(kind) {
  if (!activeUrl || (videoButton && videoButton.disabled)) return;
  setMessage('');
  if (fileReady) fileReady.hidden = true;
  setDownloadBusy(true);
  if (jobText) jobText.textContent = 'Đang chuẩn bị tải ' + (kind === 'audio' ? 'MP3' : 'video') + '...';
  try {
    var started = await api('/api/download', { url: activeUrl, type: kind });
    var checks = 0;
    var poll = async function () {
      if (++checks > 95) throw new Error('Xử lý quá lâu, vui lòng thử lại.');
      var status = await api('/api/jobs/' + encodeURIComponent(started.job_id));
      if (status.status === 'ready') {
        setDownloadBusy(false);
        fileReady.href = DL_API + status.download_url;
        fileReady.download = 'HimTik-' + kind;
        fileReady.hidden = false;
        setMessage('Tệp đã sẵn sàng. Chạm nút bên dưới để tải về, đặc biệt trên iPhone.', 'info');
        return;
      }
      if (status.status === 'error') throw new Error(status.error || 'Không thể tải tệp.');
      if (jobText) jobText.textContent = status.status === 'queued' ? 'Đang chờ lượt xử lý...' : 'Đang tải và xử lý tệp, vui lòng giữ trang mở...';
      pollTimer = setTimeout(async function () {
        try { await poll(); } catch (err) { setDownloadBusy(false); setMessage(err.message); }
      }, 1800);
    };
    await poll();
  } catch (err) { setDownloadBusy(false); setMessage(err.message); }
}
if (videoButton) videoButton.addEventListener('click', function () { startDownload('video'); });
if (audioButton) audioButton.addEventListener('click', function () { startDownload('audio'); });
})();
