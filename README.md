# sb-kit

CLI để cài các skill trong thư mục `.agents` vào bất kỳ project nào.

## Cài đặt

Chạy trong project cần sử dụng skill:

```bash
npx sb-kit install
```

Nếu project đã có `.agents`, lệnh sẽ merge các skill còn thiếu và giữ nguyên skill đã tồn tại.

## Sử dụng

```bash
npx sb-kit --help
```

## Skills

### `sk-excute`

Quy trình triển khai task có kiểm soát: tạo spec, lập implementation plan, chờ approval rồi mới chỉnh sửa code.

### `sk-visualizer`

Chuyển prompt, spec, plan hoặc nội dung hội thoại thành một file HTML visualization dễ đọc.

## License

ISC
