// Pham vi thong ke chi anh huong den trang Tong quan, khong thay doi du lieu don hang.
const STATS_RANGE_KEY = 'stats-range-v1';

function loadStatsRange() {
  const empty = { from: '', to: '' };
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_RANGE_KEY) || '{}');
    if (!saved || typeof saved !== 'object') return empty;

    const from = validDateKey(saved.from) ? saved.from : '';
    const to = validDateKey(saved.to) ? saved.to : '';
    // Bao ve giao dien neu localStorage bi ghi mot khoang ngay khong hop le.
    if (from && to && from > to) return empty;
    return { from, to };
  } catch {
    return empty;
  }
}

function saveStatsRange(from, to) {
  try {
    if (from || to) {
      localStorage.setItem(STATS_RANGE_KEY, JSON.stringify({ from, to }));
    } else {
      localStorage.removeItem(STATS_RANGE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

function inStatsRange(order, range) {
  // Khong gioi han: van tinh ca don cu khong co ngay tao, nhu truoc day.
  if (!range.from && !range.to) return true;

  // orderDateKey chuyen createdAt sang ngay theo gio Viet Nam (YYYY-MM-DD).
  const key = orderDateKey(order);
  if (!validDateKey(key)) return false;
  return (!range.from || key >= range.from) && (!range.to || key <= range.to);
}

function statsRangeLabel(range) {
  if (range.from && range.to) {
    return `${displayDate(range.from)} – ${displayDate(range.to)}`;
  }
  if (range.from) return `Từ ${displayDate(range.from)}`;
  if (range.to) return `Đến ${displayDate(range.to)}`;
  return 'Tất cả thời gian';
}

function initStatsRangeSettings() {
  if (document.body.dataset.page !== 'account' || $('statsRangeSettings')) return;
  const anchor = document.querySelector('.account-theme-settings');
  if (!anchor) return;

  const section = document.createElement('section');
  section.className = 'panel stats-range-settings';
  section.id = 'statsRangeSettings';
  section.setAttribute('aria-labelledby', 'statsRangeTitle');
  // Chi sua app-stats.js: canh khung voi muc Giao dien ma khong sua CSS/HTML.
  section.style.cssText = 'max-width:460px;margin:22px auto;padding:22px 26px;display:grid;gap:14px';
  section.innerHTML = `
    <div>
      <h2 id="statsRangeTitle" style="font-size:16px;margin:0 0 6px">Phạm vi thống kê</h2>
      <p class="hint" style="margin:0;line-height:1.6">
        Chỉ giới hạn số liệu ở trang Tổng quan. Mọi đơn hàng vẫn được lưu nguyên vẹn.
      </p>
    </div>
    <div class="date-fields">
      <div class="field">
        <label for="statsFrom">Từ ngày</label>
        <input id="statsFrom" type="date" min="1970-01-01">
      </div>
      <div class="field">
        <label for="statsTo">Đến ngày</label>
        <input id="statsTo" type="date" min="1970-01-01">
      </div>
    </div>
    <div class="form-actions" style="margin-top:0;padding-top:12px">
      <button type="button" id="statsRangeSave">Lưu</button>
      <button type="button" class="secondary" id="statsRangeClear">Xem tất cả</button>
    </div>
    <p id="statsRangeStatus" class="hint" role="status" aria-live="polite" style="margin:0"></p>
  `;
  anchor.before(section);

  const fromInput = $('statsFrom');
  const toInput = $('statsTo');
  const status = $('statsRangeStatus');
  const savedRange = loadStatsRange();
  fromInput.value = savedRange.from;
  toInput.value = savedRange.to;
  status.textContent = `Đang áp dụng: ${statsRangeLabel(savedRange)}.`;

  $('statsRangeSave').addEventListener('click', () => {
    const from = fromInput.value;
    const to = toInput.value;
    if (fromInput.validity.badInput || toInput.validity.badInput ||
        (from && !validDateKey(from)) || (to && !validDateKey(to))) {
      status.textContent = 'Vui lòng chọn ngày hợp lệ.';
      return;
    }
    if (from && to && from > to) {
      status.textContent = 'Ngày bắt đầu không được sau ngày kết thúc.';
      return;
    }
    if (!saveStatsRange(from, to)) {
      status.textContent = 'Không lưu được trên thiết bị này. Hãy kiểm tra quyền lưu trữ của trình duyệt.';
      return;
    }
    status.textContent = `Đã lưu: ${statsRangeLabel({ from, to })}. Mở Tổng quan để xem số liệu.`;
  });

  $('statsRangeClear').addEventListener('click', () => {
    if (!saveStatsRange('', '')) {
      status.textContent = 'Không xóa được phạm vi đã lưu. Hãy kiểm tra quyền lưu trữ của trình duyệt.';
      return;
    }
    fromInput.value = '';
    toInput.value = '';
    status.textContent = 'Đã chuyển về: Tất cả thời gian.';
  });
}

function renderWelcomeDate() {
  if (!$('mayWeekday') || !$('mayCalendar')) return;
  const now = new Date();
  const weekday = new Intl.DateTimeFormat('vi-VN', {
    timeZone: ORDER_TIME_ZONE,
    weekday: 'long'
  }).format(now);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('vi-VN', {
    timeZone: ORDER_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).formatToParts(now).map(part => [part.type, part.value]));
  $('mayWeekday').textContent = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  $('mayCalendar').textContent = `Ngày ${parts.day} tháng ${parts.month} năm ${parts.year}`;
}

function renderStats(list, total) {
  renderWelcomeDate();

  // Nhac hoa hong dung tat ca don hang, KHONG ap dung pham vi thong ke.
  if ($('commissionReminder')) {
    $('commissionReminder').hidden = !authorized || !dataLoaded;
    if (authorized && dataLoaded) {
      const count = orders.filter(order => order.commission === 0).length;
      const text = `${count} đơn`;
      if ($('commissionReminderCount').textContent !== text) {
        $('commissionReminderCount').textContent = text;
      }
    }
  }

  const range = loadStatsRange();
  const filtered = Boolean(range.from || range.to);
  const rangeText = statsRangeLabel(range);
  const scoped = orders.filter(order => inStatsRange(order, range));

  const rangeTotal = scoped
    .filter(order => order.del !== 'Đã hủy')
    .reduce((sum, order) => sum + order.price, 0);
  const delivered = scoped.filter(order => order.del === 'Đã giao').length;
  const undelivered = scoped.filter(order => order.del === 'Chưa giao').length;
  const cancelled = scoped.filter(order => order.del === 'Đã hủy').length;
  const unknown = scoped.length - delivered - undelivered - cancelled;

  // Gia don la nghin dong; doi sang VND mot lan truoc khi tinh hoa hong 15%.
  const unreceivedOrderValue = scoped
    .filter(order => order.commission === 0)
    .reduce((sum, order) => sum + BigInt(Math.round(order.price * 1000)), 0n);
  const receivedCommission = sumCommissions(scoped);
  const estimatedCommission = receivedCommission + (unreceivedOrderValue * 15n + 50n) / 100n;

  const stats = [
    ['Tổng đơn hàng', scoped.length, filtered ? `Trong ${rangeText}` : 'Tất cả đơn đã lưu'],
    ['Tổng giá trị đơn', fmt(rangeTotal), 'Không tính các đơn đã hủy'],
    ['Đã giao', delivered, 'Đơn hoàn thành giao hàng'],
    ['Chưa giao', undelivered, `${unknown} đơn chưa rõ trạng thái`],
    ['Đã hủy', cancelled, 'Đơn được giữ lại để đối chiếu'],
    ['Hoa hồng đã nhận', fmtCommission(receivedCommission),
      'Tổng hoa hồng dự kiến: ' + fmtCommission(estimatedCommission)]
  ];

  if ($('stats')) {
    $('stats').replaceChildren(...stats.map(([title, value, detail], index) => {
      const card = document.createElement('div');
      card.className = 'card';
      if (index === 4) card.dataset.stat = 'cancelled';
      if (index === 5) card.dataset.stat = 'commission';

      const marker = document.createElement('span');
      marker.className = 'stat-icon';
      marker.append(createIcon(['bag', 'wallet', 'check', 'clock', 'cancel', 'wallet'][index]));
      card.append(marker);

      for (const [tag, text] of [['span', title], ['b', value], ['small', detail]]) {
        const node = document.createElement(tag);
        node.textContent = text;
        card.append(node);
      }
      return card;
    }));
  }

  if ($('statsSummary')) {
    $('statsSummary').textContent = `${scoped.length} đơn${filtered ? ` (${rangeText})` : ''}` +
      ` · Giá trị chưa hủy: ${fmt(rangeTotal)} · ${undelivered} chưa giao · ${cancelled} đã hủy`;
  }
}

initStatsRangeSettings();
