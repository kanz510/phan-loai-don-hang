/* HimTik TikTok/Douyin download. Separate from May order data and Em Kem. */
(function () {
'use strict';
var DL_API = 'https://himtik-downloader.onrender.com';
var form = $('dlForm'), input = $('dlUrl'), message = $('dlMessage');
var videoButton = $('dlVideo'), audioButton = $('dlAudio');
var pasteButton = $('dlPaste'), resetButton = $('dlReset');
var jobStatus = $('dlJobStatus'), jobText = $('dlJobText');
var fileReady = $('dlFileReady'), shareButton = $('dlShare');
if (!form || !videoButton || !audioButton) return;

var pending = false, requestId = 0, pollTimer = null, fileController = null, shareFile = null;
var ios = /iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
  (/Macintosh/i.test(navigator.userAgent || '') && navigator.maxTouchPoints > 1);
var maxShareBytes = 48 * 1024 * 1024;

function setMessage(text, type) {
  if (!message) return;
  message.hidden = !text;
  message.textContent = text || '';
  message.classList.toggle('dl-info', type === 'info');
}
function setPending(value) {
  pending = value;
  videoButton.disabled = value;
  audioButton.disabled = value;
  if (jobStatus) jobStatus.hidden = !value;
}
function clearResult(clearInput) {
  requestId++;
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
  if (fileController) fileController.abort();
  fileController = null;
  shareFile = null;
  if (clearInput) input.value = '';
  if (shareButton) shareButton.hidden = true;
  if (fileReady) {
    fileReady.hidden = true;
    fileReady.removeAttribute('href');
    fileReady.removeAttribute('download');
  }
  if (jobText) jobText.textContent = '';
  setPending(false);
}
function validateLink(text) {
  var match = text.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) throw new Error('Hãy dán liên kết TikTok hoặc Douyin.');
  var url;
  try { url = new URL(match[0].replace(/[.,;!?)]*$/, '')); }
  catch (e) { throw new Error('Liên kết không hợp lệ.'); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Liên kết không hợp lệ.');
  if (!/(^|\.)(tiktok\.com|douyin\.com|iesdouyin\.com)$/i.test(url.hostname)) {
    throw new Error('Chỉ hỗ trợ link TikTok hoặc Douyin.');
  }
  return url.href;
}
async function api(path, payload) {
  var response;
  try {
    response = await fetch(DL_API + path, {
      method: payload ? 'POST' : 'GET',
      headers: payload ? { 'Content-Type': 'application/json' } : {},
      body: payload ? JSON.stringify(payload) : undefined,
      cache: 'no-store'
    });
  } catch (e) {
    throw new Error('Không kết nối được máy chủ tải video. Vui lòng thử lại.');
  }
  var data = await response.json().catch(function () { return {}; });
  if (!response.ok) throw new Error(data.error || 'Máy chủ tải video gặp lỗi.');
  return data;
}
function getFileUrl(path) {
  if (typeof path !== 'string' || !/^\/api\/files\/[^/?#]+$/.test(path)) {
    throw new Error('Máy chủ trả đường dẫn tệp không hợp lệ.');
  }
  var url = new URL(path, DL_API);
  if (url.origin !== DL_API) throw new Error('Đường dẫn tải không hợp lệ.');
  return url.href;
}
function fallbackHint(kind) {
  if (kind === 'audio') return 'MP3 đã sẵn sàng. Bấm “Tải tệp về máy”.';
  return ios ?
    'Video đã sẵn sàng. Hãy bấm “Tải tệp về máy”. Nếu mở được video trong Safari, dùng Chia sẻ → Lưu video; nếu tải xuống, tệp sẽ nằm trong Tệp.' :
    'Video đã sẵn sàng. Bấm “Tải tệp về máy”.';
}
// A native file share needs the video bytes and another explicit tap.
// We prepare a small MP4 in advance so the iOS share panel opens directly on tap.
async function prepareIOSShare(href, ticket) {
  if (!ios || !shareButton || typeof File === 'undefined' ||
      typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return;
  var controller = new AbortController();
  fileController = controller;
  try {
    var response = await fetch(href, { method: 'GET', cache: 'no-store',
      mode: 'cors', credentials: 'omit', signal: controller.signal });
    if (!response.ok) throw new Error('file-fetch');
    var length = Number(response.headers.get('content-length') || '0');
    if (length > maxShareBytes) throw new Error('too-large');
    var contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (contentType !== 'video/mp4') throw new Error('unsupported-format');
    var pieces = [], total = 0;
    if (response.body && response.body.getReader) {
      var reader = response.body.getReader();
      while (true) {
        var chunk = await reader.read();
        if (ticket !== requestId) { await reader.cancel(); return; }
        if (chunk.done) break;
        total += chunk.value.byteLength;
        if (total > maxShareBytes) { await reader.cancel(); throw new Error('too-large'); }
        pieces.push(chunk.value);
      }
    } else {
      var blob = await response.blob();
      if (blob.size > maxShareBytes) throw new Error('too-large');
      pieces.push(blob);
    }
    if (ticket !== requestId) return;
    var file = new File(pieces, 'HimTik-video.mp4', { type: 'video/mp4' });
    if (!navigator.canShare({ files: [file] })) throw new Error('share-unavailable');
    shareFile = file;
    shareButton.hidden = false;
    setMessage('Video đã xong! Bấm “Chia sẻ / Lưu vào Ảnh” rồi chọn “Lưu video” trong bảng chia sẻ của iPhone.', 'info');
  } catch (err) {
    if (ticket !== requestId || (err && err.name === 'AbortError')) return;
    setMessage(fallbackHint('video'), 'info');
  } finally {
    if (fileController === controller) fileController = null;
  }
}
async function startDownload(kind) {
  if (pending) return;
  var url;
  try { url = validateLink(input.value.trim()); }
  catch (e) { setMessage(e.message); return; }
  clearResult(false);
  setMessage('');
  var ticket = requestId;
  setPending(true);
  if (jobText) jobText.textContent = kind === 'audio' ? 'Đang xử lý MP3...' : 'Đang xử lý video...';
  try {
    var started = await api('/api/download', { url: url, type: kind });
    if (ticket !== requestId) return;
    if (!started || typeof started.job_id !== 'string' || !started.job_id) {
      throw new Error('Máy chủ chưa trả mã tác vụ.');
    }
    var checks = 0;
    var poll = async function () {
      if (ticket !== requestId) return;
      if (++checks > 110) throw new Error('Xử lý quá lâu. Vui lòng thử lại.');
      var status = await api('/api/jobs/' + encodeURIComponent(started.job_id));
      if (ticket !== requestId) return;
      if (status.status === 'ready') {
        var href = getFileUrl(status.download_url);
        setPending(false);
        fileReady.href = href;
        fileReady.download = kind === 'audio' ? 'HimTik.mp3' : 'HimTik.mp4';
        fileReady.hidden = false;
        setMessage(fallbackHint(kind), 'info');
        if (kind === 'video') prepareIOSShare(href, ticket);
        return;
      }
      if (status.status === 'error') throw new Error(status.error || 'Máy chủ không tải được tệp.');
      if (jobText) jobText.textContent = status.status === 'queued' ?
        'Đang chờ máy chủ xử lý...' : 'Đang tải video, vui lòng giữ trang mở...';
      pollTimer = setTimeout(function () {
        if (ticket !== requestId) return;
        poll().catch(function (err) {
          if (ticket !== requestId) return;
          setPending(false);
          setMessage(err.message);
        });
      }, 1800);
    };
    await poll();
  } catch (err) {
    if (ticket !== requestId) return;
    setPending(false);
    setMessage(err.message);
  }
}
form.addEventListener('submit', function (event) {
  event.preventDefault();
  return startDownload('video');
});
audioButton.addEventListener('click', function () { return startDownload('audio'); });
if (pasteButton) pasteButton.addEventListener('click', async function () {
  try {
    var value = await navigator.clipboard.readText();
    clearResult(false);
    input.value = value;
    input.focus();
    setMessage('');
  } catch (e) {
    input.focus();
    setMessage('Safari chưa cho đọc bộ nhớ tạm. Nhấn giữ ô nhập và chọn “Dán”.', 'info');
  }
});
if (resetButton) resetButton.addEventListener('click', function () {
  clearResult(true);
  input.focus();
  setMessage('');
});
input.addEventListener('input', function () {
  clearResult(false);
  setMessage('');
});
if (shareButton) shareButton.addEventListener('click', function () {
  // Must invoke navigator.share directly during a fresh user tap.
  if (!shareFile || typeof navigator.share !== 'function') return;
  var file = shareFile;
  navigator.share({ files: [file] }).catch(function (err) {
    if (err && err.name === 'AbortError') return; // The user closed the sheet.
    setMessage('Không mở được bảng chia sẻ. Hãy dùng “Tải tệp về máy”.', 'info');
  });
});
})();