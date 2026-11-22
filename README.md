# lyric-page

Trang lyric kiểu "quay đêm" – làm theo video *Em Không Được Phép Buồn Rầu – kis* (bản ngắn 43s, khung 4:3).
Chữ nhỏ không dấu hiện dồn từng từ theo nhạc, câu đỏ / hồng / xanh, chữ ký to phía sau,
chữ IN HOA chớp ("EM", "ANH"), nền đường đêm cắt cảnh thẳng, hạt nhiễu + vạch xước phim.
Chỉ cần HTML/CSS/JS, không cần build – chạy thẳng trên GitHub Pages.

```
index.html      trang chính (deploy cái này)
editor.html     công cụ canh giờ: dán lời, gõ Space theo nhạc, xem trước, tải song.js
song.js         lời + mốc thời gian + danh sách cảnh/clip (đã canh sẵn theo video)
scene.js        nền đường đêm vẽ bằng canvas (dùng khi chưa có clip)
music/song.mp3  nhạc  ← TỰ THÊM
clips/          clip .mp4 / ảnh nền (không bắt buộc)
```

## Nhạc và clip

- **Nhạc**: chép file bài hát (bản ngắn khớp video, ~43s) thành `music/song.mp3`.
  Chưa có nhạc thì trang vẫn chạy, lời vẫn hiện đúng giờ, chỉ là không có tiếng.
  Nhạc lệch vài trăm ms so với lời thì mở `editor.html` chỉnh ô **Lệch giờ**.
- **Nền**: mặc định là 8 cảnh đường đêm vẽ bằng canvas, cắt đúng các mốc trong video
  (0s rừng tuyết · 6.2s chạng vạng · 10.9s đèn cam · 18.1s phố tối · 25.3s khu nhà · 32.5s công viên · 38.9s mặt đất · 40.5s tán cây).
  Muốn dùng ảnh / clip thật thì xem mục dưới – có ảnh hoặc clip thì nền canvas tự tắt.

## Thêm ảnh làm nền

Thêm bao nhiêu ảnh cũng được (`.jpg` `.png` `.webp`, hoặc clip `.mp4`). Nên giữ mỗi ảnh dưới ~500KB, ngang ~1280px cho trang tải nhanh.

1. Bỏ ảnh vào thư mục `clips/`, ví dụ `clips/1.jpg`, `clips/2.jpg` ...
2. Mở `song.js`, sửa dòng `"clips"`:

   ```js
   // không ghi giờ -> tự chia đều cả bài (đúng 8 ảnh thì khớp 8 mốc cắt cảnh của video)
   "clips": ["clips/1.jpg", "clips/2.jpg", "clips/3.jpg"]

   // hoặc tự chọn giây bắt đầu của từng ảnh
   "clips": [
     { "src": "clips/1.jpg", "at": 0 },
     { "src": "clips/2.jpg", "at": 6.2 },
     { "src": "clips/3.jpg", "at": 10.93 }
   ]
   ```

   Hoặc ghi trong `editor.html` ô 3, mỗi dòng 1 ảnh: `clips/1.jpg` hoặc `clips/1.jpg 6.2`.

Ảnh tự tối bớt cho chữ dễ đọc và phóng to chậm cho có chuyển động.

Chỉ đưa lên nhạc/clip mà bạn có quyền dùng (repo GitHub Pages công khai ai cũng tải được).

## Sửa lời / làm bài mới

1. Mở `editor.html` bằng Live Server (hoặc `python3 -m http.server`, rồi vào http://localhost:8000/editor.html).
2. Sửa lời ở ô 1 – bấm "Cách viết kiểu chữ" để xem cú pháp (`[red]`, `[bluebig one]`, `{big-red}`, `{flash-pink}`, `[hl]` ...).
3. Chọn file nhạc, bấm **Gõ lại từ đầu**, nhấn `Space` đúng lúc mỗi từ được hát
   (`Enter` = tắt câu lúc nhạc dạo, `Backspace` = gõ sai lùi lại, `Esc` = dừng).
   Sai đoạn nào thì nhập số câu rồi **Gõ lại từ câu này**.
4. Bấm **Tải song.js**, chép đè vào thư mục này.
5. Mở `index.html` kiểm tra. Xem nhanh 1 khoảnh khắc: `index.html?t=12`.

## Deploy GitHub Pages

```bash
git init && git add . && git commit -m "lyric page"
git branch -M main
git remote add origin https://github.com/<user>/lyric-page.git
git push -u origin main
```

GitHub → repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch `main` / `(root)` → Save.
Khoảng 1 phút sau trang chạy ở `https://<user>.github.io/lyric-page/`.

Lưu ý:
- Tên file phân biệt hoa/thường trên GitHub Pages: `music/song.mp3` phải viết thường đúng như vậy.
- Mỗi file phải dưới 100MB.
- File `.nojekyll` để GitHub phục vụ nguyên file, không chạy Jekyll.
