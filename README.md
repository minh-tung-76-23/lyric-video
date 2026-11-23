# lyric-page

Trang lyric kiểu "quay đêm" cho bài *Em Không Được Phép Buồn Rầu – kis* (bản ngắn 43 giây).
Mở trang là một lá thư, bấm vào thư thì thư mở ra và nhạc phát. Lời hiện từng từ theo nhạc,
nền đổi ảnh theo từng câu, xen vài đoạn hoạt hình (xe máy chở nhau, bốn mùa, mưa bão cầm ô).
Chỉ cần HTML/CSS/JS, không cần cài gì, chạy thẳng trên GitHub Pages.

## Mục lục

1. [Cấu trúc thư mục](#1-cấu-trúc-thư-mục)
2. [Chạy thử trên máy](#2-chạy-thử-trên-máy)
3. [Thêm ảnh nền theo từng câu](#3-thêm-ảnh-nền-theo-từng-câu)
4. [Thay mặt nhân vật trong hoạt hình](#4-thay-mặt-nhân-vật-trong-hoạt-hình)
5. [Đổi giờ, thêm hoặc bớt ảnh](#5-đổi-giờ-thêm-hoặc-bớt-ảnh)
6. [Các tuỳ chỉnh khác](#6-các-tuỳ-chỉnh-khác)
7. [Đưa lên GitHub Pages](#7-đưa-lên-github-pages)
8. [Gặp lỗi?](#8-gặp-lỗi)

---

## 1. Cấu trúc thư mục

```
lyric-page/
├── index.html       trang chính (người xem mở trang này)
├── editor.html      công cụ sửa lời, canh giờ, xem trước
├── song.js          ★ "dữ liệu" của trang: lời, giờ, danh sách ảnh, khung hình, ảnh mặt
├── app.js           code chạy trang (không cần sửa)
├── scene.js         nền + hoạt hình vẽ bằng code (không cần sửa)
├── style.css        giao diện (không cần sửa)
├── music/
│   └── song.mp3     nhạc
├── clips/           ★ ảnh nền theo từng câu (bạn thêm vào đây)
└── faces/           ★ ảnh mặt cho nhân vật hoạt hình (bạn thêm vào đây)
```

Bạn thường chỉ đụng tới 3 chỗ có dấu ★: thư mục `clips/`, thư mục `faces/` và file `song.js`.

> GitHub Pages không có database. Mọi thứ người xem thấy đều lấy từ các file trong repo,
> nên muốn sửa gì thì sửa file rồi push lên GitHub.

---

## 2. Chạy thử trên máy

Không mở bằng cách bấm đúp vào file (`file://...`), vì như vậy nhạc và ảnh có thể không tải được.

- **VS Code**: cài extension **Live Server**, chuột phải vào `index.html` rồi chọn **Open with Live Server**.
- **Hoặc dùng terminal**: chạy `python3 -m http.server` trong thư mục này, rồi mở http://localhost:8000

Mẹo: thêm `?t=số-giây` vào link để nhảy thẳng tới một khoảnh khắc mà không cần nghe từ đầu.
Ví dụ `index.html?t=27` là đoạn bốn mùa, `index.html?t=41` là đoạn mưa cầm ô.

---

## 3. Thêm ảnh nền theo từng câu

### Cách làm (3 bước)

1. **Chuẩn bị ảnh.** Nên dùng ảnh ngang, khoảng 1280px chiều ngang, dưới 500KB mỗi ảnh để trang tải nhanh.
   Dùng ảnh dọc cũng được, trang tự cắt cho vừa khung.
2. **Đặt tên đúng** theo bảng bên dưới rồi **bỏ vào thư mục `clips/`**.
   Đuôi `.jpg`, `.jpeg`, `.png`, `.webp` đều được, ví dụ `03-buon-rau.png` vẫn nhận.
3. **Tải lại trang** (Ctrl+F5). Xong, không cần sửa code.

Ảnh nào chưa có thì chỗ đó tự dùng nền đêm vẽ sẵn, nên bạn có thể thêm dần từng ảnh.
Ảnh được làm tối bớt cho chữ dễ đọc và phóng to chậm cho có chuyển động.

### Danh sách ảnh

| # | Tên file (trong `clips/`) | Câu hát | Hiện lúc (giây) |
|---|---|---|---|
| 1 | `01-em.jpg` | **EM** (chữ chớp đầu bài) | 0 |
| 2 | `02-khong-duoc-phep.jpg` | không được phép *(ảnh nền, giữ lâu hơn)* | 0.75 |
| 3 | `03-buon-rau.jpg` | buồn rầu | 1.75 |
| 4 | `04-boi-vi-anh.jpg` | bởi vì anh | 2.35 |
| 5 | `05-se-mang-di-het.jpg` | sẽ mang đi hết *(ảnh nền)* | 3.15 |
| 6 | `06-muon-sau.jpg` | muộn sầu | 4.35 |
| – | 🎬 hoạt hình `timelapse` | một ngày hai mươi tư tiếng trôi mau | 5.15 |
| 7 | `07-dung-ban-tam.jpg` | đừng bận tâm đến những nỗi đau | 7.75 |
| 8 | `08-cuoi-len-di.jpg` | \*cười lên đi | 9.95 |
| 8b | `08b-em-2.jpg` | **EM** (chữ chớp lần 2, trước đoạn 2) | 10.95 |
| 9 | `09-khong-duoc-phep-2.jpg` | không được phép *(ảnh nền)* | 11.55 |
| 10 | `10-lanh-lung.jpg` | lạnh lùng | 12.55 |
| 11 | `11-ben-canh-anh.jpg` | bên cạnh anh | 13.15 |
| 12 | `12-da-quen-giay-phut.jpg` | đã quên giây phút *(ảnh nền)* | 13.95 |
| 13 | `13-then-thung.jpg` | thẹn thùng | 15.15 |
| 14 | `14-em-nhin-anh.jpg` | em nhìn anh bằng đôi mắt | 15.95 |
| 15 | `15-long-lanh.jpg` | long lanh | 17.95 |
| 16 | `16-dem-ve-tuong-tu.jpg` | đêm về mang tương tư vây quanh | 18.75 |
| 17 | `17-anh-say-mat-moi.jpg` | anh say mắt môi | 20.95 |
| 18 | `18-luc-em-cuoi.jpg` | lúc em cười | 22.55 |
| 19 | `19-phai-doi.jpg` | phải đợi bấy nhiêu *(ảnh nền)* | 23.55 |
| 20 | `20-mot-phut-ben-nguoi.jpg` | lấy một phút bên người | 24.95 |
| – | 🎬 hoạt hình `seasons` | dù rạng đông sang, xuân tan, hạ đơn lá thu vàng | 26.35 |
| 21 | `21-thi-anh-van-yeu.jpg` | thì anh vẫn yêu | 31.75 |
| 22 | `22-mai-mot-nguoi.jpg` | mai một người | 33.55 |
| – | 🎬 hoạt hình `timelapse` | ngày đêm sớm khuya | 34.35 |
| 23 | `23-tron-kiep.jpg` | vẫn trọn kiếp không rời *(ảnh nền)* | 35.75 |
| 24 | `24-dung-lo-lang.jpg` | đừng lo lắng anh mãi cạnh bên | 37.55 |
| – | 🎬 hoạt hình `storm` | dù cho lắm bão giông kéo đến | 40.35 |
| 25 | `25-em-oi.jpg` | **Em ơi!** (kết bài) | 42.95 |

**Ảnh PNG nền trong suốt** (chỉ có nhân vật, không có nền) sẽ tự **đè lên nền động** của web,
nền phía sau vẫn chạy. Không cần khai báo gì thêm, trang tự nhận ra ảnh trong suốt.

Mỗi ảnh hiện từ giây của nó tới khi ảnh kế tiếp bắt đầu. Ảnh có ghi *(ảnh nền)* là ảnh đứng lâu hơn, làm nền cho cả cụm chữ.

Có cả clip `.mp4` thay cho ảnh: ghi `clips/ten-clip.mp4` vào danh sách giống như ảnh (xem mục 5).

---

## 4. Thay mặt nhân vật trong hoạt hình

Ba đoạn hoạt hình có hai nhân vật **anh** và **em**:

| Đoạn | anh | em |
|---|---|---|
| `timelapse` (một ngày 24 tiếng, ngày đêm sớm khuya) | lái xe máy | ngồi sau ôm eo |
| `seasons` (bốn mùa) | cầm bó hoa trên đỉnh đồi | đứng dưới gốc cây |
| `storm` (mưa bão) | áo mưa vàng, cầm ô che cho em | áo mưa hồng, nắm tay anh |

**Cách thay:**

1. Chuẩn bị 2 ảnh **cắt sát mặt, hình vuông** (khoảng 300×300 px), mặt nằm giữa ảnh.
   Trang lấy phần giữa ảnh rồi cắt tròn làm mặt.
2. Đặt tên `anh.jpg` và `em.jpg`, bỏ vào thư mục `faces/` (đuôi `.png` hay `.webp` cũng được).
3. Tải lại trang.

Chưa có ảnh thì nhân vật dùng mặt hoạt hình. Muốn đổi tên hoặc đường dẫn ảnh mặt, sửa dòng `"faces"` trong `song.js`:

```js
"faces": {"anh": "faces/anh.jpg", "em": "faces/em.jpg"},
```

---

## 5. Đổi giờ, thêm hoặc bớt ảnh

Danh sách ảnh nằm ở phần `"clips"` trong `song.js`. Mỗi dòng là một ảnh hoặc một đoạn hoạt hình:

```js
"clips": [
  {"src": "clips/01-em.jpg", "at": 0},          // ảnh: đường dẫn + giây bắt đầu
  {"src": "clips/02-khong-duoc-phep.jpg", "at": 0.75},
  {"scene": "timelapse", "at": 5.15},           // đoạn hoạt hình, không cần file
  ...
]
```

- **Đổi lúc hiện ảnh:** sửa số `"at"` (đơn vị giây).
  Muốn biết một chữ được hát lúc mấy giây: mở `editor.html`, danh sách bên dưới ghi giờ của từng câu.
- **Thêm ảnh:** thêm một dòng `{"src": "clips/ten-anh.jpg", "at": giây},`. Thứ tự dòng không quan trọng, trang tự sắp theo giây.
- **Bớt ảnh:** xoá dòng đó, ảnh đứng trước sẽ hiện lâu hơn.
- **Không muốn tự canh giờ:** ghi chỉ tên file, trang tự chia đều cả bài:
  `"clips": ["clips/a.jpg", "clips/b.jpg", "clips/c.jpg"]`
- **Bỏ hết ảnh, quay về nền đêm như video gốc:** `"clips": []`

Lưu ý khi sửa `song.js`: giữ đúng dấu phẩy giữa các dòng và dấu ngoặc kép `"`.
Dòng cuối trong danh sách không có dấu phẩy. Sai cú pháp thì trang sẽ trắng.

**Các đoạn hoạt hình dùng được** (ghi vào `"scene"`):

| Tên | Nội dung |
|---|---|
| `timelapse` | ngày đêm quay vòng, phố lên đèn, đôi mình chở nhau trên xe máy |
| `seasons` | bình minh, xuân hoa rơi, hạ có đom đóm, thu lá vàng; anh cầm hoa, em dưới cây |
| `storm` | mưa xiên, sấm chớp, anh cầm ô che cho em |
| `snowforest` `dusk` `sodium` `dark` `suburb` `park` `ground` `trees` | các cảnh đường đêm như video gốc |

Đoạn hoạt hình tự giãn theo độ dài của nó (tới khi ảnh kế tiếp bắt đầu).

**Sửa bằng editor thay vì sửa file:** mở `editor.html`, ô số 3 ghi mỗi dòng một ảnh dạng
`clips/01-em.jpg 0` hoặc `scene:storm 40.35`. Sửa xong bấm **Tải song.js**, rồi chép file vừa tải đè lên `song.js` trong thư mục project.

---

## 6. Các tuỳ chỉnh khác

| Muốn đổi | Sửa ở đâu |
|---|---|
| Khung hình 4:3 / 16:9 / 9:16 / full màn hình | `song.js` dòng `"aspect": "4:3"`, hoặc thêm `?ratio=16:9` vào link để thử |
| Lời nhắn trong lá thư | `index.html`, tìm `l-line` và `l-sign` |
| Nhạc | thay file `music/song.mp3` (giữ đúng tên) |
| Nhạc lệch so với lời | `editor.html`, ô **Lệch giờ** (đổi xong nhớ **Tải song.js**) |
| Lời bài hát, kiểu chữ, canh giờ từng từ | `editor.html`, bấm "Cách viết kiểu chữ" để xem cú pháp |
| Màu áo, tóc của nhân vật | `scene.js`, phần `LOOK` ở đầu file |

**Canh lại giờ cho bài khác:** mở `editor.html`, dán lời, chọn file nhạc, bấm **Gõ lại từ đầu**, rồi nhấn `Space` đúng lúc mỗi từ được hát.
`Enter` = tắt câu lúc nhạc dạo, `Backspace` = lùi lại khi gõ sai, `Esc` = dừng.
Xong bấm **Tải song.js** và chép đè vào thư mục.

---

## 7. Đưa lên GitHub Pages

### Lần đầu

```bash
git init
git add .
git commit -m "lyric page"
git branch -M main
git remote add origin https://github.com/<tên-github>/<tên-repo>.git
git push -u origin main
```

Sau đó vào GitHub, mở repo, chọn **Settings → Pages**. Ở Source chọn *Deploy from a branch*, Branch chọn `main` và `/(root)`, rồi bấm **Save**.
Khoảng 1–2 phút sau trang chạy ở `https://<tên-github>.github.io/<tên-repo>/`.

`index.html` phải nằm ngay thư mục gốc của repo, không nằm trong thư mục con.

### Mỗi lần thêm ảnh hoặc sửa gì đó

```bash
git add .
git commit -m "them anh"
git push
```

Đợi 1–2 phút rồi tải lại trang (Ctrl+F5). Xem lại các lần đã sửa trong tab **Commits** của repo trên GitHub.

---

## 8. Gặp lỗi?

| Hiện tượng | Cách xử lý |
|---|---|
| Ảnh không hiện, vẫn là nền đêm | Tên file sai. GitHub **phân biệt chữ hoa/thường**: `01-Em.JPG` khác `01-em.jpg`. Đặt tên đúng y như bảng ở mục 3. |
| Trên máy thấy ảnh, lên GitHub thì không | Quên `git add` ảnh, hoặc tên file có chữ hoa. Kiểm tra trên GitHub xem ảnh đã có trong thư mục `clips/` chưa. |
| Trang hiện nội dung README thay vì lá thư | `index.html` chưa được push, hoặc đang nằm trong thư mục con. |
| Trang trắng hoàn toàn | `song.js` bị sai cú pháp (thiếu dấu phẩy hoặc ngoặc). Bấm F12, tab Console sẽ báo dòng lỗi. |
| Không có tiếng | Thiếu `music/song.mp3`, hoặc tên file khác. Góc dưới trang sẽ báo "chua co music/song.mp3". |
| Sửa rồi mà trang không đổi | Trình duyệt còn giữ bản cũ, bấm **Ctrl+F5**. Trên GitHub thì đợi 1–2 phút sau khi push. |
| Ảnh tải chậm | Ảnh quá nặng. Thu nhỏ còn khoảng 1280px ngang và dưới 500KB, ví dụ bằng https://squoosh.app |

Chỉ đưa lên nhạc, ảnh mà bạn có quyền dùng, vì repo GitHub Pages công khai thì ai cũng tải được các file.
