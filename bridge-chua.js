// Cầu nối cloud cho CHÙA SEN VÀNG — đúng định dạng WebSocket mà game này chờ.
// Game này dùng handleLiveEvent với: comment, gift, follow, share, like, member, roomUser, leave, streamEnd.
// Trường quan trọng: comment dùng "text", quà dùng "gift", không dùng "chat" hay "giftName" như các game khác.
// Deploy lên Render / Railway / Fly.io, đặt LIVE_USERNAME là @live của chủ phòng, không nhập mật khẩu hay stream key.
const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');
const { WebSocketServer } = require('ws');

const LIVE_USERNAME = (process.env.LIVE_USERNAME || '').replace(/^@/, '');
const PORT = process.env.PORT || 8080;
if (!LIVE_USERNAME) {
  console.error('Thiếu LIVE_USERNAME. Ví dụ: zunny.doan');
  process.exit(1);
}

const wss = new WebSocketServer({ port: PORT });
function broadcast(obj) {
  const text = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(text);
  }
}
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'roomUser', viewers: 0 }));
});

async function start() {
  const conn = new TikTokLiveConnection(LIVE_USERNAME, { enableExtendedGiftInfo: true });
  conn.connect().then(() => console.log('Đã nối live @' + LIVE_USERNAME)).catch((e) => {
    console.error('Không nối được live:', e.message);
    setTimeout(start, 10000);
  });
  // Bình luận mới tạo nhân vật trong chùa — đây là lựa chọn thiết kế của game này, member vào phòng chỉ hiện số người xem.
  conn.on(WebcastEvent.CHAT, (d) => broadcast({ type: 'comment', user: d.user?.nickname || d.user?.uniqueId, text: d.comment }));
  conn.on(WebcastEvent.GIFT, (d) => broadcast({ type: 'gift', user: d.user?.nickname || d.user?.uniqueId, gift: d.gift?.name || d.giftName || 'Quà', count: 1, diamondCost: d.gift?.diamondCount || null }));
  conn.on(WebcastEvent.FOLLOW, (d) => broadcast({ type: 'follow', user: d.user?.nickname || d.user?.uniqueId }));
  conn.on(WebcastEvent.SHARE, (d) => broadcast({ type: 'share', user: d.user?.nickname || d.user?.uniqueId }));
  conn.on(WebcastEvent.LIKE, (d) => broadcast({ type: 'like', user: d.user?.nickname || d.user?.uniqueId, count: d.likeCount || 1 }));
  conn.on(WebcastEvent.MEMBER, (d) => broadcast({ type: 'member', user: d.user?.nickname || d.user?.uniqueId }));
  conn.on(WebcastEvent.ROOM_USER, (d) => broadcast({ type: 'roomUser', viewers: d.viewerCount || 0 }));
  conn.on(WebcastEvent.DISCONNECT, () => { console.log('Mất kết nối live, thử lại sau 10 giây'); setTimeout(start, 10000); });
}
start();
console.log('Cầu nối Chùa Sen Vàng đang chạy ở cổng ' + PORT + ' cho live @' + LIVE_USERNAME);
