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
var activeUrl = '', busy = false, pollTimer = null, requestId = 0, downloading = false;
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
function resetDownloadState(clearInput) {
  // Ignore old inspections, downloads and image requests after changing the link.
  requestId++;
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
  activeUrl = '';
  if (clearInput) input.value = '';
  if (result) result.hidden = true;
  if (actions) actions.hidden = true;
  if (jobText) jobText.textContent = '';
  if (fileReady) {
    fileReady.hidden = true;
    fileReady.removeAttribute('href');
    fileReady.removeAttribute('download');
  }
  var thumb = $('dlThumb'), placeholder = $('dlThumbPlaceholder');
  if (thumb) {
    thumb.onload = null;
    thumb.onerror = null;
    thumb.removeAttribute('src');
    thumb.hidden = true;
  }
  if (placeholder) placeholder.hidden = false;
  setBusy(false);
  setDownloadBusy(false);
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
  return url.href;
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
      var imageRequest = requestId;
      thumb.onload = function () { if (imageRequest === requestId) { thumb.hidden = false; placeholder.hidden = true; } };
      thumb.onerror = function () { if (imageRequest === requestId) { thumb.hidden = true; placeholder.hidden = false; } };
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
  if (busy || downloading) return;
  var url;
  try { url = validateLink(input.value.trim()); }
  catch (err) { setMessage(err.message); return; }
  resetDownloadState(false);
  setMessage('');
  var ticket = requestId;
  setBusy(true);
  try {
    var data = await api('/api/inspect', { url: url });
    if (ticket !== requestId) return;
    activeUrl = url;
    showResult(data);
  } catch (err) {
    if (ticket === requestId) setMessage(err.message);
  } finally {
    if (ticket === requestId) setBusy(false);
  }
});
if (input) input.addEventListener('input', function () {
  resetDownloadState(false);
  setMessage('');
});
if (pasteButton) pasteButton.addEventListener('click', async function () {
  try {
    var value = await navigator.clipboard.readText();
    resetDownloadState(false);
    input.value = value;
    input.focus();
    setMessage('');
  } catch (e) {
    input.focus();
    setMessage('Trình duyệt chưa cho phép đọc bộ nhớ tạm. Nhấn giữ ô nhập rồi chọn “Dán”.', 'info');
  }
});
if (resetButton) resetButton.addEventListener('click', function () {
  resetDownloadState(true);
  input.focus();
  setMessage('');
});
function setDownloadBusy(value) {
  downloading = value;
  if (videoButton) videoButton.disabled = value;
  if (audioButton) audioButton.disabled = value;
  if (jobStatus) jobStatus.hidden = !value;
}
async function startDownload(kind) {
  if (!activeUrl || downloading || busy) return;
  var ticket = requestId;
  var url = activeUrl;
  setMessage('');
  if (fileReady) { fileReady.hidden = true; fileReady.removeAttribute('href'); }
  setDownloadBusy(true);
  if (jobText) jobText.textContent = 'Đang chuẩn bị tải ' + (kind === 'audio' ? 'MP3' : 'video') + '...';
  try {
    var started = await api('/api/download', { url: url, type: kind });
    if (ticket !== requestId) return;
    if (!started || typeof started.job_id !== 'string' || !started.job_id) {
      throw new Error('Máy chủ chưa trả mã tác vụ tải. Vui lòng thử lại.');
    }
    var checks = 0;
    var poll = async function () {
      if (ticket !== requestId) return;
      if (++checks > 95) throw new Error('Xử lý quá lâu, vui lòng thử lại.');
      var status = await api('/api/jobs/' + encodeURIComponent(started.job_id));
      if (ticket !== requestId) return;
      if (status.status === 'ready') {
        // Only use relative paths on the configured download server.
        var path = status.download_url;
        if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
          throw new Error('Máy chủ trả đường dẫn tải không hợp lệ.');
        }
        var downloadHref = new URL(path, DL_API);
        if (downloadHref.origin !== DL_API) throw new Error('Máy chủ trả đường dẫn tải không hợp lệ.');
        setDownloadBusy(false);
        fileReady.href = downloadHref.href;
        fileReady.download = 'HimTik-' + kind;
        fileReady.hidden = false;
        setMessage('Tệp đã sẵn sàng. Chạm nút bên dưới để tải về, đặc biệt trên iPhone.', 'info');
        return;
      }
      if (status.status === 'error') throw new Error(status.error || 'Không thể tải tệp.');
      if (jobText) jobText.textContent = status.status === 'queued' ? 'Đang chờ lượt xử lý...' : 'Đang tải và xử lý tệp, vui lòng giữ trang mở...';
      pollTimer = setTimeout(function () {
        if (ticket !== requestId) return;
        poll().catch(function (err) {
          if (ticket !== requestId) return;
          setDownloadBusy(false);
          setMessage(err.message);
        });
      }, 1800);
    };
    await poll();
  } catch (err) {
    if (ticket !== requestId) return;
    setDownloadBusy(false);
    setMessage(err.message);
  }
}
if (videoButton) videoButton.addEventListener('click', function () { return startDownload('video'); });
if (audioButton) audioButton.addEventListener('click', function () { return startDownload('audio'); });
})();
